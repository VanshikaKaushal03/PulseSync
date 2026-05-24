# backend/migrate_db.py

"""
Database Migration Script
- Adds price, category, stock to inventory.products
- Converts legacy orders to standardized items array schema
"""

import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from datetime import datetime

# Connection parameters
MONGO_URI = "mongodb://localhost:27018/?replicaSet=rs0&directConnection=true"

# Product catalog with realistic prices
PRODUCT_CATALOG = [
    {
        "name": "MacBook Pro 16\"",
        "sku": "APPLE-MBP-16",
        "price": 2499.00,
        "category": "Electronics",
        "stock": 50,
        "description": "Powerful laptop for professionals",
        "image_url": "/images/macbook.jpg"
    },
    {
        "name": "Anker USB-C Multi-Port Hub",
        "sku": "ANK-USB-001",
        "price": 79.99,
        "category": "Accessories",
        "stock": 200,
        "description": "7-in-1 USB-C adapter with HDMI, USB 3.0, SD card reader",
        "image_url": "/images/anker-hub.jpg"
    },
    {
        "name": "Sony WH-1000XM5 Headphones",
        "sku": "SONY-WH1000XM5",
        "price": 399.99,
        "category": "Audio",
        "stock": 75,
        "description": "Industry-leading noise canceling headphones",
        "image_url": "/images/sony-headphones.jpg"
    },
    {
        "name": "Logitech MX Master 3S Mouse",
        "sku": "LOGI-MXMASTER3S",
        "price": 99.99,
        "category": "Accessories",
        "stock": 150,
        "description": "Advanced wireless mouse for power users",
        "image_url": "/images/logitech-mouse.jpg"
    },
    {
        "name": "Samsung 970 EVO Plus 1TB SSD",
        "sku": "SAMSUNG-970EVO-1TB",
        "price": 129.99,
        "category": "Storage",
        "stock": 120,
        "description": "High-performance NVMe M.2 SSD",
        "image_url": "/images/samsung-ssd.jpg"
    },
    {
        "name": "Dell UltraSharp 27\" Monitor",
        "sku": "DELL-U2723DE",
        "price": 549.99,
        "category": "Displays",
        "stock": 40,
        "description": "27-inch QHD IPS monitor with USB-C hub",
        "image_url": "/images/dell-monitor.jpg"
    },
    {
        "name": "Keychron K8 Mechanical Keyboard",
        "sku": "KEYCHRON-K8",
        "price": 89.99,
        "category": "Accessories",
        "stock": 180,
        "description": "Wireless mechanical keyboard with hot-swappable switches",
        "image_url": "/images/keychron-k8.jpg"
    },
    {
        "name": "Apple AirPods Pro (2nd Gen)",
        "sku": "APPLE-AIRPODS-PRO2",
        "price": 249.00,
        "category": "Audio",
        "stock": 100,
        "description": "Active noise cancellation and spatial audio",
        "image_url": "/images/airpods-pro.jpg"
    },
    {
        "name": "Anker PowerCore 20000mAh",
        "sku": "ANK-POWER-20K",
        "price": 49.99,
        "category": "Accessories",
        "stock": 250,
        "description": "High-capacity portable charger",
        "image_url": "/images/anker-battery.jpg"
    },
    {
        "name": "Webcam Logitech C920 HD Pro",
        "sku": "LOGI-C920",
        "price": 79.99,
        "category": "Accessories",
        "stock": 90,
        "description": "Full HD 1080p webcam with stereo audio",
        "image_url": "/images/logitech-webcam.jpg"
    }
]


async def migrate_inventory_products():
    """Add price, category, stock to inventory.products"""
    print("\n>>> Starting inventory.products migration...")
    
    client = AsyncIOMotorClient(MONGO_URI)
    db = client.inventory
    
    existing_count = await db.products.count_documents({})
    print(f"Current products count in DB: {existing_count}")
    
    for product_data in PRODUCT_CATALOG:
        # Find by name, SKU, or look up by comparing lowercase name substrings
        existing = await db.products.find_one({
            "$or": [
                {"product_name": product_data["name"]},
                {"name": product_data["name"]},
                {"sku": product_data["sku"]}
            ]
        })
        
        if not existing:
            cursor = db.products.find()
            async for doc in cursor:
                doc_name = doc.get("product_name", "")
                if product_data["name"].lower() in doc_name.lower() or doc_name.lower() in product_data["name"].lower():
                    existing = doc
                    break
        
        if existing:
            update_fields = {
                "price": product_data["price"],
                "category": product_data["category"],
                "stock": product_data["stock"],
                "description": product_data.get("description", ""),
                "image_url": product_data.get("image_url", ""),
                "updated_at": datetime.utcnow()
            }
            if "product_name" in existing:
                update_fields["product_name"] = product_data["name"]
            else:
                update_fields["name"] = product_data["name"]
                
            await db.products.update_one(
                {"_id": existing["_id"]},
                {"$set": update_fields}
            )
            print(f"[OK] Updated: {product_data['name']} (ID: {existing['_id']}) - ${product_data['price']}")
        else:
            new_doc = product_data.copy()
            new_doc["product_name"] = new_doc.pop("name")
            new_doc["created_at"] = datetime.utcnow()
            new_doc["updated_at"] = datetime.utcnow()
            await db.products.insert_one(new_doc)
            print(f"[NEW] Created: {product_data['name']} - ${product_data['price']}")
    
    print(f"[OK] Inventory migration complete! {len(PRODUCT_CATALOG)} products processed.\n")
    client.close()


async def migrate_legacy_orders():
    """Convert legacy flat orders to standardized items array schema"""
    print("\n>>> Starting legacy orders migration...")
    
    client = AsyncIOMotorClient(MONGO_URI)
    db = client.fastapi_cdc
    
    legacy_orders = await db.orders.find({
        "$or": [
            {"product_name": {"$exists": True}, "items": {"$exists": False}},
            {"price": {"$exists": True}, "items": {"$exists": False}}
        ]
    }).to_list(length=None)
    
    if not legacy_orders:
        print("[OK] No legacy orders found. Database already clean!\n")
        client.close()
        return
    
    print(f"Found {len(legacy_orders)} legacy orders to migrate...")
    
    for order in legacy_orders:
        qty = order.get("quantity", 1)
        price = order.get("price", 0.0)
        if price == 0.0 and "total_amount" in order:
            price = order["total_amount"]
            
        migrated_order = {
            "items": [
                {
                    "product_id": order.get("product_id", ""),
                    "product_name": order.get("product_name", "Unknown Product"),
                    "sku": order.get("sku", ""),
                    "quantity": qty,
                    "unit_price": price,
                    "subtotal": price * qty
                }
            ],
            "total_amount": order.get("total_amount", price * qty),
            "updated_at": datetime.utcnow()
        }
        
        unset_fields = {
            "product_name": "",
            "price": "",
            "quantity": ""
        }
        
        await db.orders.update_one(
            {"_id": order["_id"]},
            {
                "$set": migrated_order,
                "$unset": unset_fields
            }
        )
        
        print(f"[OK] Migrated order {order['_id']}: {order.get('product_name')}")
    
    print(f"[OK] Orders migration complete! {len(legacy_orders)} orders standardized.\n")
    client.close()


async def verify_migration():
    """Verify migration success"""
    print("\n>>> Verifying migration...\n")
    
    client = AsyncIOMotorClient(MONGO_URI)
    
    inventory_db = client.inventory
    products = await inventory_db.products.find().to_list(length=None)
    
    print(f"Inventory Products count: {len(products)}")
    products_with_price = sum(1 for p in products if "price" in p)
    print(f"Products with price: {products_with_price}/{len(products)}")
    
    orders_db = client.fastapi_cdc
    orders = await orders_db.orders.find().to_list(length=None)
    
    print(f"Orders count: {len(orders)}")
    orders_with_items = sum(1 for o in orders if "items" in o)
    legacy_orders = sum(1 for o in orders if ("product_name" in o or "price" in o) and "items" not in o)
    
    print(f"Standardized orders (items array): {orders_with_items}/{len(orders)}")
    print(f"Legacy orders remaining: {legacy_orders}")
    
    if legacy_orders > 0:
        print("\n[FAIL] Migration incomplete! Some orders still in old format.")
    else:
        print("\n[SUCCESS] Migration successful! All data standardized.")
    
    client.close()


async def main():
    print("=" * 60)
    print("DATABASE MIGRATION SCRIPT")
    print("=" * 60)
    
    await migrate_inventory_products()
    await migrate_legacy_orders()
    await verify_migration()
    
    print("\n" + "=" * 60)
    print("MIGRATION COMPLETE")
    print("=" * 60)


if __name__ == "__main__":
    asyncio.run(main())

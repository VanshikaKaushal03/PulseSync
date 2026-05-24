"""
Seed inventory products into the MongoDB inventory database.
Run inside Docker: docker exec pulsesync_api python /app/backend/seed_inventory.py
"""
import asyncio
import os
from motor.motor_asyncio import AsyncIOMotorClient


async def seed_inventory():
    MONGO_URI = os.getenv("MONGO_URI", "mongodb://mongo1:27018/?replicaSet=rs0&directConnection=true")
    client = AsyncIOMotorClient(MONGO_URI)
    db = client["inventory"]

    existing = await db.products.count_documents({})
    if existing > 0:
        print(f"Inventory already has {existing} products — clearing and reseeding...")
        await db.products.delete_many({})

    products = [
        {"sku": "APPLE-MBP-16",  "product_name": "MacBook Pro 16-inch",    "name": "MacBook Pro 16-inch",    "price": 249900, "category": "Electronics",   "stock": 50},
        {"sku": "LOGI-MX-MOUSE", "product_name": "Logitech MX Master 3",   "name": "Logitech MX Master 3",   "price": 9999,   "category": "Accessories",   "stock": 200},
        {"sku": "SONY-WH1000XM5","product_name": "Sony WH-1000XM5",        "name": "Sony WH-1000XM5",        "price": 34900,  "category": "Audio",         "stock": 150},
        {"sku": "SAMSUNG-T7-1TB","product_name": "Samsung T7 SSD 1TB",     "name": "Samsung T7 SSD 1TB",     "price": 12900,  "category": "Storage",       "stock": 300},
        {"sku": "APPLE-IPAD-PRO","product_name": "iPad Pro 12.9-inch",     "name": "iPad Pro 12.9-inch",     "price": 109900, "category": "Electronics",   "stock": 75},
        {"sku": "DELL-U2722D",   "product_name": "Dell UltraSharp 27 4K",  "name": "Dell UltraSharp 27 4K",  "price": 64900,  "category": "Monitors",      "stock": 100},
        {"sku": "ANKER-65W-GAN", "product_name": "Anker 65W GaN Charger",  "name": "Anker 65W GaN Charger",  "price": 4599,   "category": "Accessories",   "stock": 500},
        {"sku": "KEYCHRON-K2",   "product_name": "Keychron K2 Keyboard",   "name": "Keychron K2 Keyboard",   "price": 8900,   "category": "Input Devices", "stock": 180},
        {"sku": "RODE-NT-USB",   "product_name": "Rode NT-USB Microphone", "name": "Rode NT-USB Microphone", "price": 16900,  "category": "Audio",         "stock": 90},
        {"sku": "ELGATO-4K-CAP", "product_name": "Elgato 4K Capture Card", "name": "Elgato 4K Capture Card", "price": 19900,  "category": "Streaming",     "stock": 60},
    ]

    await db.products.insert_many(products)
    count = await db.products.count_documents({})
    print(f"Inventory seeded successfully! {count} products ready.")
    client.close()


if __name__ == "__main__":
    asyncio.run(seed_inventory())

# backend/seed_demo.py

import asyncio
import os
from datetime import datetime, timedelta
from motor.motor_asyncio import AsyncIOMotorClient

async def seed():
    print("Connecting to MongoDB on port 27018...")
    MONGO_URI = os.getenv("MONGO_URI", "mongodb://127.0.0.1:27018/?replicaSet=rs0&directConnection=true")
    client = AsyncIOMotorClient(MONGO_URI)
    db = client[os.getenv("DB_NAME", "push_architecture_db")]
    coll = db["orders"]

    print("Clearing original demo orders only (preserving custom/simulated data)...")
    await coll.delete_many({"_id": {"$in": ["123", "124", "125", "201", "202", "203", "126", "127", "128", "129", "130", "131", "132", "133"]}})

    print("Inserting strict, standardized Demo Orders with items arrays...")
    
    now = datetime.utcnow()

    # 1. Alice's Laptop (Pending)
    await coll.insert_one({
        "_id": "123",
        "customer_name": "Alice",
        "customer_email": "alice@example.com",
        "items": [
            {
                "product_id": "sku_5000",
                "product_name": "MacBook Pro 16\"",
                "sku": "APPLE-MBP-16",
                "quantity": 1,
                "unit_price": 2499.00,
                "subtotal": 2499.00
            }
        ],
        "total_amount": 2499.00,
        "status": "pending",
        "simulated": False,
        "priority": "high",
        "category": "Electronics",
        "timestamp": now - timedelta(hours=2),
        "updated_at": now - timedelta(hours=2)
    })

    # 2. Alice's Mouse (Pending)
    await coll.insert_one({
        "_id": "124",
        "customer_name": "Alice",
        "customer_email": "alice@example.com",
        "items": [
            {
                "product_id": "sku_5008",
                "product_name": "Logitech MX Master 3S Mouse",
                "sku": "LOGI-MXMASTER3S",
                "quantity": 1,
                "unit_price": 99.99,
                "subtotal": 99.99
            }
        ],
        "total_amount": 99.99,
        "status": "pending",
        "simulated": False,
        "priority": "low",
        "category": "Accessories",
        "timestamp": now - timedelta(hours=1.5),
        "updated_at": now - timedelta(hours=1.5)
    })

    # 3. Bob's Keyboard (Processing)
    await coll.insert_one({
        "_id": "125",
        "customer_name": "Bob",
        "customer_email": "bob@example.com",
        "items": [
            {
                "product_id": "sku_5003",
                "product_name": "Keychron K8 Mechanical Keyboard",
                "sku": "KEYCHRON-K8",
                "quantity": 1,
                "unit_price": 89.99,
                "subtotal": 89.99
            }
        ],
        "total_amount": 89.99,
        "status": "processing",
        "simulated": False,
        "timestamp": now - timedelta(hours=3),
        "updated_at": now - timedelta(hours=1),
        "priority": "high",
        "category": "Accessories",
        "shipping_address": "123 Main St, New York, NY",
        "payment_method": "Visa (4242)",
        "estimated_delivery": now + timedelta(days=3),
        "status_history": [
            {"status": "pending", "timestamp": (now - timedelta(hours=3)).isoformat(), "operation": "insert"},
            {"status": "processing", "timestamp": (now - timedelta(hours=1)).isoformat(), "operation": "update"}
        ]
    })

    # 3b. Bob's Headphones (Shipped)
    await coll.insert_one({
        "_id": "201",
        "customer_name": "Bob",
        "customer_email": "bob@example.com",
        "items": [
            {
                "product_id": "sku_5002",
                "product_name": "Sony WH-1000XM5 Headphones",
                "sku": "SONY-WH1000XM5",
                "quantity": 1,
                "unit_price": 399.99,
                "subtotal": 399.99
            }
        ],
        "total_amount": 399.99,
        "status": "shipped",
        "simulated": False,
        "timestamp": now - timedelta(days=1),
        "updated_at": now,
        "priority": "medium",
        "category": "Audio",
        "shipping_address": "123 Main St, New York, NY",
        "payment_method": "Visa (4242)",
        "estimated_delivery": now + timedelta(days=1),
        "tracking_number": "TRACK-HEAD-89324",
        "carrier": "FedEx",
        "delivery_progress": 65.0,
        "last_checkpoint": "In Transit - Out for delivery in New York Hub",
        "status_history": [
            {"status": "pending", "timestamp": (now - timedelta(days=1)).isoformat(), "operation": "insert"},
            {"status": "processing", "timestamp": (now - timedelta(hours=18)).isoformat(), "operation": "update"},
            {"status": "shipped", "timestamp": (now - timedelta(hours=4)).isoformat(), "operation": "update"}
        ]
    })

    # 3c. Bob's Office Chair (Delivered)
    await coll.insert_one({
        "_id": "202",
        "customer_name": "Bob",
        "customer_email": "bob@example.com",
        "items": [
            {
                "product_id": "sku_5004",
                "product_name": "Ergonomic Office Chair",
                "sku": "SKU-ERG-1754",
                "quantity": 1,
                "unit_price": 499.99,
                "subtotal": 499.99
            }
        ],
        "total_amount": 499.99,
        "status": "delivered",
        "simulated": False,
        "timestamp": now - timedelta(days=5),
        "updated_at": now - timedelta(days=3),
        "priority": "low",
        "category": "Furniture",
        "shipping_address": "123 Main St, New York, NY",
        "payment_method": "Visa (4242)",
        "estimated_delivery": now - timedelta(days=3),
        "tracking_number": "TRACK-CHAIR-12093",
        "carrier": "UPS",
        "delivery_progress": 100.0,
        "last_checkpoint": "Delivered to Front Porch - Left at door",
        "status_history": [
            {"status": "pending", "timestamp": (now - timedelta(days=5)).isoformat(), "operation": "insert"},
            {"status": "processing", "timestamp": (now - timedelta(days=4)).isoformat(), "operation": "update"},
            {"status": "shipped", "timestamp": (now - timedelta(days=3, hours=12)).isoformat(), "operation": "update"},
            {"status": "delivered", "timestamp": (now - timedelta(days=3)).isoformat(), "operation": "update"}
        ]
    })

    # 3d. Bob's Charging Hub (Pending)
    await coll.insert_one({
        "_id": "203",
        "customer_name": "Bob",
        "customer_email": "bob@example.com",
        "items": [
            {
                "product_id": "sku_5006",
                "product_name": "Anker USB-C Multi-Port Hub",
                "sku": "ANK-USB-001",
                "quantity": 2,
                "unit_price": 79.99,
                "subtotal": 159.98
            }
        ],
        "total_amount": 159.98,
        "status": "pending",
        "simulated": False,
        "timestamp": now - timedelta(minutes=15),
        "updated_at": now - timedelta(minutes=15),
        "priority": "low",
        "category": "Accessories",
        "shipping_address": "123 Main St, New York, NY",
        "payment_method": "Visa (4242)",
        "estimated_delivery": now + timedelta(days=5),
        "status_history": [
            {"status": "pending", "timestamp": (now - timedelta(minutes=15)).isoformat(), "operation": "insert"}
        ]
    })

    # 4. Charlie's Headphones
    await coll.insert_one({
        "_id": "126",
        "customer_name": "Charlie Miller",
        "customer_email": "charlie@example.com",
        "items": [
            {
                "product_id": "sku_5002",
                "product_name": "Sony WH-1000XM5 Headphones",
                "sku": "SONY-WH1000XM5",
                "quantity": 1,
                "unit_price": 399.99,
                "subtotal": 399.99
            }
        ],
        "total_amount": 399.99,
        "status": "shipped",
        "simulated": False,
        "timestamp": now,
        "updated_at": now
    })

    # 5. Diana's Office Chair
    await coll.insert_one({
        "_id": "127",
        "customer_name": "Diana Prince",
        "customer_email": "diana@example.com",
        "items": [
            {
                "product_id": "sku_5004",
                "product_name": "Ergonomic Office Chair",
                "sku": "SKU-ERG-1754",
                "quantity": 1,
                "unit_price": 499.99,
                "subtotal": 499.99
            }
        ],
        "total_amount": 499.99,
        "status": "processing",
        "simulated": False,
        "timestamp": now,
        "updated_at": now
    })

    # 6. Ethan's SSD
    await coll.insert_one({
        "_id": "128",
        "customer_name": "Ethan Hunt",
        "customer_email": "ethan@example.com",
        "items": [
            {
                "product_id": "sku_5004",
                "product_name": "Samsung 970 EVO Plus 1TB SSD",
                "sku": "SAMSUNG-970EVO-1TB",
                "quantity": 1,
                "unit_price": 129.99,
                "subtotal": 129.99
            }
        ],
        "total_amount": 129.99,
        "status": "delivered",
        "simulated": False,
        "timestamp": now,
        "updated_at": now
    })

    # 7. Fiona's Keyboard
    await coll.insert_one({
        "_id": "129",
        "customer_name": "Fiona Gallagher",
        "customer_email": "fiona@example.com",
        "items": [
            {
                "product_id": "sku_5003",
                "product_name": "Keychron K8 Mechanical Keyboard",
                "sku": "KEYCHRON-K8",
                "quantity": 1,
                "unit_price": 89.99,
                "subtotal": 89.99
            }
        ],
        "total_amount": 89.99,
        "status": "pending",
        "simulated": False,
        "timestamp": now,
        "updated_at": now
    })

    # 8. George's Charging Pad
    await coll.insert_one({
        "_id": "130",
        "customer_name": "George Costanza",
        "customer_email": "george@example.com",
        "items": [
            {
                "product_id": "sku_5007",
                "product_name": "Apple AirPods Pro (2nd Gen)",
                "sku": "APPLE-AIRPODS-PRO2",
                "quantity": 1,
                "unit_price": 249.00,
                "subtotal": 249.00
            }
        ],
        "total_amount": 249.00,
        "status": "delivered",
        "simulated": False,
        "timestamp": now,
        "updated_at": now
    })

    # 9. Hannah's Charging Pad
    await coll.insert_one({
        "_id": "131",
        "customer_name": "Hannah Abbott",
        "customer_email": "hannah@example.com",
        "items": [
            {
                "product_id": "sku_5008",
                "product_name": "Logitech MX Master 3S Mouse",
                "sku": "LOGI-MXMASTER3S",
                "quantity": 1,
                "unit_price": 99.99,
                "subtotal": 99.99
            }
        ],
        "total_amount": 99.99,
        "status": "processing",
        "simulated": False,
        "timestamp": now,
        "updated_at": now
    })

    # 10. Ian's Charging Pad
    await coll.insert_one({
        "_id": "132",
        "customer_name": "Ian Malcolm",
        "customer_email": "ian@example.com",
        "items": [
            {
                "product_id": "sku_5006",
                "product_name": "Anker PowerCore 20000mAh",
                "sku": "ANK-POWER-20K",
                "quantity": 1,
                "unit_price": 49.99,
                "subtotal": 49.99
            }
        ],
        "total_amount": 49.99,
        "status": "shipped",
        "simulated": False,
        "timestamp": now,
        "updated_at": now
    })

    # 11. Julia's Display
    await coll.insert_one({
        "_id": "133",
        "customer_name": "Julia Roberts",
        "customer_email": "julia@example.com",
        "items": [
            {
                "product_id": "sku_5005",
                "product_name": "Dell UltraSharp 27\" Monitor",
                "sku": "DELL-U2723DE",
                "quantity": 1,
                "unit_price": 549.99,
                "subtotal": 549.99
            }
        ],
        "total_amount": 549.99,
        "status": "pending",
        "simulated": False,
        "timestamp": now,
        "updated_at": now
    })

    print("Demo Data Seeded Successfully!")
    
    # -------------------------------------
    # User accounts seeding
    # -------------------------------------
    users_coll = db["users"]
    print("Clearing original demo users only...")
    emails_to_clear = ["alice@example.com", "bob@example.com", "charlie@example.com", "diana@example.com", "ethan@example.com", "fiona@example.com", "george@example.com", "hannah@example.com", "ian@example.com", "julia@example.com", "admin@example.com", "admin1@example.com", "admin2@example.com"]
    await users_coll.delete_many({"email": {"$in": emails_to_clear}})

    from passlib.context import CryptContext
    pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

    users = [
        {
            "email": "alice@example.com",
            "username": "alice",
            "hashed_password": pwd_context.hash("alice123"),
            "role": "customer",
            "customer_name": "Alice"
        },
        {
            "email": "bob@example.com",
            "username": "bob",
            "hashed_password": pwd_context.hash("bob123"),
            "role": "customer",
            "customer_name": "Bob"
        },
        {
            "email": "charlie@example.com",
            "username": "charlie",
            "hashed_password": pwd_context.hash("charlie123"),
            "role": "customer",
            "customer_name": "Charlie Miller"
        },
        {
            "email": "diana@example.com",
            "username": "diana",
            "hashed_password": pwd_context.hash("diana123"),
            "role": "customer",
            "customer_name": "Diana Prince"
        },
        {
            "email": "ethan@example.com",
            "username": "ethan",
            "hashed_password": pwd_context.hash("ethan123"),
            "role": "customer",
            "customer_name": "Ethan Hunt"
        },
        {
            "email": "fiona@example.com",
            "username": "fiona",
            "hashed_password": pwd_context.hash("fiona123"),
            "role": "customer",
            "customer_name": "Fiona Gallagher"
        },
        {
            "email": "george@example.com",
            "username": "george",
            "hashed_password": pwd_context.hash("george123"),
            "role": "customer",
            "customer_name": "George Costanza"
        },
        {
            "email": "hannah@example.com",
            "username": "hannah",
            "hashed_password": pwd_context.hash("hannah123"),
            "role": "customer",
            "customer_name": "Hannah Abbott"
        },
        {
            "email": "ian@example.com",
            "username": "ian",
            "hashed_password": pwd_context.hash("ian123"),
            "role": "customer",
            "customer_name": "Ian Malcolm"
        },
        {
            "email": "julia@example.com",
            "username": "julia",
            "hashed_password": pwd_context.hash("julia123"),
            "role": "customer",
            "customer_name": "Julia Roberts"
        },
        {
            "email": "admin@example.com",
            "username": "admin",
            "hashed_password": pwd_context.hash("admin123"),
            "role": "admin",
            "customer_name": None
        },
        {
            "email": "admin1@example.com",
            "username": "admin1",
            "hashed_password": pwd_context.hash("admin123"),
            "role": "admin",
            "customer_name": None
        },
        {
            "email": "admin2@example.com",
            "username": "admin2",
            "hashed_password": pwd_context.hash("admin123"),
            "role": "admin",
            "customer_name": None
        }
    ]
    await users_coll.insert_many(users)
    print("Users Seeded Successfully!")

    # -------------------------------------
    # Events (Audit History) seeding
    # -------------------------------------
    print("Clearing original demo events only...")
    events_coll = db["events"]
    await events_coll.delete_many({"event_id": {"$in": ["evt_123_init", "evt_124_init", "evt_125_init", "evt_125_update_1"]}})

    demo_events = [
        # Order 123 (Alice's Laptop - currently pending)
        {
            "event_id": "evt_123_init",
            "timestamp": (now - timedelta(hours=2)).isoformat(),
            "operation": "insert",
            "document_id": "123",
            "collection": "orders",
            "full_document": {
                "_id": "123",
                "customer_name": "Alice",
                "customer_email": "alice@example.com",
                "items": [
                    {
                        "product_id": "sku_5000",
                        "product_name": "MacBook Pro 16\"",
                        "sku": "APPLE-MBP-16",
                        "quantity": 1,
                        "unit_price": 2499.00,
                        "subtotal": 2499.00
                    }
                ],
                "total_amount": 2499.00,
                "status": "pending",
                "simulated": False
            }
        },
        # Order 124 (Alice's Mouse - currently pending)
        {
            "event_id": "evt_124_init",
            "timestamp": (now - timedelta(hours=1.5)).isoformat(),
            "operation": "insert",
            "document_id": "124",
            "collection": "orders",
            "full_document": {
                "_id": "124",
                "customer_name": "Alice",
                "customer_email": "alice@example.com",
                "items": [
                    {
                        "product_id": "sku_5008",
                        "product_name": "Logitech MX Master 3S Mouse",
                        "sku": "LOGI-MXMASTER3S",
                        "quantity": 1,
                        "unit_price": 99.99,
                        "subtotal": 99.99
                    }
                ],
                "total_amount": 99.99,
                "status": "pending",
                "simulated": False
            }
        },
        # Order 125 (Bob's Keyboard - currently processing)
        {
            "event_id": "evt_125_init",
            "timestamp": (now - timedelta(hours=3)).isoformat(),
            "operation": "insert",
            "document_id": "125",
            "collection": "orders",
            "full_document": {
                "_id": "125",
                "customer_name": "Bob",
                "customer_email": "bob@example.com",
                "items": [
                    {
                        "product_id": "sku_5003",
                        "product_name": "Keychron K8 Mechanical Keyboard",
                        "sku": "KEYCHRON-K8",
                        "quantity": 1,
                        "unit_price": 89.99,
                        "subtotal": 89.99
                    }
                ],
                "total_amount": 89.99,
                "status": "pending",
                "simulated": False
            }
        },
        {
            "event_id": "evt_125_update_1",
            "timestamp": (now - timedelta(hours=1)).isoformat(),
            "operation": "update",
            "document_id": "125",
            "collection": "orders",
            "updated_fields": {
                "status": "processing"
            },
            "removed_fields": []
        }
    ]
    await events_coll.insert_many(demo_events)
    print("Order History Events Seeded Successfully!")
    client.close()

if __name__ == "__main__":
    asyncio.run(seed())

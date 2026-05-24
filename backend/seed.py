import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import os

MONGO_URI = os.getenv("MONGO_URI", "mongodb://127.0.0.1:27018/?replicaSet=rs0")
DB_NAME = os.getenv("DB_NAME", "push_architecture_db")

seed_data = [
  {
    "customer_name": "Alice Johnson",
    "customer_email": "alice@example.com",
    "items": [
      {"product_name": "Laptop", "quantity": 1, "unit_price": 1200}
    ],
    "status": "pending",
    "total_amount": 1200,
    "priority": "high"
  },
  {
    "customer_name": "Bob Smith",
    "items": [
      {"product_name": "Mouse", "quantity": 2, "unit_price": 25},
      {"product_name": "Keyboard", "quantity": 1, "unit_price": 75}
    ],
    "status": "processing",
    "total_amount": 125,
    "priority": "medium"
  },
  {
    "customer_name": "Carol White",
    "items": [{"product_name": "Monitor", "quantity": 1, "unit_price": 300}],
    "status": "shipped",
    "total_amount": 300,
    "priority": "low"
  },
  {
    "customer_name": "David Brown",
    "items": [{"product_name": "Webcam", "quantity": 3, "unit_price": 50}],
    "status": "delivered",
    "total_amount": 150,
    "priority": "medium"
  },
  {
    "customer_name": "Eve Davis",
    "customer_email": "eve@example.com",
    "items": [
      {"product_name": "USB Cable", "quantity": 5, "unit_price": 10},
      {"product_name": "HDMI Cable", "quantity": 2, "unit_price": 15}
    ],
    "status": "pending",
    "total_amount": 80,
    "priority": "low"
  }
]

async def seed_db():
    client = AsyncIOMotorClient(MONGO_URI)
    db = client[DB_NAME]
    
    # Optional: clear existing data
    await db["orders"].delete_many({})
    
    await db["orders"].insert_many(seed_data)
    print("Database seeded with 5 orders.")
    
    client.close()

if __name__ == "__main__":
    asyncio.run(seed_db())

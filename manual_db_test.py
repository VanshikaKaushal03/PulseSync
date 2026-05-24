import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import datetime

async def manual_db_change():
    print("Connecting directly to MongoDB (bypassing FastAPI completely)...")
    client = AsyncIOMotorClient("mongodb://127.0.0.1:27018/?replicaSet=rs0")
    db = client["push_architecture_db"]
    
    # Wait 2 seconds so you can watch the UI
    print("Look at your React UI! Inserting in 3 seconds...")
    await asyncio.sleep(3)
    
    # 1. Manual Insert
    print("1. Inserting a completely manual order...")
    new_order = {
        "customer_name": "Manual Hacker",
        "customer_email": "hacker@matrix.com",
        "items": [{"product_name": "Red Pill", "quantity": 1, "unit_price": 99.99}],
        "status": "processing",
        "total_amount": 99.99,
        "created_at": datetime.datetime.now(datetime.UTC)
    }
    result = await db["orders"].insert_one(new_order)
    order_id = result.inserted_id
    print(f"✅ Inserted! ID: {order_id}")
    
    await asyncio.sleep(4)
    
    # 2. Manual Update
    print("2. Manually updating the order status...")
    await db["orders"].update_one(
        {"_id": order_id},
        {"$set": {"status": "shipped", "total_amount": 0.00}} # Discounted!
    )
    print("✅ Updated!")
    
    await asyncio.sleep(4)
    
    # 3. Manual Delete
    print("3. Manually deleting the order...")
    await db["orders"].delete_one({"_id": order_id})
    print("✅ Deleted!")
    
    client.close()

if __name__ == "__main__":
    asyncio.run(manual_db_change())

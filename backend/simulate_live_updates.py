import asyncio
import os
import random
from datetime import datetime
from motor.motor_asyncio import AsyncIOMotorClient

async def simulate_live_updates():
    print("Connecting to MongoDB for Live Updates Simulation...")
    MONGO_URI = os.getenv("MONGO_URI", "mongodb://127.0.0.1:27018/?replicaSet=rs0&directConnection=true")
    client = AsyncIOMotorClient(MONGO_URI)
    db = client["fastapi_cdc"]
    coll = db["orders"]

    statuses = ["pending", "processing", "shipped", "delivered"]
    
    print("Starting infinite live update loop...")
    while True:
        try:
            # Pick a random order
            cursor = coll.find({})
            orders = await cursor.to_list(length=100)
            if not orders:
                await asyncio.sleep(5)
                continue
                
            random_order = random.choice(orders)
            current_status = random_order.get("status", "pending")
            
            # Move to next status or wrap around
            current_idx = statuses.index(current_status) if current_status in statuses else 0
            next_status = statuses[(current_idx + 1) % len(statuses)]
            
            # Occasionally randomly pick any status for chaos
            if random.random() < 0.2:
                next_status = random.choice(statuses)
                
            print(f"Updating order {random_order['_id']} ({random_order['product_name']}) from {current_status} -> {next_status}")
            
            await coll.update_one(
                {"_id": random_order["_id"]},
                {"$set": {
                    "status": next_status,
                    "updated_at": datetime.utcnow()
                }}
            )
        except Exception as e:
            print(f"Update error: {e}")
            
        # Wait a few seconds before the next update to simulate natural flow
        await asyncio.sleep(random.uniform(2, 5))

if __name__ == "__main__":
    try:
        asyncio.run(simulate_live_updates())
    except KeyboardInterrupt:
        print("Simulation stopped.")

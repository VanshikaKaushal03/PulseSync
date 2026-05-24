import asyncio
import random
import time
from datetime import datetime
import os
from motor.motor_asyncio import AsyncIOMotorClient

async def simulate():
    print("Connecting to MongoDB Replica Set...")
    MONGO_URI = os.getenv("MONGO_URI", "mongodb://127.0.0.1:27018/?replicaSet=rs0&directConnection=true")
    client = AsyncIOMotorClient(MONGO_URI)
    db = client["fastapi_cdc"]
    
    collections = ["orders", "inventory", "logistics"]
    
    print("Starting simulated database traffic... Press Ctrl+C to stop.")
    
    # We will use Faker for demo mode
    from faker import Faker
    fake = Faker()
    
    try:
        while True:
            # Check Demo Mode configuration dynamically from DB
            config = await db["config"].find_one({"_id": "simulator_settings"})
            demo_mode = config.get("demo_mode", True) if config else True
            
            if demo_mode:
                # DEMO MODE: Realistic, slow-paced e-commerce data
                delay = random.uniform(2.0, 5.0)
                await asyncio.sleep(delay)
                
                # In demo mode, we strictly work on orders to show the UI
                op = random.choices(["insert", "update"], weights=[0.4, 0.6])[0]
                coll = db["orders"]
                
                if op == "insert":
                    # Force some orders to be for "Alice" so the demo works!
                    is_alice = random.random() < 0.3 # 30% chance it's for Alice
                    
                    # Determine next numeric ID by scanning existing orders
                    highest_id = 100
                    async for d in coll.find({}, {"_id": 1}):
                        try:
                            id_str = str(d["_id"])
                            if id_str.isdigit():
                                val = int(id_str)
                                if val > highest_id:
                                    highest_id = val
                        except Exception:
                            pass
                    next_id = str(highest_id + 1)
                    
                    doc = {
                        "_id": next_id,
                        "simulated": True,
                        "timestamp": datetime.utcnow(),
                        "customer_name": "Alice" if is_alice else fake.name(),
                        "customer_email": "alice@example.com" if is_alice else fake.email(),
                        "product_name": random.choice(["MacBook Pro 16\"", "iPhone 15 Pro", "Sony WH-1000XM5", "Nike Air Max", "Herman Miller Chair"]),
                        "price": round(random.uniform(50.0, 2500.0), 2),
                        "status": "pending",
                        "updated_at": datetime.utcnow()
                    }
                    await coll.insert_one(doc)
                    
                elif op == "update":
                    # Find an order that isn't delivered yet to advance its status gracefully
                    order = await coll.find_one({"simulated": True, "status": {"$ne": "delivered"}}, sort=[("timestamp", 1)])
                    if order:
                        # Progression logic
                        next_status_map = {
                            "pending": "processing",
                            "processing": "shipped",
                            "shipped": "delivered"
                        }
                        current_status = order.get("status", "pending")
                        new_status = next_status_map.get(current_status, "delivered")
                        
                        await coll.update_one(
                            {"_id": order["_id"]},
                            {"$set": {"status": new_status, "updated_at": datetime.utcnow()}}
                        )
                continue
            
            # NORMAL STRESS TEST MODE (Chaos)
            await asyncio.sleep(random.uniform(0.01, 0.1))
            
            # Pick a random collection
            coll_name = random.choice(collections)
            coll = db[coll_name]
            
            # Decide on operation
            op = random.choices(["insert", "update", "delete"], weights=[0.5, 0.4, 0.1])[0]
            
            try:
                if op == "insert":
                    doc = {
                        "simulated": True,
                        "timestamp": datetime.utcnow(),
                    }
                    if coll_name == "orders":
                        # Determine next numeric ID by scanning existing orders
                        highest_id = 100
                        async for d in coll.find({}, {"_id": 1}):
                            try:
                                id_str = str(d["_id"])
                                if id_str.isdigit():
                                    val = int(id_str)
                                    if val > highest_id:
                                        highest_id = val
                            except Exception:
                                pass
                        next_id = str(highest_id + 1)
                        doc["_id"] = next_id

                        doc["customer_name"] = random.choice(["Alice", "Bob", "Charlie", "Diana", "Eve"])
                        doc["customer_email"] = f"{doc['customer_name'].lower()}@example.com"
                        doc["product_name"] = random.choice(["Laptop", "Phone", "Headphones", "Monitor", "Keyboard"])
                        doc["status"] = random.choice(["pending", "shipped", "delivered"])
                        doc["updated_at"] = datetime.utcnow()
                    elif coll_name == "inventory":
                        doc["sku"] = f"SKU-{random.randint(1000, 9999)}"
                        doc["stock"] = random.randint(0, 500)
                    elif coll_name == "logistics":
                        doc["driver_id"] = f"DRV-{random.randint(10, 99)}"
                        doc["location"] = {"lat": random.uniform(-90, 90), "long": random.uniform(-180, 180)}
                    
                    await coll.insert_one(doc)
                    
                elif op == "update":
                    # Find a random document to update
                    # To avoid expensive queries, just grab the most recent one
                    cursor = coll.find({"simulated": True}).sort("timestamp", -1).limit(1)
                    docs = await cursor.to_list(length=1)
                    if docs:
                        doc = docs[0]
                        updates = {}
                        if coll_name == "orders":
                            updates["status"] = random.choice(["pending", "shipped", "delivered"])
                        elif coll_name == "inventory":
                            updates["stock"] = max(0, doc.get("stock", 100) - random.randint(1, 10))
                        elif coll_name == "logistics":
                            updates["location"] = {"lat": random.uniform(-90, 90), "long": random.uniform(-180, 180)}
                        
                        updates["updated_at"] = datetime.utcnow()
                        await coll.update_one({"_id": doc["_id"]}, {"$set": updates})
                        
                elif op == "delete":
                    cursor = coll.find({"simulated": True}).sort("timestamp", 1).limit(1)
                    docs = await cursor.to_list(length=1)
                    if docs:
                        await coll.delete_one({"_id": docs[0]["_id"]})
            except Exception as e:
                print(f"Error during {op}: {e}")
                
            # Random sleep to create realistic sporadic traffic
            # High traffic bursts occasionally
            if random.random() > 0.8:
                await asyncio.sleep(random.uniform(0.01, 0.05)) # burst
            else:
                await asyncio.sleep(random.uniform(0.5, 2.0)) # normal
                
    except asyncio.CancelledError:
        pass
    finally:
        client.close()

if __name__ == "__main__":
    asyncio.run(simulate())

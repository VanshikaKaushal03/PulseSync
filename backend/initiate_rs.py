import asyncio
import sys
from motor.motor_asyncio import AsyncIOMotorClient

async def run():
    print("Connecting to MongoDB on port 27018...")
    client = AsyncIOMotorClient("mongodb://127.0.0.1:27018", serverSelectionTimeoutMS=2000)
    try:
        # Check if replica set is already initiated
        status = await client.admin.command('replSetGetStatus')
        print(f"Replica Set '{status.get('set')}' is already initiated and active.")
        sys.exit(0)
    except Exception as e:
        print("Replica Set not active. Attempting to initiate 'rs0'...")
        try:
            config = {
                "_id": "rs0",
                "members": [{"_id": 0, "host": "127.0.0.1:27018"}]
            }
            res = await client.admin.command('replSetInitiate', config)
            print("Replica Set initiated successfully!")
            sys.exit(0)
        except Exception as init_err:
            print(f"Replica Set initiation failed: {init_err}")
            sys.exit(1)
    finally:
        client.close()

if __name__ == "__main__":
    try:
        asyncio.run(run())
    except Exception as e:
        print(f"Failed to connect or communicate with MongoDB: {e}")
        sys.exit(1)

import asyncio
from motor.motor_asyncio import AsyncIOMotorClient

async def cleanup():
    client = AsyncIOMotorClient("mongodb://localhost:27018/?replicaSet=rs0&directConnection=true")
    db = client["fastapi_cdc"]
    
    # Let's count by collection
    pipeline = [
        {"$group": {"_id": "$collection", "count": {"$sum": 1}}}
    ]
    cursor = db["events"].aggregate(pipeline)
    print("Events count before cleanup by collection:")
    async for doc in cursor:
        print(f"  {doc['_id']}: {doc['count']}")
        
    # Delete garbage events
    result = await db["events"].delete_many({"collection": {"$in": ["clients", "client_connections", "admin_logs"]}})
    print(f"Deleted {result.deleted_count} garbage events.")
    
    # Let's count again
    cursor = db["events"].aggregate(pipeline)
    print("Events count after cleanup by collection:")
    async for doc in cursor:
        print(f"  {doc['_id']}: {doc['count']}")

asyncio.run(cleanup())

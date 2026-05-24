import asyncio
from motor.motor_asyncio import AsyncIOMotorClient

async def check():
    client = AsyncIOMotorClient("mongodb://localhost:27018/?replicaSet=rs0&directConnection=true")
    db = client["fastapi_cdc"]
    
    # List databases and collections
    db_names = await client.list_database_names()
    print("Databases:", db_names)
    
    for db_name in ["test", "fastapi_cdc"]:
        print(f"\n--- Database: {db_name} ---")
        curr_db = client[db_name]
        colls = await curr_db.list_collection_names()
        print("Collections:", colls)
        for coll in colls:
            count = await curr_db[coll].count_documents({})
            print(f"  Collection '{coll}' count: {count}")
            if coll in ["events", "admin_logs"]:
                cursor = curr_db[coll].find().sort("timestamp", -1).limit(5)
                print(f"  Last 5 in '{coll}':")
                async for doc in cursor:
                    doc["_id"] = str(doc["_id"])
                    print("    ", doc)

asyncio.run(check())

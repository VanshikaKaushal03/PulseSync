import asyncio
from motor.motor_asyncio import AsyncIOMotorClient

async def check():
    client = AsyncIOMotorClient("mongodb://localhost:27018/?replicaSet=rs0&directConnection=true")
    db = client["fastapi_cdc"]
    cursor = db["sources"].find()
    async for doc in cursor:
        doc["_id"] = str(doc["_id"])
        print(doc)

asyncio.run(check())

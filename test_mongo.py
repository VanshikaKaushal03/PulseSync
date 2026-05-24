import asyncio
from motor.motor_asyncio import AsyncIOMotorClient

async def test():
    uri = "mongodb://127.0.0.1:27018/?replicaSet=rs0"
    client = AsyncIOMotorClient(uri)
    try:
        info = await client.server_info()
        print("Successfully connected:", info.get("version"))
        status = await client.admin.command('replSetGetStatus')
        print("Replica set status:", status.get('set'))
    except Exception as e:
        print("Failed:", e)
    finally:
        client.close()

if __name__ == "__main__":
    asyncio.run(test())

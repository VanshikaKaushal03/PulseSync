import asyncio
from motor.motor_asyncio import AsyncIOMotorClient

async def test():
    c = AsyncIOMotorClient('mongodb://127.0.0.1:27018/?replicaSet=rs0&directConnection=true')
    db = c.fastapi_cdc
    total = await db.orders.count_documents({})
    missing_items = await db.orders.count_documents({"items": {"$exists": False}})
    missing_total = await db.orders.count_documents({"total_amount": {"$exists": False}})
    
    print('Total Orders:', total)
    print('Orders missing items:', missing_items)
    print('Orders missing total_amount:', missing_total)
    
    if missing_total > 0:
        sample = await db.orders.find_one({"total_amount": {"$exists": False}})
        print('Missing total_amount sample:', sample)
        
    c.close()

if __name__ == "__main__":
    asyncio.run(test())

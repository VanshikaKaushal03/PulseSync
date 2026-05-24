import asyncio
from motor.motor_asyncio import AsyncIOMotorClient

async def test():
    c = AsyncIOMotorClient('mongodb://127.0.0.1:27018/?replicaSet=rs0&directConnection=true')
    dbs = await c.list_database_names()
    print('DBs:', dbs)
    for db_name in dbs:
        if db_name in ['admin', 'config', 'local']:
            continue
        colls = await c[db_name].list_collection_names()
        print(f'  DB: {db_name} -> collections: {colls}')
        for coll in colls:
            count = await c[db_name][coll].count_documents({})
            print(f'    Collection: {coll} -> count: {count}')
            if db_name == 'inventory' and coll == 'products':
                products = await c[db_name][coll].find().to_list(10)
                print(f'    Sample products: {products}')
    c.close()

if __name__ == "__main__":
    asyncio.run(test())

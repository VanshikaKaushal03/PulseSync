from pymongo import MongoClient

def migrate():
    MONGO_URI = "mongodb://127.0.0.1:27018/?replicaSet=rs0&directConnection=true"
    client = MongoClient(MONGO_URI)
    db = client["fastapi_cdc"]
    
    # 1. Update any existing sources that have 'mongo1' in their URI to 'localhost'
    result = db.sources.update_many(
        {"uri": {"$regex": "mongo1"}},
        [{"$set": {"uri": {"$replaceOne": {"input": "$uri", "find": "mongo1", "replacement": "localhost"}}}}]
    )
    print(f"Migrated {result.modified_count} sources to localhost.")
    
    # 2. Print all active sources to confirm
    sources = list(db.sources.find({}, {"_id": 0, "id": 1, "name": 1, "uri": 1}))
    print("Current Stream Sources:")
    for s in sources:
        print(f" - {s.get('name')} ({s.get('id')}): {s.get('uri')}")

if __name__ == "__main__":
    migrate()

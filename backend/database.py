import os
from motor.motor_asyncio import AsyncIOMotorClient
import redis.asyncio as redis

# Environment variables or defaults
MONGO_URI = os.getenv("MONGO_URI", "mongodb://127.0.0.1:27018/?replicaSet=rs0")
REDIS_URI = os.getenv("REDIS_URI", "redis://localhost:6379/0")
DB_NAME = os.getenv("DB_NAME", "push_architecture_db")

class Database:
    client: AsyncIOMotorClient = None
    redis_client: redis.Redis = None

db = Database()

async def connect_to_mongo():
    db.client = AsyncIOMotorClient(MONGO_URI)
    print(f"Connected to MongoDB at {MONGO_URI}")

async def close_mongo_connection():
    if db.client:
        db.client.close()
        print("Closed MongoDB connection")

async def connect_to_redis():
    db.redis_client = redis.from_url(REDIS_URI, decode_responses=True)
    print(f"Connected to Redis at {REDIS_URI}")

async def close_redis_connection():
    if db.redis_client:
        await db.redis_client.close()
        print("Closed Redis connection")

def get_database():
    return db.client[DB_NAME]

def get_redis():
    return db.redis_client

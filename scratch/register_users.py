import httpx
import asyncio

async def register():
    async with httpx.AsyncClient() as client:
        # Register Admin
        await client.post("http://localhost:8000/register", json={
            "email": "admin@example.com",
            "username": "admin@example.com",
            "password": "password123",
            "role": "admin",
            "customer_name": "Admin"
        })
        
        # Register Alice
        await client.post("http://localhost:8000/register", json={
            "email": "alice@example.com",
            "username": "alice@example.com",
            "password": "password123",
            "role": "customer",
            "customer_name": "Alice"
        })
        
        # Register Bob
        await client.post("http://localhost:8000/register", json={
            "email": "bob@example.com",
            "username": "bob@example.com",
            "password": "password123",
            "role": "customer",
            "customer_name": "Bob"
        })
        
        print("Users registered!")

if __name__ == "__main__":
    asyncio.run(register())

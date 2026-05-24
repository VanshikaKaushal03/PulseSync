import httpx
import asyncio

async def register():
    async with httpx.AsyncClient() as client:
        # Register Admin 2
        res = await client.post("http://localhost:8000/register", json={
            "email": "admin2@example.com",
            "username": "admin2@example.com",
            "password": "password123",
            "role": "admin",
            "customer_name": "Admin2"
        })
        print("Admin 2 registered:", res.json())

if __name__ == "__main__":
    asyncio.run(register())

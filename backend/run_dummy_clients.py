import asyncio
import websockets
import httpx
import uuid
import json

# This script spawns 10 dummy background clients (5 WS, 5 SSE) 
# that just listen to the global event stream to simulate active connection load.

async def dummy_ws_client(i):
    client_id = f"dummy_ws_{i}_{uuid.uuid4().hex[:6]}"
    uri = f"ws://localhost:8000/ws/{client_id}"
    try:
        # We don't have JWTs for these dummies in this script, but the server expects a token?
        # Oh right, the server expects `token=` query param.
        # Let's bypass it for dummies if the server requires auth.
        # Actually, let's login a dummy user to get a token, or use the admin token.
        print(f"WS Client {i} skipped due to strict JWT auth requirement... wait, let's just make an API call to get a token!")
    except Exception as e:
        print(f"WS Client {i} failed: {e}")

async def authenticate_and_run_clients():
    print("Authenticating a dummy admin to get a valid token...")
    async with httpx.AsyncClient() as client:
        # Register a dummy admin just in case
        dummy_email = f"dummy_{uuid.uuid4().hex[:6]}@example.com"
        try:
            res_reg = await client.post("http://localhost:8000/register", json={
                "email": dummy_email,
                "username": dummy_email,
                "password": "password",
                "role": "admin",
                "customer_name": "DummyAdmin"
            })
            print("Register response:", res_reg.json())
        except Exception as e:
            print("Register error:", e)
            
        res = await client.post("http://localhost:8000/login", data={
            "username": dummy_email,
            "password": "password"
        })
        print("Login response:", res.json())
        token = res.json().get("access_token")
        
        if not token:
            print("Failed to get token for dummy clients!")
            return

        async def run_ws(i):
            client_id = f"dummy_ws_{i}_{uuid.uuid4().hex[:6]}"
            uri = f"ws://localhost:8000/ws/{client_id}?token={token}"
            try:
                async with websockets.connect(uri) as ws:
                    print(f"Dummy WS {i} connected.")
                    await ws.send(json.dumps({"filters": {}})) # Admin gets all
                    while True:
                        msg = await ws.recv()
                        # Just drop it, we're just simulating load
            except asyncio.CancelledError:
                pass
            except Exception as e:
                print(f"Dummy WS {i} error: {e}")

        async def run_sse(i):
            client_id = f"dummy_sse_{i}_{uuid.uuid4().hex[:6]}"
            url = f"http://localhost:8000/sse/{client_id}?token={token}"
            try:
                async with httpx.AsyncClient(timeout=None) as sse_client:
                    print(f"Dummy SSE {i} connected.")
                    async with sse_client.stream("GET", url) as response:
                        async for line in response.aiter_lines():
                            pass
            except asyncio.CancelledError:
                pass
            except Exception as e:
                print(f"Dummy SSE {i} error: {e}")

        # Spawn 5 WS and 5 SSE
        tasks = []
        for i in range(5):
            tasks.append(asyncio.create_task(run_ws(i)))
            tasks.append(asyncio.create_task(run_sse(i)))
            
        print("10 Dummy Clients successfully spawned and holding connections.")
        await asyncio.gather(*tasks)

if __name__ == "__main__":
    try:
        asyncio.run(authenticate_and_run_clients())
    except KeyboardInterrupt:
        print("Dummy clients shut down.")

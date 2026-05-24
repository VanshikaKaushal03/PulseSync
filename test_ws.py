import asyncio
import websockets
import json

async def test_ws():
    uri = "ws://127.0.0.1:8000/ws/test_client"
    async with websockets.connect(uri) as websocket:
        print("Connected to WS. Waiting for events...")
        # Send empty filters
        await websocket.send(json.dumps({"filters": {}}))
        
        while True:
            try:
                message = await asyncio.wait_for(websocket.recv(), timeout=10.0)
                print(f"Received: {message}")
            except asyncio.TimeoutError:
                print("No events in 10s")
                break

if __name__ == "__main__":
    asyncio.run(test_ws())

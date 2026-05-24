import asyncio
import websockets
import json
import random

async def connect_client(client_id):
    uri = f"ws://localhost:8000/ws/{client_id}"
    try:
        async with websockets.connect(uri) as websocket:
            print(f"Client {client_id} connected")
            # Send initial filters
            await websocket.send(json.dumps({"filters": {}}))
            
            # Keep connection alive and receive messages
            while True:
                msg = await websocket.recv()
                # We won't print every message to avoid spam, just keep it alive
                pass
    except Exception as e:
        print(f"Client {client_id} error: {e}")

async def main():
    num_clients = 50
    print(f"Starting {num_clients} simulated WebSocket clients...")
    
    # Stagger connections slightly
    tasks = []
    for i in range(num_clients):
        tasks.append(asyncio.create_task(connect_client(f"SIM-{i}")))
        await asyncio.sleep(0.05)
        
    await asyncio.gather(*tasks)

if __name__ == "__main__":
    asyncio.run(main())

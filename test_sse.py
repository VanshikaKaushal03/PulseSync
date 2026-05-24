import asyncio
import httpx

async def test_sse():
    url = "http://127.0.0.1:8000/sse/test_sse_client"
    print(f"Connecting to SSE at {url}...")
    try:
        async with httpx.AsyncClient() as client:
            async with client.stream('GET', url, timeout=None) as response:
                print("Connected! Waiting for events...")
                async for chunk in response.aiter_text():
                    if chunk.strip():
                        print(f"Received: {chunk.strip()}")
    except Exception as e:
        print(f"SSE Error: {e}")

if __name__ == "__main__":
    asyncio.run(test_sse())

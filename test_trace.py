import asyncio
import json
from backend.delivery_router import router
from backend.filter_engine import evaluate_filter
from backend.event_processor import sanitize_for_json

async def test():
    print("Testing filter...")
    event = {"operation": "insert", "full_document": {"_id": "123", "status": "pending"}}
    print(f"Filter empty: {evaluate_filter(event, {})}")

if __name__ == "__main__":
    asyncio.run(test())

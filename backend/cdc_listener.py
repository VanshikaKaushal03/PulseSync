import asyncio
from motor.motor_asyncio import AsyncIOMotorCollection
from backend.database import get_database
from backend.event_processor import process_change_event, save_event_to_store
from backend.delivery_router import router

async def watch_collection():
    """
    Background task to listen to MongoDB Change Streams on the 'orders' collection.
    """
    db = get_database()
    collection: AsyncIOMotorCollection = db["orders"]
    
    # We want to capture full documents on updates if possible (for complex filtering)
    # updateLookup allows getting the full document post-update.
    # Exclude system collections or our own 'events' collection to prevent infinite loops!
    pipeline = [
        {"$match": {
            "operationType": {"$in": ["insert", "update", "delete", "replace"]},
            "ns.coll": {"$nin": ["events", "users", "system.profile", "clients", "client_connections", "admin_logs"]}
        }}
    ]
    
    try:
        # full_document="updateLookup" is crucial for filtering on updates where 
        # the filtered field might not have been the one updated.
        async with db.watch(pipeline, full_document="updateLookup") as stream:
            print("Listening to MongoDB Change Stream on entire database (excluding internal collections)...")
            async for change in stream:
                print(f"Detected change: {change.get('operationType')} on {change.get('documentKey')}")
                
                # 1. Process into Delta Format
                event = process_change_event(change)
                
                # 2. Event Sourcing
                await save_event_to_store(db, event)
                
                # 3. Delivery / Routing
                # For this assignment, we broadcast. Filtering happens in the router.
                # If we need the current state for an 'update' event filter, it's in full_document 
                # thanks to updateLookup!
                if "fullDocument" in change:
                    # Inject full document into event temporarily for the filter engine, 
                    # but maybe don't send it to clients if we only want deltas.
                    # Or keep it in the event but standard clients just look at updated_fields.
                    event["_full_state"] = change["fullDocument"]
                    if "_id" in event["_full_state"]:
                         event["_full_state"]["_id"] = str(event["_full_state"]["_id"])

                await router.broadcast(event)
                


    except Exception as e:
        print(f"Error in Change Stream listener: {e}")
        # In production, implement reconnect logic with resume tokens
        await asyncio.sleep(5)
        asyncio.create_task(watch_collection())

from motor.motor_asyncio import AsyncIOMotorClient

async def watch_custom_uri(uri: str, source_id: str, db_name: str = "test"):
    """
    Background task to listen to a custom MongoDB URI provided by the user.
    """
    client = AsyncIOMotorClient(uri)
    db = client[db_name]
    main_db = get_database() # for event sourcing

    pipeline = [
        {"$match": {
            "operationType": {"$in": ["insert", "update", "delete", "replace"]},
            "ns.coll": {"$nin": ["events", "users", "system.profile", "clients", "client_connections", "admin_logs"]}
        }}
    ]

    try:
        async with db.watch(pipeline, full_document="updateLookup") as stream:
            print(f"Listening to custom MongoDB Change Stream for source: {source_id}")
            async for change in stream:
                print(f"Detected custom change: {change.get('operationType')} on {change.get('documentKey')} (source: {source_id})")
                
                event = process_change_event(change)
                event["source_id"] = source_id # Tag the event with its custom source

                await save_event_to_store(main_db, event)

                if "fullDocument" in change:
                    event["_full_state"] = change["fullDocument"]
                    if "_id" in event["_full_state"]:
                         event["_full_state"]["_id"] = str(event["_full_state"]["_id"])

                await router.broadcast(event)
                


    except Exception as e:
        print(f"Error in Custom Change Stream listener ({source_id}): {e}")
        # Minimal retry logic
        await asyncio.sleep(5)
        asyncio.create_task(watch_custom_uri(uri, source_id, db_name))

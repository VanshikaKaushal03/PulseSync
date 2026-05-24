import json
from datetime import datetime
from typing import Dict, Any
from bson import ObjectId

def sanitize_for_json(data: Any) -> Any:
    if isinstance(data, dict):
        return {k: sanitize_for_json(v) for k, v in data.items()}
    elif isinstance(data, list):
        return [sanitize_for_json(v) for v in data]
    elif isinstance(data, ObjectId):
        return str(data)
    elif isinstance(data, datetime):
        return data.isoformat()
    return data

def process_change_event(change: Dict[str, Any]) -> Dict[str, Any]:
    """
    Takes a MongoDB Change Stream event and converts it into a standard
    Delta Update format.
    """
    operation_type = change.get("operationType")
    document_key = change.get("documentKey", {}).get("_id")
    
    # Base event structure
    event = {
        "event_id": str(change.get("_id", {}).get("_data", "")),
        "timestamp": datetime.utcnow().isoformat(),
        "operation": operation_type,
        "document_id": str(document_key),
        "collection": change.get("ns", {}).get("coll")
    }

    if operation_type == "insert":
        event["full_document"] = change.get("fullDocument")
        # Ensure _id is string for JSON serialization
        if "_id" in event["full_document"]:
             event["full_document"]["_id"] = str(event["full_document"]["_id"])
             
    elif operation_type == "update":
        update_desc = change.get("updateDescription", {})
        event["updated_fields"] = update_desc.get("updatedFields", {})
        event["removed_fields"] = update_desc.get("removedFields", [])
        
    elif operation_type == "delete":
        pass # Only ID is needed, already included

    elif operation_type == "replace":
        event["full_document"] = change.get("fullDocument")
        if "_id" in event["full_document"]:
             event["full_document"]["_id"] = str(event["full_document"]["_id"])
             
    return sanitize_for_json(event)

async def save_event_to_store(db, event: Dict[str, Any]):
    """
    Event Sourcing: Save the event to an immutable 'events' collection.
    """
    await db["events"].insert_one(event.copy())


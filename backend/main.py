import asyncio
import json
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Request, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from sse_starlette.sse import EventSourceResponse
from fastapi.security import OAuth2PasswordRequestForm
from typing import Dict, Any, List

from backend.database import connect_to_mongo, close_mongo_connection, connect_to_redis, close_redis_connection, get_database
from backend.cdc_listener import watch_collection, watch_custom_uri
from pydantic import BaseModel
from backend.delivery_router import router
from backend.models.order import OrderBase, OrderInDB
from backend.models.user import UserCreate, UserInDB, Token, TokenData
from backend.database import MONGO_URI
db_host = "mongo1" if "mongo1" in MONGO_URI else "localhost"

app = FastAPI(title="Hybrid Push Architecture API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

cdc_task = None
custom_cdc_tasks = []

# Removed in-memory ACTIVE_SOURCES

class SourceCreate(BaseModel):
    name: str
    uri: str
    type: str = "mongodb"
    db_name: str = "test"

@app.on_event("startup")
async def startup_event():
    global cdc_task
    await connect_to_mongo()
    await connect_to_redis()
    
    db = get_database()
    
    # Clear active clients across all databases on startup!
    try:
        from backend.database import db as mongo_db
        if mongo_db.client:
            db_names = await mongo_db.client.list_database_names()
            target_db_names = [name for name in db_names if name not in ["admin", "config", "local"]]
            for db_name in target_db_names:
                await mongo_db.client[db_name]["clients"].delete_many({})
            print("Cleared stale connected clients from all databases on startup.")
    except Exception as e:
        print(f"Error clearing stale clients on startup: {e}")
        
    # Start the primary background task
    cdc_task = asyncio.create_task(watch_collection())
    
    # Seed databases if empty
    count = await db["sources"].count_documents({})
    if count == 0:
        default_sources = [
            {"id": "src_mongo_1", "type": "mongodb", "name": "Global Orders (Primary RS)", "uri": "mongodb://localhost:27018/?replicaSet=rs0&directConnection=true", "db_name": "test", "status": "connected", "latency": 12, "throughput": 45},
            {"id": "src_mongo_2", "type": "mongodb", "name": "Inventory US (Secondary RS)", "uri": "mongodb://localhost:27018/?replicaSet=rs0&directConnection=true", "db_name": "inventory", "status": "connected", "latency": 24, "throughput": 120},
            {"id": "src_mongo_3", "type": "mongodb", "name": "User Auth DB", "uri": "mongodb://localhost:27018/?replicaSet=rs0&directConnection=true", "db_name": "users", "status": "connected", "latency": 8, "throughput": 12},
            {"id": "src_mongo_4", "type": "mongodb", "name": "Analytics Cluster", "uri": "mongodb://localhost:27018/?replicaSet=rs0&directConnection=true", "db_name": "analytics", "status": "connected", "latency": 45, "throughput": 850}
        ]
        await db["sources"].insert_many(default_sources)
        
    # Quick migration: fix any existing URLs with mongo1 or without directConnection
    await db["sources"].update_many(
        {"uri": {"$regex": "mongo1"}},
        [{"$set": {"uri": {"$replaceOne": {"input": "$uri", "find": "mongo1", "replacement": "localhost"}}}}]
    )
    await db["sources"].update_many(
        {"uri": {"$not": {"$regex": "directConnection=true"}}},
        [{"$set": {"uri": {"$concat": ["$uri", "&directConnection=true"]}}}]
    )
    
    # Restart listeners for any persisted custom sources
    cursor = db["sources"].find()
    async for source in cursor:
        task = asyncio.create_task(watch_custom_uri(source["uri"], source["id"], source.get("db_name", "test")))
        custom_cdc_tasks.append(task)

@app.on_event("shutdown")
async def shutdown_event():
    if cdc_task:
        cdc_task.cancel()
    for task in custom_cdc_tasks:
        task.cancel()
    await close_mongo_connection()
    await close_redis_connection()

# --- AUTH ENDPOINTS ---

@app.post("/register", response_model=Token)
async def register(user: UserCreate):
    db = get_database()
    existing = await db["users"].find_one({"email": user.email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
        
    hashed_password = get_password_hash(user.password)
    user_dict = user.model_dump(exclude={"password"})
    user_dict["hashed_password"] = hashed_password
    
    await db["users"].insert_one(user_dict)
    
    access_token = create_access_token(data={"sub": user.email, "username": user.username, "role": user.role, "customer_name": user.customer_name})
    return {"access_token": access_token, "token_type": "bearer"}

@app.post("/login", response_model=Token)
async def login(form_data: OAuth2PasswordRequestForm = Depends()):
    db = get_database()
    user = await db["users"].find_one({"email": form_data.username})
    if not user or not verify_password(form_data.password, user["hashed_password"]):
        raise HTTPException(status_code=400, detail="Incorrect username or password")
        
    from backend.auth import ACCESS_TOKEN_EXPIRE_MINUTES
    from datetime import timedelta
    access_token = create_access_token(
        data={
            "sub": user["email"],
            "username": user.get("username", user["email"]),
            "role": user.get("role", "viewer"),
            "customer_name": user.get("customer_name")
        },
        expires_delta=timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    return {"access_token": access_token, "token_type": "bearer"}

@app.get("/users/me", response_model=TokenData)
async def read_users_me(current_user: TokenData = Depends(get_current_user)):
    return current_user

# --- HTTP ENDPOINTS (for creating/updating data) ---

@app.post("/orders/", response_model=OrderInDB)
async def create_order(order: OrderBase, current_user: TokenData = Depends(get_current_user)):
    from motor.motor_asyncio import AsyncIOMotorClient
    from datetime import datetime
    db = get_database()
    
    order_dict = order.model_dump()
    
    # Validate items structure
    if not order_dict.get("items"):
        raise HTTPException(status_code=400, detail="Order must have at least one item")
        
    # Fetch product details from inventory database to validate and snapshot
    inventory_client = AsyncIOMotorClient(f"mongodb://{db_host}:27018/?replicaSet=rs0&directConnection=true")
    inventory_db = inventory_client.inventory
    
    try:
        for item in order_dict["items"]:
            product = await inventory_db.products.find_one({"sku": item["sku"]})
            if not product:
                raise HTTPException(status_code=404, detail=f"Product with SKU {item['sku']} not found in inventory")
            
            # Snapshot product details at time of order
            item["product_id"] = str(product["_id"])
            item["product_name"] = product.get("product_name") or product.get("name") or "Unknown Product"
            item["unit_price"] = product["price"]
            item["subtotal"] = item["quantity"] * product["price"]
    finally:
        inventory_client.close()
        
    # Calculate totals
    order_dict["total_amount"] = sum(item["subtotal"] for item in order_dict["items"])
    order_dict["customer_email"] = current_user.email
    order_dict["customer_name"] = current_user.customer_name or "Bob"
    order_dict["status"] = "pending"
    order_dict["created_at"] = datetime.utcnow()
    order_dict["updated_at"] = datetime.utcnow()
    
    # Determine next numeric ID by scanning existing orders
    highest_id = 100
    async for doc in db["orders"].find({}, {"_id": 1}):
        try:
            id_str = str(doc["_id"])
            if id_str.isdigit():
                val = int(id_str)
                if val > highest_id:
                    highest_id = val
        except Exception:
            pass
    next_id = str(highest_id + 1)
    order_dict["_id"] = next_id

    result = await db["orders"].insert_one(order_dict)
    
    created_order = await db["orders"].find_one({"_id": result.inserted_id})
    created_order["_id"] = str(created_order["_id"])
    return OrderInDB(**created_order)



@app.put("/orders/{order_id}")
async def update_order(order_id: str, updates: Dict[str, Any]):
    from bson import ObjectId
    db = get_database()
    
    try:
        obj_id = ObjectId(order_id)
    except:
        obj_id = order_id # Allow string IDs for simplicity in this demo

    result = await db["orders"].update_one(
        {"_id": obj_id}, 
        {"$set": updates, "$inc": {"version": 1}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Order not found")
    return {"status": "success", "modified_count": result.modified_count}

@app.delete("/orders/{order_id}")
async def delete_order(order_id: str):
    from bson import ObjectId
    db = get_database()
    try:
        obj_id = ObjectId(order_id)
    except:
        obj_id = order_id
    
    await db["orders"].delete_one({"_id": obj_id})
    return {"status": "deleted"}

@app.get("/orders/")
async def list_orders(current_user: TokenData = Depends(get_current_user)):
    db = get_database()
    query = {}
    
    # Enforce Customer Privacy Filter
    if current_user.role == "customer" and current_user.customer_name:
        query["customer_name"] = current_user.customer_name
        
    cursor = db["orders"].find(query)
    orders = []
    async for doc in cursor:
        doc["_id"] = str(doc["_id"])
        orders.append(doc)
        
    # Sort by created_at or timestamp in descending order (latest first)
    from datetime import datetime
    def get_order_time(order):
        t = order.get("created_at") or order.get("timestamp")
        if not t:
            return datetime.min
        if isinstance(t, str):
            try:
                return datetime.fromisoformat(t.replace("Z", "+00:00"))
            except Exception:
                return datetime.min
        return t
    orders.sort(key=get_order_time, reverse=True)
    return orders


class OrderStatusUpdate(BaseModel):
    status: str

@app.put("/admin/orders/{order_id}/status")
async def update_order_status(order_id: str, payload: OrderStatusUpdate, current_user: TokenData = Depends(get_current_user)):
    from bson import ObjectId
    from datetime import datetime
    db = get_database()

    try:
        obj_id = ObjectId(order_id)
    except:
        obj_id = order_id

    # Fetch the order before updating so we can log previous state
    existing = await db["orders"].find_one({"_id": obj_id})
    prev_status = existing.get("status", "unknown") if existing else "unknown"
    customer = existing.get("customer_name", "unknown") if existing else "unknown"
    product = existing.get("product_name", "unknown") if existing else "unknown"

    result = await db["orders"].update_one(
        {"_id": obj_id},
        {"$set": {"status": payload.status, "updated_at": datetime.utcnow()}}
    )

    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Order not found")

    now = datetime.utcnow()

    # ── Log admin action ──────────────────────────────────────────────────────
    log_entry = {
        "admin_email": current_user.email,
        "admin_username": current_user.username,
        "action": "update_order_status",
        "order_id": str(order_id),
        "customer_name": customer,
        "product_name": product,
        "previous_status": prev_status,
        "new_status": payload.status,
        "timestamp": now.isoformat(),
        "collection": "orders",
    }
    await db["admin_logs"].insert_one({**log_entry})

    # ── Also write to immutable Event Store so it appears in Replay Center ────
    event_record = {
        "event_id": f"adm_{now.timestamp()}",
        "event_type": "admin_action",
        "timestamp": now.isoformat(),
        "operation": "update",
        "document_id": str(order_id),
        "collection": "orders",
        "updated_fields": {"status": payload.status},
        "admin_email": current_user.email,
        "admin_username": current_user.username,
        "customer_name": customer,
        "product_name": product,
        "previous_status": prev_status,
        "summary": f"{current_user.username} changed order #{str(order_id)[:8]} ({product}) from '{prev_status}' → '{payload.status}'",
    }
    await db["events"].insert_one(event_record)

    # ── Broadcast admin_action event to all connected admins ──────────────────
    action_event = {
        "event_id": f"adm_{now.timestamp()}",
        "event_type": "admin_action",
        "operation": "update",
        "collection": "orders",
        "document_id": str(order_id),
        "timestamp": now.isoformat(),
        "admin_email": current_user.email,
        "admin_username": current_user.username,
        "updated_fields": {"status": payload.status},
        "summary": f"{current_user.username} changed order #{str(order_id)[:8]} ({product}) from '{prev_status}' → '{payload.status}'",
        "customer_name": customer,
    }
    asyncio.create_task(router.broadcast(action_event))

    return {"message": "Status updated successfully", "status": payload.status}

@app.get("/admin/logs")
async def get_admin_logs(limit: int = 100):
    """Return the admin action log for the Replay Center audit tab."""
    db = get_database()
    cursor = db["admin_logs"].find().sort("timestamp", -1).limit(limit)
    logs = []
    async for doc in cursor:
        doc["_id"] = str(doc["_id"])
        logs.append(doc)
    return logs

# --- PLATFORM API ENDPOINTS ---

@app.get("/metrics")
async def get_metrics():
    # Get real backpressure metrics from delivery_router
    real_metrics = router.get_metrics()
    
    # Query real database connection count
    db = get_database()
    connected_dbs = await db["sources"].count_documents({})
    real_metrics["connected_databases"] = connected_dbs
    
    # Count real websocket and sse clients from the database collection
    try:
        ws_count = await db["clients"].count_documents({"connection_type": "websocket"})
        sse_count = await db["clients"].count_documents({"connection_type": "sse"})
        real_metrics["websocket_clients"] = ws_count
        real_metrics["sse_clients"] = sse_count
        real_metrics["active_connections"] = ws_count + sse_count
        
        # Fetch the actual count of events from the immutable store
        total_stored_events = await db["events"].count_documents({})
        real_metrics["total_events_processed"] = total_stored_events
    except Exception as e:
        print(f"Error querying client/events counts from MongoDB: {e}")
        
    # Calculate average latency
    history = router.metrics.get("latency_history", [])
    avg_latency = sum(history) / len(history) if history else 0.0
    
    return {
        "real": real_metrics,
        "simulated": {
            "bandwidth_mbps": 0.0,
            "avg_latency_ms": round(avg_latency, 1)
        }
    }

@app.get("/replay")
async def replay_events(limit: int = 50, skip: int = 0):
    """
    Fetch immutable historical events directly from the MongoDB 'events' collection.
    """
    db = get_database()
    cursor = db["events"].find().sort("timestamp", -1).skip(skip).limit(limit)
    events = []
    async for doc in cursor:
        doc["_id"] = str(doc["_id"])
        events.append(doc)
    return events

@app.get("/orders/{order_id}/history")
async def get_order_history(order_id: str, current_user: TokenData = Depends(get_current_user)):
    """Replay all events for this order from Event Store"""
    db = get_database()
    
    # Simple privacy check for API too!
    query = {"document_id": order_id}
    
    # We ideally want to filter by customer_name if they are a customer, but our raw 'events' 
    # might not have customer_name top-level indexed if we didn't explicitly map it.
    # We will rely on frontend requesting their own order_id for now, 
    # but in prod we'd enforce ownership.
    
    cursor = db["events"].find(query).sort("timestamp", 1) # Ascending for timeline
    events = []
    async for doc in cursor:
        doc["_id"] = str(doc["_id"])
        events.append(doc)
    return events

@app.get("/inventory/products")
async def get_inventory_products():
    """
    Fetch products from inventory.products collection
    Returns native price, category, stock fields
    """
    from motor.motor_asyncio import AsyncIOMotorClient
    from datetime import datetime
    inventory_client = AsyncIOMotorClient(f"mongodb://{db_host}:27018/?replicaSet=rs0&directConnection=true")
    inventory_db = inventory_client.inventory
    
    # Fetch all products from products collection
    products_cursor = inventory_db.products.find()
    products = []
    async for product in products_cursor:
        product["id"] = str(product.pop("_id"))
        # Standardize field name to name/product_name
        if "product_name" in product:
            product["name"] = product["product_name"]
        else:
            product["product_name"] = product.get("name", "Unknown Item")
        # Ensure we have price and category formatted correctly
        if "updated_at" in product and isinstance(product["updated_at"], datetime):
            product["updated_at"] = product["updated_at"].isoformat()
        if "created_at" in product and isinstance(product["created_at"], datetime):
            product["created_at"] = product["created_at"].isoformat()
        products.append(product)
        
    inventory_client.close()
    return {"products": products}

@app.get("/sources")
async def get_stream_sources():
    """Endpoint to return active CDC sources from MongoDB."""
    db = get_database()
    cursor = db["sources"].find()
    sources = []
    async for doc in cursor:
        doc["_id"] = str(doc["_id"])
        sources.append(doc)
        
    # If empty, return a default mock so UI looks good initially
    if not sources:
        return [{
            "id": "src_mongo_1",
            "type": "mongodb",
            "name": "Global Orders (Primary RS)",
            "status": "connected",
            "latency": 12,
            "throughput": 45
        }]
    return sources

@app.post("/sources")
async def create_stream_source(source: SourceCreate):
    import uuid
    db = get_database()
    new_id = f"src_mongo_{uuid.uuid4().hex[:8]}"
    
    new_source = {
        "id": new_id,
        "type": source.type,
        "name": source.name,
        "uri": source.uri,
        "db_name": source.db_name,
        "status": "connected",
        "latency": 0,
        "throughput": 0
    }
    
    # Persist to database
    await db["sources"].insert_one(new_source.copy())
    
    # Spawn background task
    task = asyncio.create_task(watch_custom_uri(source.uri, new_id, source.db_name))
    custom_cdc_tasks.append(task)
    
    new_source["_id"] = str(new_source["id"]) # For UI mapping
    return new_source

@app.get("/sources/{source_id}/data")
async def get_source_data(source_id: str):
    from datetime import datetime
    db = get_database()
    source = await db["sources"].find_one({"id": source_id})
    if not source:
        # Fallback to local default check if not persisted
        default_mappings = {
            "src_mongo_1": {"db_name": "test", "coll_name": "orders", "uri": "mongodb://localhost:27018/?replicaSet=rs0"},
            "src_mongo_2": {"db_name": "inventory", "coll_name": "products", "uri": "mongodb://localhost:27018/?replicaSet=rs0"},
            "src_mongo_3": {"db_name": "users", "coll_name": "profiles", "uri": "mongodb://localhost:27018/?replicaSet=rs0"},
            "src_mongo_4": {"db_name": "analytics", "coll_name": "customer_metrics", "uri": "mongodb://localhost:27018/?replicaSet=rs0"}
        }
        if source_id in default_mappings:
            source = default_mappings[source_id]
        else:
            raise HTTPException(status_code=404, detail="Source not found")
            
    # Connect dynamically to the target URI and fetch data!
    from motor.motor_asyncio import AsyncIOMotorClient
    uri = source.get("uri", "mongodb://localhost:27018/?replicaSet=rs0")
    # Quick normalization of local URIs if needed
    if "localhost" in uri or "127.0.0.1" in uri or "mongo1" in uri:
        uri = f"mongodb://{db_host}:27018/?replicaSet=rs0&directConnection=true"
        
    client = AsyncIOMotorClient(uri)
    target_db = client[source["db_name"]]
    
    # Determine collection name
    coll_name = source.get("coll_name")
    if not coll_name:
        # Map default sources or look up
        mappings = {
            "src_mongo_1": "orders",
            "src_mongo_2": "products",
            "src_mongo_3": "profiles",
            "src_mongo_4": "customer_metrics"
        }
        coll_name = mappings.get(source_id)
        if not coll_name:
            # Fallback to first non-system collection
            colls = await target_db.list_collection_names()
            colls = [c for c in colls if not c.startswith("system.") and c != "dummy"]
            coll_name = colls[0] if colls else "dummy"
            
    cursor = target_db[coll_name].find().limit(50)
    data = []
    async for doc in cursor:
        doc["_id"] = str(doc["_id"])
        # Format datetimes to ISO format for JSON
        for k, v in list(doc.items()):
            if isinstance(v, datetime):
                doc[k] = v.isoformat()
        data.append(doc)
        
    client.close()
    return {"collection": coll_name, "db_name": source["db_name"], "data": data}

@app.get("/query")
async def query_collection(db_name: str, collection: str, filters: str = "{}"):
    """
    Directly query any db_name + collection with optional JSON filter string.
    Used by SmartSubscriptions live preview.
    """
    from datetime import datetime
    from motor.motor_asyncio import AsyncIOMotorClient

    try:
        filter_obj = json.loads(filters)
    except Exception:
        filter_obj = {}

    uri = f"mongodb://{db_host}:27018/?replicaSet=rs0&directConnection=true"
    client = AsyncIOMotorClient(uri)
    target_db = client[db_name]

    try:
        cursor = target_db[collection].find(filter_obj).limit(50)
        data = []
        async for doc in cursor:
            doc["_id"] = str(doc["_id"])
            for k, v in list(doc.items()):
                if isinstance(v, datetime):
                    doc[k] = v.isoformat()
            data.append(doc)
    finally:
        client.close()

    return {"db_name": db_name, "collection": collection, "count": len(data), "data": data}

# --- PUSH ENDPOINTS ---

@app.websocket("/ws/{client_id}")
async def websocket_endpoint(websocket: WebSocket, client_id: str, token: str = None):
    # Verify JWT Token before accepting connection
    from backend.auth import get_ws_user
    user = await get_ws_user(token)
    
    if not user:
        # Reject unauthorized connections immediately
        await websocket.close(code=1008) # Policy violation
        print(f"WS Client {client_id} rejected (Unauthorized)")
        return
        
    await websocket.accept()
    filters = {}
    try:
        # Wait for an initial message defining filters (e.g., '{"filters": {"status": "shipped"}}')
        # Add a timeout so it doesn't hang forever if the client doesn't send it!
        data = await asyncio.wait_for(websocket.receive_text(), timeout=2.0)
        parsed = json.loads(data)
        filters = parsed.get("filters", {})
    except asyncio.TimeoutError:
        print(f"WS filter timeout for {client_id}, proceeding with no explicit filters.")
    except Exception as e:
        print(f"WS filter parse error: {e}")
        
    # Enforce Privacy Filter: If they are a customer, they ONLY see their own data
    if user.role == "customer" and user.customer_name:
        filters["customer_name"] = user.customer_name
        
    # Re-register with the router (which actually handles the accepted connection)
    router.clients[client_id] = {
        "type": "ws",
        "connection": websocket,
        "filters": filters,
        "user_email": user.email,
        "role": user.role
    }
    print(f"WS Client {client_id} ({user.role}) fully registered with filters: {filters}")
    # Register in DB clients collection
    asyncio.create_task(router.register_client_db(client_id, "websocket"))

    try:
        while True:
            # Keep connection alive and allow clients to update filters dynamically
            data = await websocket.receive_text()
            parsed = json.loads(data)
            if "filters" in parsed:
                router.clients[client_id]["filters"] = parsed["filters"]
                print(f"WS Client {client_id} updated filters: {parsed['filters']}")
    except WebSocketDisconnect:
        router.disconnect(client_id)

@app.get("/sse/{client_id}")
async def sse_endpoint(request: Request, client_id: str):
    # Parse filters from query params, e.g. /sse/123?status=shipped
    filters = dict(request.query_params)
    
    queue = asyncio.Queue()
    await router.connect_sse(client_id, queue, filters)

    async def event_generator():
        try:
            while True:
                # Check if client disconnected
                if await request.is_disconnected():
                    break
                
                # Wait for an event from the queue
                # Use wait_for to periodically check disconnect status
                try:
                    event = await asyncio.wait_for(queue.get(), timeout=1.0)
                    # Clean up internal state before sending
                    if "_full_state" in event:
                         del event["_full_state"]
                    yield {"event": "message", "data": json.dumps(event)}
                except asyncio.TimeoutError:
                    pass # Just loop back and check disconnect status
        finally:
            router.disconnect(client_id)

    return EventSourceResponse(event_generator())


# --- SERVE COMPILED SPA FRONTEND ---
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
import os

dist_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), "frontend", "dist")

if os.path.exists(dist_path):
    assets_path = os.path.join(dist_path, "assets")
    if os.path.exists(assets_path):
        app.mount("/assets", StaticFiles(directory=assets_path), name="assets")

@app.get("/{catchall:path}")
async def serve_spa(request: Request, catchall: str):
    api_routes = ["orders", "inventory", "metrics", "replay", "sources", "ws", "sse", "register", "login", "users", "query"]
    first_segment = catchall.split("/")[0] if catchall else ""
    
    # Only 404 if it is a standard API prefix or specific admin API sub-route
    is_admin_api = catchall.startswith("admin/orders") or catchall.startswith("admin/logs")
    if first_segment in api_routes or is_admin_api:
        raise HTTPException(status_code=404, detail="API endpoint not found")
        
    index_file = os.path.join(dist_path, "index.html")
    
    file_path = os.path.join(dist_path, catchall)
    if catchall and os.path.isfile(file_path):
        return FileResponse(file_path)
        
    if os.path.exists(index_file):
        return FileResponse(index_file)
    return {"message": "PulseSync: Frontend build not found. Please run 'npm run build' inside frontend directory to enable single-port hosting!"}


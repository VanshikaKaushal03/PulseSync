import json
import asyncio
from typing import Dict, Any, Callable
from starlette.websockets import WebSocket
from backend.database import get_redis

class DeliveryRouter:
    def __init__(self):
        # Store active connections
        # format: client_id -> {"type": "ws"|"sse", "connection": WebSocket|Queue, "filters": {}}
        self.clients: Dict[str, Dict[str, Any]] = {}
        
        # Metrics tracking
        self.metrics = {
            "dropped_events": 0,
            "reconnects": 0,
            "total_events_processed": 0,
            "latency_history": []
        }

    async def register_client_db(self, client_id: str, connection_type: str):
        """Insert or update a client in the 'clients' collection across all databases."""
        from backend.database import db
        if not db.client:
            return
        try:
            db_names = await db.client.list_database_names()
            target_db_names = [name for name in db_names if name not in ["admin", "config", "local"]]
            for db_name in target_db_names:
                target_db = db.client[db_name]
                await target_db["clients"].replace_one(
                    {"_id": client_id},
                    {"_id": client_id, "client_id": client_id, "connection_type": connection_type, "status": "connected"},
                    upsert=True
                )
        except Exception as e:
            print(f"Error registering client {client_id} to databases: {e}")

    async def unregister_client_db(self, client_id: str):
        """Remove a client from the 'clients' collection across all databases."""
        from backend.database import db
        if not db.client:
            return
        try:
            db_names = await db.client.list_database_names()
            target_db_names = [name for name in db_names if name not in ["admin", "config", "local"]]
            for db_name in target_db_names:
                target_db = db.client[db_name]
                await target_db["clients"].delete_one({"_id": client_id})
        except Exception as e:
            print(f"Error unregistering client {client_id} from databases: {e}")

    async def connect_ws(self, client_id: str, websocket: WebSocket, filters: Dict[str, Any] = None):
        await websocket.accept()
        self.clients[client_id] = {
            "type": "ws",
            "connection": websocket,
            "filters": filters or {}
        }
        print(f"WS Client {client_id} connected with filters: {filters}")
        await self.register_client_db(client_id, "websocket")

    async def connect_sse(self, client_id: str, queue: asyncio.Queue, filters: Dict[str, Any] = None):
        self.clients[client_id] = {
            "type": "sse",
            "connection": queue,
            "filters": filters or {}
        }
        print(f"SSE Client {client_id} connected with filters: {filters}")
        await self.register_client_db(client_id, "sse")

    def disconnect(self, client_id: str):
        if client_id in self.clients:
            del self.clients[client_id]
            self.metrics["reconnects"] += 1
            print(f"Client {client_id} disconnected")
            asyncio.create_task(self.unregister_client_db(client_id))

    def get_metrics(self):
        """Returns real-time queue depth and global delivery metrics"""
        queue_depths = []
        ws_count = 0
        sse_count = 0
        
        for client_id, data in self.clients.items():
            if data["type"] == "sse":
                sse_count += 1
                q: asyncio.Queue = data["connection"]
                queue_depths.append(q.qsize())
            elif data["type"] == "ws":
                ws_count += 1
                
        avg_queue_depth = sum(queue_depths) / len(queue_depths) if queue_depths else 0
        
        return {
            "active_connections": len(self.clients),
            "websocket_clients": ws_count,
            "sse_clients": sse_count,
            "avg_queue_depth": avg_queue_depth,
            "dropped_events": self.metrics["dropped_events"],
            "reconnects": self.metrics["reconnects"],
            "total_events_processed": self.metrics["total_events_processed"]
        }

    async def broadcast(self, event: Dict[str, Any]):
        """
        Broadcast an event to all matched clients.
        Instead of evaluating filters here, we could do it beforehand, but we'll do it here
        for simplicity since filters are per-client.
        """
        from backend.filter_engine import evaluate_filter
        from backend.event_processor import sanitize_for_json
        from datetime import datetime
        
        self.metrics["total_events_processed"] += 1
        
        try:
            event_ts = datetime.fromisoformat(event["timestamp"])
            latency = (datetime.utcnow() - event_ts).total_seconds() * 1000
            self.metrics["latency_history"].append(latency)
            if len(self.metrics["latency_history"]) > 100:
                self.metrics["latency_history"].pop(0)
        except:
            pass
        
        # Sanitize everything deeply right before broadcast to catch _full_state
        event = sanitize_for_json(event)
        
        # Publish to Redis for cross-instance scaling (optional but good for architecture)
        redis_client = get_redis()
        if redis_client:
            try:
                await redis_client.publish("global_events", json.dumps(event))
            except Exception as e:
                print(f"Redis publish error: {e}")

        # Local delivery
        dead_clients = []
        for client_id, client_data in self.clients.items():
            filters = client_data["filters"]
            role = client_data.get("role", "viewer")
            
            # Admins always receive admin_action events (system alerts/notifications)
            should_deliver = False
            if event.get("event_type") == "admin_action" and role == "admin":
                should_deliver = True
            elif evaluate_filter(event, filters):
                should_deliver = True
                
            if should_deliver:
                try:
                    # Strip _full_state so clients only see the delta
                    client_event = event.copy()
                    if "_full_state" in client_event:
                        del client_event["_full_state"]
                        
                    if client_data["type"] == "ws":
                        ws: WebSocket = client_data["connection"]
                        await ws.send_json(client_event)
                    elif client_data["type"] == "sse":
                        q: asyncio.Queue = client_data["connection"]
                        # Backpressure handling: if queue is full, we drop or delay
                        if q.qsize() < 100:
                            await q.put(client_event)
                        else:
                            self.metrics["dropped_events"] += 1
                            print(f"Backpressure! Queue full for SSE client {client_id}")
                except Exception as e:
                    self.metrics["dropped_events"] += 1
                    print(f"Failed to send to client {client_id}: {e}")
                    dead_clients.append(client_id)

        for client_id in dead_clients:
            self.disconnect(client_id)

router = DeliveryRouter()

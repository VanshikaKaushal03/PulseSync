# ⚡ PulseSync - Real-Time CDC Push & Event Sourcing Platform

PulseSync is a high-fidelity, production-ready real-time data synchronization system. It showcases a **Hybrid Push Architecture** leveraging MongoDB Change Streams (CDC), Event Sourcing, Redis pub/sub, and WebSockets/Server-Sent Events (SSE) to deliver instantaneous bidirectional updates between a customer catalog checkout and an administrative control panel.

---

## 🚀 Key Features

* **⚡ Real-Time Bidirectional Sync:** Place orders as a customer and watch them instantly trigger color-highlighted status columns on the Admin dashboard. Update status as Admin and see direct sliding toast notifications on the customer panel.
* **📦 Standardized MongoDB CDC:** Captures insertions and updates on the `orders` replicaSet collection and broadcasts JSON-standardized deltas down open channels.
* **💾 Persistent Event Sourcing:** Every status change is logged as an immutable history event inside the `events` collection to provide a complete, replayable audit trail.
* **🌐 Single-Port Production Hosting:** The entire compiled React SPA frontend is served directly by the FastAPI backend on port `8000`. No separate dev servers are required in production!
* **🎨 Premium Monochrome Aesthetic:** Features a high-contrast dark grey, white, and pure black layout with smooth micro-animations and custom telemetry dashboards.
* **🐳 Complete Dockerization:** Standard multi-stage containerized setup for all databases and web applications.

---

## 🛠️ Tech Stack Used

### Backend (Python)
* **FastAPI:** High-performance, asynchronous ASGI web framework.
* **Motor:** Asynchronous MongoDB driver with full ReplicaSet support.
* **Uvicorn:** Light, ultra-fast ASGI server.
* **Redis-py:** Async Redis driver for managing pub/sub.

### Frontend (React)
* **Vite + React (TypeScript):** Quick, typed component assembly.
* **TailwindCSS v4:** Styling tokens for modern, clean visual layouts.
* **Recharts:** High-contrast responsive data telemetry graphs.
* **React Flow:** Premium node flowchart for visualizing the backend CDC pipeline.
* **Lucide React:** Icon system.

### Databases & Infrastructure
* **MongoDB (ReplicaSet rs0):** Direct transaction and source databases.
* **Redis (v7.0):** Memory-broker for pub/sub events.

---

## ⚙️ Environment Variables & Configuration

The application is designed to run out-of-the-box using safe local defaults. However, you can configure it via environment variables or a local `.env` file in the project root:

| Variable | Description | Default Value |
| :--- | :--- | :--- |
| `MONGO_URI` | Connection URI for the MongoDB Replica Set | `mongodb://127.0.0.1:27018/?replicaSet=rs0` |
| `REDIS_URI` | Connection URI for the Redis broker | `redis://localhost:6379/0` |
| `DB_NAME` | Primary database name for CDC and users | `push_architecture_db` |

---

## 🐳 Running with Docker (Recommended)

Docker Compose sets up all services (MongoDB Primary with auto-configured ReplicaSet, Redis, FastAPI Backend, and Nginx Web Frontend) seamlessly.

### Step 1: Run the Containers
Ensure you have Docker and Docker Compose installed, then run:
```bash
docker-compose up --build
```

### Step 2: Open in your Browser
Once the build completes and MongoDB healthchecks verify a healthy ReplicaSet:
* **Admin Dashboard:** Visit [http://localhost:3000/admin/dashboard](http://localhost:3000/admin/dashboard)
  * **Email:** `admin@example.com`
  * **Password:** `admin123`
* **Bob's Customer Tracker:** Visit [http://localhost:3000/client/tracker](http://localhost:3000/client/tracker)
  * **Email:** `bob@example.com`
  * **Password:** `bob123`

---

## 💻 Running Natively (Local Dev Mode)

If you prefer to run the services natively on your local machine, follow these steps:

### 1. Pre-requisites
- **MongoDB 8.0+** installed (the script expects `mongod.exe` to be available at `C:\Program Files\MongoDB\Server\8.0\bin\`)
- **Python 3.11+** with virtual environment created (`venv`)
- **Node.js 20+** for the frontend

### 2. Start Services Locally
We have provided an automated startup script `start_local.ps1` that handles starting MongoDB (with replica set `rs0` on port `27018`), the FastAPI backend, and the Vite frontend.

```bash
# Run from the project root:
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
.\start_local.ps1
```

This will automatically open separate windows for the frontend and backend. You can then access:
* **Admin Dashboard:** [http://localhost:5173/admin/dashboard](http://localhost:5173/admin/dashboard)
* **Customer Tracker:** [http://localhost:5173/client/tracker](http://localhost:5173/client/tracker)
* **Backend API:** [http://localhost:8000](http://localhost:8000)

### 3. Standardize & Seed the Database
Ensure the product inventory, users, and default demo orders are standard and loaded. After the backend is running, execute:
```bash
# Activate virtualenv and run the demo seed scripts
.\venv\Scripts\python.exe backend/seed_demo.py
.\venv\Scripts\python.exe backend/seed_inventory.py
```
*Note: The seed script uses selective clearing, so any custom orders or simulated logs you generate will be fully preserved across script runs.*

### 4. Start the Background CDC Traffic Simulator (Optional)
To generate ongoing e-commerce transactions and see live real-time metrics spikes on the dashboard charts, run:
```bash
.\venv\Scripts\python.exe backend/simulate_traffic.py
```

---

## 🔒 Test Accounts & Roles

* **Primary Customer (Bob):** `bob@example.com` / `bob123`
* **Secondary Customer (Alice):** `alice@example.com` / `alice123`
* **Lead Administrator:** `admin@example.com` / `admin123`
* **Secondary Administrator (Multi-Admin Toast Sync Test):** `admin1@example.com` / `admin123`

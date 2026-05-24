import asyncio
import os
import random
from datetime import datetime, timedelta
from pymongo import MongoClient

def main():
    print("Connecting to MongoDB Replica Set on port 27018...")
    MONGO_URI = "mongodb://127.0.0.1:27018/?replicaSet=rs0&directConnection=true"
    client = MongoClient(MONGO_URI)
    
    # List of 10 highly realistic customer names and emails
    customers = [
        {"name": "Alice Johnson", "email": "alice@example.com", "tier": "Platinum"},
        {"name": "Bob Smith", "email": "bob@example.com", "tier": "Gold"},
        {"name": "Carol White", "email": "carol.w@example.com", "tier": "Silver"},
        {"name": "David Brown", "email": "david.b@example.com", "tier": "Regular"},
        {"name": "Eve Davis", "email": "eve.d@example.com", "tier": "Gold"},
        {"name": "Frank Miller", "email": "frank.m@example.com", "tier": "Platinum"},
        {"name": "Grace Wilson", "email": "grace.w@example.com", "tier": "Regular"},
        {"name": "Henry Taylor", "email": "henry.t@example.com", "tier": "Silver"},
        {"name": "Ivy Anderson", "email": "ivy.a@example.com", "tier": "Platinum"},
        {"name": "Jack Thomas", "email": "jack.t@example.com", "tier": "Gold"}
    ]
    
    # -------------------------------------------------------------------------
    # 1. 'test' Database (Global Orders DB)
    # -------------------------------------------------------------------------
    print("\n[1/4] Seeding 'test' (Global Orders Database)...")
    db_test = client["test"]
    db_test.orders.delete_many({}) # Clear old dummy
    db_test.dummy.delete_many({})
    
    products_list = [
        {"name": "MacBook Pro 16\"", "price": 2499.00},
        {"name": "iPhone 15 Pro Max", "price": 1199.00},
        {"name": "Sony Noise Cancelling Headphones", "price": 349.99},
        {"name": "Mechanical Keyboard Pro", "price": 189.50},
        {"name": "Ergonomic Office Chair", "price": 549.00},
        {"name": "UltraWide 34\" Monitor", "price": 699.99},
        {"name": "Anker USB-C Multi-Port Hub", "price": 79.99},
        {"name": "Smart Wireless Charger", "price": 45.00},
        {"name": "Logitech MX Master 3S Mouse", "price": 99.99},
        {"name": "Frictionless Desk Pad", "price": 29.99}
    ]
    
    orders_data = []
    for idx, customer in enumerate(customers):
        prod = products_list[idx]
        qty = random.randint(1, 3)
        total = round(prod["price"] * qty, 2)
        status = random.choice(["pending", "processing", "shipped", "delivered"])
        
        orders_data.append({
            "_id": f"ord_{100 + idx}",
            "customer_name": customer["name"],
            "customer_email": customer["email"],
            "product_name": prod["name"],
            "price": prod["price"],
            "quantity": qty,
            "total_amount": total,
            "status": status,
            "simulated": False,
            "priority": random.choice(["high", "medium", "low"]),
            "timestamp": datetime.utcnow() - timedelta(days=random.randint(1, 10)),
            "updated_at": datetime.utcnow()
        })
    
    db_test.orders.insert_many(orders_data)
    print(f"--> Successfully seeded {db_test.orders.count_documents({})} active customer orders!")
    
    # -------------------------------------------------------------------------
    # 2. 'inventory' Database (Inventory US DB)
    # -------------------------------------------------------------------------
    print("\n[2/4] Seeding 'inventory' (Inventory US Database)...")
    db_inv = client["inventory"]
    db_inv.products.delete_many({})
    db_inv.dummy.delete_many({})
    
    inventory_data = []
    suppliers = ["Apex Logistics", "Globex Tech Parts", "Summit Furnishings", "SoundWare Inc."]
    for idx, prod in enumerate(products_list):
        stock = random.randint(5, 120)
        safety_stock = 15
        
        inventory_data.append({
            "_id": f"sku_{5000 + idx}",
            "product_name": prod["name"],
            "sku": f"SKU-{prod['name'][:3].upper()}-{random.randint(1000, 9999)}",
            "current_stock": stock,
            "safety_stock_limit": safety_stock,
            "warehouse_aisle": f"Aisle {random.randint(1, 20)}-{random.choice(['L', 'R'])}",
            "supplier": random.choice(suppliers),
            "status": "In Stock" if stock > safety_stock else ("Low Stock" if stock > 0 else "Out of Stock"),
            "updated_at": datetime.utcnow()
        })
        
    db_inv.products.insert_many(inventory_data)
    print(f"--> Successfully seeded {db_inv.products.count_documents({})} active inventory product items!")

    # -------------------------------------------------------------------------
    # 3. 'users' Database (User Authentication / Accounts DB)
    # -------------------------------------------------------------------------
    print("\n[3/4] Seeding 'users' (User Authentication / Profiles Database)...")
    db_users = client["users"]
    db_users.profiles.delete_many({})
    db_users.dummy.delete_many({})
    
    profiles_data = []
    for idx, customer in enumerate(customers):
        profiles_data.append({
            "_id": f"usr_{800 + idx}",
            "customer_name": customer["name"],
            "email": customer["email"],
            "phone": f"+1 (555) {random.randint(100, 999)}-{random.randint(1000, 9999)}",
            "shipping_address": f"{random.randint(100, 9999)} Commerce Blvd, Suite {random.randint(1, 500)}, New York, NY",
            "role": "customer",
            "active_session": random.choice([True, False]),
            "two_factor_enabled": random.choice([True, False]),
            "created_at": datetime.utcnow() - timedelta(days=random.randint(30, 365))
        })
        
    db_users.profiles.insert_many(profiles_data)
    print(f"--> Successfully seeded {db_users.profiles.count_documents({})} active customer profile credentials!")

    # -------------------------------------------------------------------------
    # 4. 'analytics' Database (Analytics Cluster DB)
    # -------------------------------------------------------------------------
    print("\n[4/4] Seeding 'analytics' (Business Intelligence / Metrics Database)...")
    db_analytics = client["analytics"]
    db_analytics.customer_metrics.delete_many({})
    db_analytics.dummy.delete_many({})
    
    analytics_data = []
    for idx, customer in enumerate(customers):
        ltv = round(random.uniform(500.0, 15000.0), 2)
        analytics_data.append({
            "_id": f"an_{200 + idx}",
            "customer_name": customer["name"],
            "customer_email": customer["email"],
            "customer_tier": customer["tier"],
            "lifetime_value": ltv,
            "total_completed_orders": random.randint(3, 45),
            "customer_satisfaction_score": round(random.uniform(3.8, 5.0), 1),
            "marketing_email_opt_in": random.choice([True, False]),
            "open_support_tickets": random.randint(0, 2),
            "last_active_date": datetime.utcnow() - timedelta(hours=random.randint(1, 72))
        })
        
    db_analytics.customer_metrics.insert_many(analytics_data)
    print(f"--> Successfully seeded {db_analytics.customer_metrics.count_documents({})} customer intelligence profiles!")
    
    print("\n=======================================================")
    print("       ALL FOUR DATABASES SEEDED SUCCESSFULLY!         ")
    print("=======================================================")

if __name__ == "__main__":
    main()

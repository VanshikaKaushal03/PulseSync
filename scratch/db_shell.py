import os
import sys
from pymongo import MongoClient

def clear_screen():
    os.system('cls' if os.name == 'nt' else 'clear')

def main():
    MONGO_URI = "mongodb://127.0.0.1:27018/?replicaSet=rs0&directConnection=true"
    client = MongoClient(MONGO_URI)
    db = client["fastapi_cdc"]
    
    while True:
        clear_screen()
        print("=========================================")
        print("     🔥 PulseSync.STREAM DB SHELL 🔥     ")
        print("=========================================")
        print("1. View all seeded Users")
        print("2. View all active Orders")
        print("3. View past Change Events (Audit History)")
        print("4. View CDC Database Connections")
        print("5. [TEST CDC] Manually update an Order Status")
        print("6. Exit")
        print("=========================================")
        
        choice = input("Enter choice (1-6): ").strip()
        
        if choice == "1":
            print("\n--- Users List ---")
            for u in db.users.find({}, {"_id": 0}):
                print(f"Email: {u.get('email')}, Username: {u.get('username')}, Role: {u.get('role')}, Name: {u.get('customer_name')}")
            input("\nPress Enter to continue...")
        elif choice == "2":
            print("\n--- Orders ---")
            for o in db.orders.find():
                print(f"ID: {o.get('_id')}, Customer: {o.get('customer_name')}, Product: {o.get('product_name')}, Price: ${o.get('price')}, Status: {o.get('status')}")
            input("\nPress Enter to continue...")
        elif choice == "3":
            print("\n--- Past Change Events ---")
            for e in db.events.find().sort("timestamp", -1).limit(10):
                print(f"[{e.get('timestamp')}] Op: {e.get('operation')}, Doc: {e.get('document_id')}, Coll: {e.get('collection')}")
                if e.get("updated_fields"):
                    print(f"  Changes: {e.get('updated_fields')}")
            input("\nPress Enter to continue...")
        elif choice == "4":
            print("\n--- CDC Database Connections ---")
            for s in db.sources.find():
                print(f"Name: {s.get('name')}, DB: {s.get('db_name')}, Status: {s.get('status')}")
            input("\nPress Enter to continue...")
        elif choice == "5":
            print("\n--- [TEST CDC] Update Order Status ---")
            orders = list(db.orders.find())
            for idx, o in enumerate(orders):
                print(f"{idx + 1}. ID: {o.get('_id')} - {o.get('customer_name')}'s {o.get('product_name')} (Current: {o.get('status')})")
            
            try:
                sel = int(input(f"Select order to update (1-{len(orders)}): ")) - 1
                if 0 <= sel < len(orders):
                    order = orders[sel]
                    print("\nStatuses: 1. pending, 2. processing, 3. shipped, 4. delivered")
                    stat_idx = int(input("Select new status (1-4): ")) - 1
                    statuses = ["pending", "processing", "shipped", "delivered"]
                    if 0 <= stat_idx < 4:
                        new_status = statuses[stat_idx]
                        from datetime import datetime
                        db.orders.update_one(
                            {"_id": order["_id"]},
                            {"$set": {"status": new_status, "updated_at": datetime.utcnow()}}
                        )
                        print(f"\nSuccessfully updated {order.get('customer_name')}'s {order.get('product_name')} status to '{new_status}'!")
                        print("Watch your browser dashboard immediately to see it move in real-time!")
                    else:
                        print("Invalid status selection.")
                else:
                    print("Invalid order selection.")
            except Exception as e:
                print(f"Error: {e}")
            input("\nPress Enter to continue...")
        elif choice == "6":
            print("Exiting DB shell. Goodbye!")
            break
        else:
            input("Invalid choice. Press Enter to try again...")

if __name__ == "__main__":
    main()

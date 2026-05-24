import urllib.request
import json

def check():
    try:
        # Check /metrics
        req = urllib.request.urlopen("http://localhost:8000/metrics")
        metrics = json.loads(req.read().decode('utf-8'))
        print("--- METRICS ---")
        print(json.dumps(metrics, indent=2))
        
        # Check /replay
        req = urllib.request.urlopen("http://localhost:8000/replay?limit=5")
        events = json.loads(req.read().decode('utf-8'))
        print("\n--- REPLAY (LAST 5) ---")
        print(json.dumps(events, indent=2))
    except Exception as e:
        print("API Error:", e)

check()

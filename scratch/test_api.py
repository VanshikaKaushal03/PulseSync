import urllib.request
import json

try:
    with urllib.request.urlopen("http://localhost:8000/sources") as response:
        print("Status Code /sources:", response.getcode())
        print("Response /sources:", response.read().decode('utf-8')[:200])
except Exception as e:
    print("Error calling /sources:", e)

try:
    with urllib.request.urlopen("http://localhost:8000/inventory/products") as response:
        print("Status Code /inventory/products:", response.getcode())
        print("Response /inventory/products:", response.read().decode('utf-8')[:200])
except Exception as e:
    print("Error calling /inventory/products:", e)

import requests
import json
import traceback

# Config
url_base = "https://optimeal-126p.onrender.com/api/v1/listings"
donor_id = "04f6e263-7c6c-44b1-a835-d9b4620d3989"

print(f"--- Testing GET {url_base} ---")
try:
    response = requests.get(url_base)
    print(f"Status Code: {response.status_code}")
    print("Response Headers:")
    print(response.headers)
    print("Response Body len:", len(response.text))
except:
    traceback.print_exc()

print(f"\n--- Testing POST {url_base} ---")
payload = {
    "title": "Debug Bread",
    "food_category": "bakery",
    "quantity_kg": 1.0,
    "expires_at": "2026-02-12T17:00:00Z",
    "pickup_window_start": "2026-02-11T09:00:00Z",
    "pickup_window_end": "2026-02-12T17:00:00Z",
    "address": "Debug Address",
    "donor_id": donor_id,
    "location_lat": 24.9,
    "location_lng": 91.8,
    "requires_refrigeration": False,
    "allergens": []
}

try:
    response = requests.post(url_base, json=payload, headers={"Content-Type": "application/json"})
    print(f"Status Code: {response.status_code}")
    print("Response Headers:")
    print(response.headers)
    print("Response Body:")
    print(response.text)
except Exception as e:
    print("Request failed:")
    traceback.print_exc()

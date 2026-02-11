import requests
import json
import traceback

# Config
base_url = "https://optimeal-126p.onrender.com/api"

def create_charity():
    # 1. Create user via sync (will default to volunteer)
    print("1. Creating user via /auth/sync...")
    sync_url = f"{base_url}/auth/sync"
    sync_payload = {
        "email": "foodbank@test.com",
        "name": "Local Food Bank",
        "image_url": "https://ui-avatars.com/api/?name=Food+Bank",
        "provider": "credentials",
        "provider_id": "manual_123"
    }

    try:
        res = requests.post(sync_url, json=sync_payload)
        print(f"Sync Status: {res.status_code}")
        if res.status_code not in (200, 201):
            print(f"Failed to sync: {res.text}")
            return

        user_data = res.json()
        user_id = user_data["id"]
        print(f"User ID: {user_id}")
        
        # 2. Update role to charity
        print("2. Updating role to charity...")
        update_url = f"{base_url}/users/{user_id}"
        update_payload = {
            "role": "charity",
            "preferred_food_types": ["bakery", "produce", "mixed"]
        }
        
        res = requests.put(update_url, json=update_payload)
        print(f"Update Status: {res.status_code}")
        print("Response:", res.text)
        
        if res.status_code == 200:
            print("\nSUCCESS: Charity user created and updated!")
            
    except Exception as e:
        print("Request failed:")
        traceback.print_exc()

if __name__ == "__main__":
    create_charity()

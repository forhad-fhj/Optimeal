import asyncio
import os
import sys
import ssl
from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine

# Add parent directory to path to import db if needed, or just define URL
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Database URL
DATABASE_URL = os.getenv(
    "DATABASE_URL", 
    "postgresql+asyncpg://postgres:password@localhost:5434/optimeal"
)

# Fix URL for asyncpg if needed
if DATABASE_URL and DATABASE_URL.startswith("postgresql://"):
    DATABASE_URL = DATABASE_URL.replace("postgresql://", "postgresql+asyncpg://", 1)

# Remove sslmode and channel_binding from URL (asyncpg handles SSL differently)
if "?" in DATABASE_URL:
    base_url, params = DATABASE_URL.split("?", 1)
    param_list = params.split("&")
    # Filter out sslmode and channel_binding
    filtered_params = [p for p in param_list if not p.startswith("sslmode=") and not p.startswith("channel_binding=")]
    if filtered_params:
        DATABASE_URL = base_url + "?" + "&".join(filtered_params)
    else:
        DATABASE_URL = base_url

async def update_schema():
    print(f"Connecting to {DATABASE_URL}...")
    
    connect_args = {}
    # For NeonDB or any cloud Postgres, enable SSL
    if "neon.tech" in DATABASE_URL or "aws" in DATABASE_URL:
        ssl_context = ssl.create_default_context()
        ssl_context.check_hostname = False
        ssl_context.verify_mode = ssl.CERT_NONE
        connect_args["ssl"] = ssl_context

    engine = create_async_engine(DATABASE_URL, echo=True, connect_args=connect_args)

    async with engine.begin() as conn:
        print("Updating Users table...")
        await conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS reliability_score FLOAT DEFAULT 100.0;"))
        await conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS total_deliveries INTEGER DEFAULT 0;"))
        await conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS total_donations INTEGER DEFAULT 0;"))
        await conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS capacity_kg FLOAT;"))
        await conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS preferred_food_types JSON;"))
        await conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS is_available BOOLEAN DEFAULT FALSE;"))
        await conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS auth_provider VARCHAR;"))
        await conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS auth_provider_id VARCHAR;"))
        await conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT FALSE;"))

        print("Updating FoodListings table...")
        await conn.execute(text("ALTER TABLE food_listings ADD COLUMN IF NOT EXISTS assigned_volunteer_id UUID REFERENCES users(id);"))
        await conn.execute(text("ALTER TABLE food_listings ADD COLUMN IF NOT EXISTS assigned_charity_id UUID REFERENCES users(id);"))
        await conn.execute(text("ALTER TABLE food_listings ADD COLUMN IF NOT EXISTS requires_refrigeration BOOLEAN DEFAULT FALSE;"))
        await conn.execute(text("ALTER TABLE food_listings ADD COLUMN IF NOT EXISTS allergens JSON;"))
        await conn.execute(text("ALTER TABLE food_listings ADD COLUMN IF NOT EXISTS handling_instructions TEXT;"))
        await conn.execute(text("ALTER TABLE food_listings ADD COLUMN IF NOT EXISTS parent_listing_id UUID REFERENCES food_listings(id);"))
        await conn.execute(text("ALTER TABLE food_listings ADD COLUMN IF NOT EXISTS is_recurring BOOLEAN DEFAULT FALSE;"))
        await conn.execute(text("ALTER TABLE food_listings ADD COLUMN IF NOT EXISTS recurrence_pattern JSON;"))
        await conn.execute(text("ALTER TABLE food_listings ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT FALSE;"))

        print("Updating Deliveries table...")
        # Check if listing_ids exists, if not add it. ARRAY needs careful handling.
        try:
            await conn.execute(text("ALTER TABLE deliveries ADD COLUMN IF NOT EXISTS listing_ids UUID[];"))
        except Exception as e:
            print(f"Warning: Could not add listing_ids: {e}")
            
        await conn.execute(text("ALTER TABLE deliveries ADD COLUMN IF NOT EXISTS optimized_route_data JSON;"))
        await conn.execute(text("ALTER TABLE deliveries ADD COLUMN IF NOT EXISTS pickup_checklist JSON;"))
        await conn.execute(text("ALTER TABLE deliveries ADD COLUMN IF NOT EXISTS delivery_checklist JSON;"))

        print("Updating ImpactLogs table...")
        await conn.execute(text("ALTER TABLE impact_logs ADD COLUMN IF NOT EXISTS delivery_id UUID REFERENCES deliveries(id);"))
        await conn.execute(text("ALTER TABLE impact_logs ADD COLUMN IF NOT EXISTS area_lat FLOAT;"))
        await conn.execute(text("ALTER TABLE impact_logs ADD COLUMN IF NOT EXISTS area_lng FLOAT;"))

        print("Schema update complete!")

    await engine.dispose()

if __name__ == "__main__":
    asyncio.run(update_schema())

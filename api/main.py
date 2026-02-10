from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routers import users, auth, listings, routes, deliveries, matching, feedback, analytics
from db import engine, Base
import os

from sqlalchemy import text

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize database tables on startup
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    
    # Auto-migrate: add any missing columns (create_all doesn't add new columns to existing tables)
    async with engine.begin() as conn:
        try:
            # Users table migrations
            await conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS reliability_score FLOAT DEFAULT 100.0;"))
            await conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS total_deliveries INTEGER DEFAULT 0;"))
            await conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS total_donations INTEGER DEFAULT 0;"))
            await conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS capacity_kg FLOAT;"))
            await conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS preferred_food_types JSON;"))
            await conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS is_available BOOLEAN DEFAULT FALSE;"))
            await conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS auth_provider VARCHAR;"))
            await conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS auth_provider_id VARCHAR;"))
            await conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT FALSE;"))

            # FoodListings table migrations
            await conn.execute(text("ALTER TABLE food_listings ADD COLUMN IF NOT EXISTS assigned_volunteer_id UUID REFERENCES users(id);"))
            await conn.execute(text("ALTER TABLE food_listings ADD COLUMN IF NOT EXISTS assigned_charity_id UUID REFERENCES users(id);"))
            await conn.execute(text("ALTER TABLE food_listings ADD COLUMN IF NOT EXISTS requires_refrigeration BOOLEAN DEFAULT FALSE;"))
            await conn.execute(text("ALTER TABLE food_listings ADD COLUMN IF NOT EXISTS allergens JSON;"))
            await conn.execute(text("ALTER TABLE food_listings ADD COLUMN IF NOT EXISTS handling_instructions TEXT;"))
            await conn.execute(text("ALTER TABLE food_listings ADD COLUMN IF NOT EXISTS parent_listing_id UUID REFERENCES food_listings(id);"))
            await conn.execute(text("ALTER TABLE food_listings ADD COLUMN IF NOT EXISTS is_recurring BOOLEAN DEFAULT FALSE;"))
            await conn.execute(text("ALTER TABLE food_listings ADD COLUMN IF NOT EXISTS recurrence_pattern JSON;"))
            await conn.execute(text("ALTER TABLE food_listings ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT FALSE;"))
            await conn.execute(text("ALTER TABLE food_listings ADD COLUMN IF NOT EXISTS location_lat FLOAT;"))
            await conn.execute(text("ALTER TABLE food_listings ADD COLUMN IF NOT EXISTS location_lng FLOAT;"))

            # Deliveries table migrations
            try:
                await conn.execute(text("ALTER TABLE deliveries ADD COLUMN IF NOT EXISTS listing_ids UUID[];"))
            except Exception:
                pass
            await conn.execute(text("ALTER TABLE deliveries ADD COLUMN IF NOT EXISTS optimized_route_data JSON;"))
            await conn.execute(text("ALTER TABLE deliveries ADD COLUMN IF NOT EXISTS pickup_checklist JSON;"))
            await conn.execute(text("ALTER TABLE deliveries ADD COLUMN IF NOT EXISTS delivery_checklist JSON;"))

            # ImpactLogs table migrations
            await conn.execute(text("ALTER TABLE impact_logs ADD COLUMN IF NOT EXISTS delivery_id UUID REFERENCES deliveries(id);"))
            await conn.execute(text("ALTER TABLE impact_logs ADD COLUMN IF NOT EXISTS area_lat FLOAT;"))
            await conn.execute(text("ALTER TABLE impact_logs ADD COLUMN IF NOT EXISTS area_lng FLOAT;"))

            print("✅ Schema migration complete")
        except Exception as e:
            print(f"⚠️ Schema migration warning (tables may not exist yet): {e}")
    
    yield

app = FastAPI(
    title="OptiMeal API",
    description="Food rescue logistics platform API",
    version="1.0.0",
    lifespan=lifespan
)

# CORS — allow all origins for reliable cross-origin support
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Legacy routes (for backward compatibility)
app.include_router(users.router)
app.include_router(auth.router)

# V1 API routes
app.include_router(listings.router)
app.include_router(routes.router)
app.include_router(deliveries.router)
app.include_router(matching.router)
app.include_router(feedback.router)
app.include_router(analytics.router)

@app.get("/")
def read_root():
    return {"message": "OptiMeal API is running", "version": "1.0.0"}

@app.get("/health")
def health_check():
    return {"status": "healthy"}

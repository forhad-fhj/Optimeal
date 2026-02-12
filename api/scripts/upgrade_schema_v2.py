import asyncio
import os
import sys

# Add parent directory to path to import app modules
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text
from config import settings

async def upgrade_schema():
    """
    Applies schema changes for Phase 4:
    1. Create 'delivery_proofs' table
    2. Add gamification columns to 'users' table
    """
    print("⏳ Starting schema upgrade...")
    
    engine = create_async_engine(settings.DATABASE_URL)
    
    async with engine.begin() as conn:
        # 1. Create DeliveryProof table
        print("Creating delivery_proofs table...")
        await conn.execute(text("""
            CREATE TABLE IF NOT EXISTS delivery_proofs (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                delivery_id UUID REFERENCES deliveries(id),
                photo_url VARCHAR,
                signature_img_url VARCHAR,
                recipient_name VARCHAR,
                created_at TIMESTAMP DEFAULT NOW()
            );
        """))
        
        # 2. Add columns to users table if they don't exist
        print("Adding gamification columns to users table...")
        
        # Helper to add column safely
        async def add_column_if_not_exists(table, column, type_def):
            try:
                await conn.execute(text(f"ALTER TABLE {table} ADD COLUMN {column} {type_def}"))
                print(f"  - Added {column} to {table}")
            except Exception as e:
                # Ignore if column exists (Postgres error 42701)
                if '42701' in str(e): 
                    print(f"  - {column} already exists in {table}")
                else:
                    print(f"  - NOTE: Could not add {column} (might already exist)")

        await add_column_if_not_exists("users", "weekly_streak", "INTEGER DEFAULT 0")
        await add_column_if_not_exists("users", "last_delivery_date", "TIMESTAMP")
        await add_column_if_not_exists("users", "impact_score", "INTEGER DEFAULT 0")
        await add_column_if_not_exists("users", "verified_driver", "BOOLEAN DEFAULT FALSE")

    print("✅ Schema upgrade completed successfully!")
    await engine.dispose()

if __name__ == "__main__":
    asyncio.run(upgrade_schema())

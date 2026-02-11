import asyncio
import os
import sys
from sqlalchemy import select
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker

# Setup path to import api modules
sys.path.append(os.path.join(os.getcwd(), 'api'))

from api.models import User, UserRole
from api.db import DATABASE_URL

# Fix URL for asyncpg
if DATABASE_URL and DATABASE_URL.startswith("postgresql://"):
    DATABASE_URL = DATABASE_URL.replace("postgresql://", "postgresql+asyncpg://", 1)
    if "?" in DATABASE_URL:
        base_url, params = DATABASE_URL.split("?", 1)
        param_list = params.split("&")
        filtered_params = [p for p in param_list if not p.startswith("sslmode=") and not p.startswith("channel_binding=")]
        if filtered_params:
            DATABASE_URL = base_url + "?" + "&".join(filtered_params)
        else:
            DATABASE_URL = base_url

async def list_users():
    # SSL context for NeonDB
    connect_args = {}
    if "neon.tech" in DATABASE_URL:
        import ssl
        ssl_context = ssl.create_default_context()
        ssl_context.check_hostname = False
        ssl_context.verify_mode = ssl.CERT_NONE
        connect_args["ssl"] = ssl_context

    engine = create_async_engine(DATABASE_URL, echo=False, connect_args=connect_args)
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    async with async_session() as session:
        print("Checking tables...")
        from sqlalchemy import text
        result = await session.execute(text("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'"))
        tables = result.scalars().all()
        print(f"Tables found: {tables}")

        print("Executing raw SQL count...")
        result = await session.execute(text("SELECT COUNT(*) FROM users"))
        count = result.scalar()
        print(f"Raw SQL Count: {count}")

        print("Executing query...")
        result = await session.execute(select(User))
        users = result.scalars().all()
        
        print(f"Found {len(users)} users.")
        print("\n--- Current Users ---")
        for user in users:
            print(f"ID: {user.id} | Name: {user.name} | Role: {user.role} | Email: {user.email}")
        print("---------------------\n")

    await engine.dispose()

if __name__ == "__main__":
    asyncio.run(list_users())

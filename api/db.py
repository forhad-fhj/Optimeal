from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker, declarative_base
import os

# Database URL from environment (NeonDB in production, local in development)
# NeonDB format: postgresql+asyncpg://user:pass@host/dbname?sslmode=require
DATABASE_URL = os.getenv(
    "DATABASE_URL", 
    "postgresql+asyncpg://postgres:password@localhost:5434/optimeal"
)

# Create async engine with SSL support for production
connect_args = {}
if "neon.tech" in DATABASE_URL or "sslmode=require" in DATABASE_URL:
    connect_args["ssl"] = True

engine = create_async_engine(DATABASE_URL, echo=False, connect_args=connect_args)

AsyncSessionLocal = sessionmaker(
    engine, class_=AsyncSession, expire_on_commit=False
)

Base = declarative_base()

async def get_db():
    async with AsyncSessionLocal() as session:
        yield session


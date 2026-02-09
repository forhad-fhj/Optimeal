from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker, declarative_base
import os
import ssl

# Database URL from environment (NeonDB in production, local in development)
# NeonDB format: postgresql+asyncpg://user:pass@host/dbname?sslmode=require
DATABASE_URL = os.getenv(
    "DATABASE_URL", 
    "postgresql+asyncpg://postgres:password@localhost:5434/optimeal"
)

# Convert postgresql:// to postgresql+asyncpg:// if needed
if DATABASE_URL and DATABASE_URL.startswith("postgresql://"):
    DATABASE_URL = DATABASE_URL.replace("postgresql://", "postgresql+asyncpg://", 1)

# Remove sslmode and channel_binding from URL (asyncpg handles SSL differently)
if "?" in DATABASE_URL:
    base_url, params = DATABASE_URL.split("?", 1)
    param_list = params.split("&")
    filtered_params = [p for p in param_list if not p.startswith("sslmode=") and not p.startswith("channel_binding=")]
    if filtered_params:
        DATABASE_URL = base_url + "?" + "&".join(filtered_params)
    else:
        DATABASE_URL = base_url

# Create async engine with SSL support for production
connect_args = {}
if "neon.tech" in DATABASE_URL or "aws" in DATABASE_URL:
    ssl_context = ssl.create_default_context()
    ssl_context.check_hostname = False
    ssl_context.verify_mode = ssl.CERT_NONE
    connect_args["ssl"] = ssl_context

engine = create_async_engine(DATABASE_URL, echo=False, connect_args=connect_args)

AsyncSessionLocal = sessionmaker(
    engine, class_=AsyncSession, expire_on_commit=False
)

Base = declarative_base()

async def get_db():
    async with AsyncSessionLocal() as session:
        yield session


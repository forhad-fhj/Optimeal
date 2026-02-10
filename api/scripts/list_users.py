import asyncio
import sys
import os

# Add parent directory to path so we can import 'db' and 'models'
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import select
from db import AsyncSessionLocal
from models import User

async def list_users():
    async with AsyncSessionLocal() as session:
        result = await session.execute(select(User))
        users = result.scalars().all()
        
        print(f"Found {len(users)} users:")
        for user in users:
            print(f"- {user.email} (Role: {user.role}, ID: {user.id})")

if __name__ == "__main__":
    asyncio.run(list_users())

import asyncio
import sys
import os

# Add parent directory to path so we can import 'db' and 'models' as if running from api/
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import select
from db import AsyncSessionLocal
from models import User, UserRole

async def set_admin(email: str):
    async with AsyncSessionLocal() as session:
        result = await session.execute(select(User).where(User.email == email))
        user = result.scalars().first()
        
        if user:
            print(f"User found: {user.email}, Current Role: {user.role}")
            if user.role != UserRole.admin:
                user.role = UserRole.admin
                # Ensure user is not soft-deleted
                if user.is_deleted:
                    print("User was deleted, restoring...")
                    user.is_deleted = False
                    
                await session.commit()
                print(f"Successfully updated user {email} to admin role.")
            else:
                print(f"User {email} is already an admin.")
        else:
            print(f"User with email {email} not found in database.")

if __name__ == "__main__":
    email_to_promote = "forhadhasan1007@gmail.com"
    if len(sys.argv) > 1:
        email_to_promote = sys.argv[1]
    
    print(f"Promoting {email_to_promote} to admin...")
    asyncio.run(set_admin(email_to_promote))

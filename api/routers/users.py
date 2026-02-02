from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from db import get_db
from models import User
from schemas import UserResponse, UserBase
from pydantic import BaseModel
from typing import Optional

router = APIRouter(prefix="/api/users", tags=["users"])

class UserUpdate(BaseModel):
    name: Optional[str] = None
    role: Optional[str] = None
    phone: Optional[str] = None
    location_lat: Optional[float] = None
    location_lng: Optional[float] = None

@router.get("/{user_id}", response_model=UserResponse)
async def get_user(user_id: str, db: AsyncSession = Depends(get_db)):
    try:
        stmt = select(User).where(User.id == user_id)
        result = await db.execute(stmt)
        user = result.scalars().first()
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        return user
    except Exception as e:
         # Log error here if possible
         print(f"Error getting user: {e}")
         raise HTTPException(status_code=400, detail="Invalid ID or User Not Found")

@router.put("/{user_id}", response_model=UserResponse)
async def update_user(user_id: str, diff: UserUpdate, db: AsyncSession = Depends(get_db)):
    stmt = select(User).where(User.id == user_id)
    result = await db.execute(stmt)
    user = result.scalars().first()
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if diff.name is not None:
        user.name = diff.name
    if diff.role is not None:
        # Ensure lowercase for enum alignment
        user.role = diff.role.lower()
    if diff.phone is not None:
        user.phone = diff.phone
    if diff.location_lat is not None:
        user.location_lat = diff.location_lat
    if diff.location_lng is not None:
        user.location_lng = diff.location_lng
    
    try:
        await db.commit()
        await db.refresh(user)
    except Exception as e:
        print(f"Update failed: {e}")
        raise HTTPException(status_code=500, detail=f"Database update failed: {str(e)}")
        
    return user

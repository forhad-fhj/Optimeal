from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import and_
from typing import Optional, List
from uuid import UUID

from db import get_db
from models import User, UserRole
from schemas import UserResponse, UserUpdate, UserBrief

router = APIRouter(prefix="/api/users", tags=["users"])


@router.get("", response_model=List[UserResponse])
async def get_users(
    role: Optional[UserRole] = None,
    is_available: Optional[bool] = None,
    db: AsyncSession = Depends(get_db)
):
    """Get all users with optional filters"""
    conditions = [User.is_deleted == False]
    
    if role:
        conditions.append(User.role == role)
    
    if is_available is not None:
        conditions.append(User.is_available == is_available)
    
    stmt = select(User).where(and_(*conditions)).order_by(User.created_at.desc())
    result = await db.execute(stmt)
    users = result.scalars().all()
    
    return users


@router.get("/charities", response_model=List[UserBrief])
async def get_charities(db: AsyncSession = Depends(get_db)):
    """Get all charities for selection"""
    stmt = select(User).where(
        and_(
            User.role == UserRole.charity,
            User.is_deleted == False
        )
    ).order_by(User.name)
    
    result = await db.execute(stmt)
    charities = result.scalars().all()
    
    return charities


@router.get("/volunteers/available", response_model=List[UserBrief])
async def get_available_volunteers(db: AsyncSession = Depends(get_db)):
    """Get all available volunteers"""
    stmt = select(User).where(
        and_(
            User.role == UserRole.volunteer,
            User.is_available == True,
            User.is_deleted == False
        )
    ).order_by(User.reliability_score.desc())
    
    result = await db.execute(stmt)
    volunteers = result.scalars().all()
    
    return volunteers


@router.get("/{user_id}", response_model=UserResponse)
async def get_user(user_id: UUID, db: AsyncSession = Depends(get_db)):
    """Get a user by ID"""
    try:
        stmt = select(User).where(
            and_(
                User.id == user_id,
                User.is_deleted == False
            )
        )
        result = await db.execute(stmt)
        user = result.scalars().first()
        
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        return user
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid user ID format")


@router.put("/{user_id}", response_model=UserResponse)
async def update_user(user_id: UUID, update: UserUpdate, db: AsyncSession = Depends(get_db)):
    """Update a user's profile"""
    stmt = select(User).where(
        and_(
            User.id == user_id,
            User.is_deleted == False
        )
    )
    result = await db.execute(stmt)
    user = result.scalars().first()
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Apply updates
    update_dict = update.model_dump(exclude_unset=True)
    for field, value in update_dict.items():
        if field == "role" and value:
            # Ensure valid role transition
            value = value.value if hasattr(value, 'value') else value
        if field == "preferred_food_types" and value:
            # Convert enum list to string list for JSON storage
            value = [v.value if hasattr(v, 'value') else v for v in value]
        setattr(user, field, value)
    
    try:
        await db.commit()
        await db.refresh(user)
    except Exception as e:
        print(f"Update failed: {e}")
        raise HTTPException(status_code=500, detail=f"Database update failed: {str(e)}")
        
    return user


@router.put("/{user_id}/availability", response_model=UserResponse)
async def toggle_availability(
    user_id: UUID,
    is_available: bool,
    db: AsyncSession = Depends(get_db)
):
    """Toggle volunteer availability"""
    stmt = select(User).where(
        and_(
            User.id == user_id,
            User.role == UserRole.volunteer,
            User.is_deleted == False
        )
    )
    result = await db.execute(stmt)
    user = result.scalars().first()
    
    if not user:
        raise HTTPException(status_code=404, detail="Volunteer not found")
    
    user.is_available = is_available
    
    await db.commit()
    await db.refresh(user)
    
    return user


@router.delete("/{user_id}", status_code=204)
async def delete_user(user_id: UUID, db: AsyncSession = Depends(get_db)):
    """Soft delete a user"""
    stmt = select(User).where(
        and_(
            User.id == user_id,
            User.is_deleted == False
        )
    )
    result = await db.execute(stmt)
    user = result.scalars().first()
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    user.is_deleted = True
    
    await db.commit()
    
    return None

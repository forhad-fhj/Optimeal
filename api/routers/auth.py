from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from db import get_db
from models import User, UserRole
from schemas import AuthSyncRequest, UserResponse
from datetime import datetime

router = APIRouter(prefix="/api/auth", tags=["auth"])

@router.post("/sync", response_model=UserResponse)
async def sync_user(request: AuthSyncRequest, db: AsyncSession = Depends(get_db)):
    """Sync OAuth user with database - creates if new, updates if exists"""
    # Check if user exists by email
    stmt = select(User).where(User.email == request.email)
    result = await db.execute(stmt)
    user = result.scalars().first()
    
    if user:
        # Update details if changed
        user.image_url = request.image_url
        user.name = request.name
        user.auth_provider = request.provider
        user.auth_provider_id = request.provider_id
        user.updated_at = datetime.utcnow()
        # Don't overwrite role or id
    else:
        # Create new user with default volunteer role
        user = User(
            email=request.email,
            name=request.name,
            image_url=request.image_url,
            auth_provider=request.provider,
            auth_provider_id=request.provider_id,
            role=UserRole.volunteer,
            is_available=False,
            reliability_score=100.0,
            total_deliveries=0,
            total_donations=0,
            created_at=datetime.utcnow()
        )
        db.add(user)
    
    await db.commit()
    await db.refresh(user)
    return user


@router.get("/me", response_model=UserResponse)
async def get_current_user(
    email: str,
    db: AsyncSession = Depends(get_db)
):
    """Get current user by email (called from frontend with session email)"""
    stmt = select(User).where(User.email == email)
    result = await db.execute(stmt)
    user = result.scalars().first()
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    return user

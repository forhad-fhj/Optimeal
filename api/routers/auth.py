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
    # Check if user exists by email
    stmt = select(User).where(User.email == request.email)
    result = await db.execute(stmt)
    user = result.scalars().first()
    
    if user:
        # Update details if changed (e.g. image)
        user.image_url = request.image_url
        user.name = request.name # Update name just in case
        user.auth_provider = request.provider
        user.auth_provider_id = request.provider_id
        # Don't overwrite role or id
    else:
        # Create new user
        # Default role: volunteer (safest default)
        user = User(
            email=request.email,
            name=request.name,
            image_url=request.image_url,
            auth_provider=request.provider,
            auth_provider_id=request.provider_id,
            role=UserRole.volunteer,
            created_at=datetime.utcnow()
        )
        db.add(user)
    
    await db.commit()
    await db.refresh(user)
    return user

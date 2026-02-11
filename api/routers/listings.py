from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import and_, or_, func
from sqlalchemy.orm import selectinload
from typing import List, Optional
from datetime import datetime, timezone
from uuid import UUID
import math

from db import get_db
from models import FoodListing, User, ListingStatus, FoodCategory, UserRole
from schemas import (
    ListingCreate, ListingUpdate, ListingResponse, ListingBrief,
    NearbyListingsRequest, UserBrief, PaginatedResponse
)

router = APIRouter(prefix="/api/v1/listings", tags=["listings"])

# Constants for distance calculation
EARTH_RADIUS_KM = 6371.0


def haversine_distance(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    """Calculate distance between two points in kilometers using Haversine formula"""
    lat1_rad = math.radians(lat1)
    lat2_rad = math.radians(lat2)
    delta_lat = math.radians(lat2 - lat1)
    delta_lng = math.radians(lng2 - lng1)
    
    a = math.sin(delta_lat / 2) ** 2 + math.cos(lat1_rad) * math.cos(lat2_rad) * math.sin(delta_lng / 2) ** 2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    
    return EARTH_RADIUS_KM * c


@router.get("", response_model=List[ListingResponse])
async def get_listings(
    status: Optional[ListingStatus] = None,
    food_category: Optional[FoodCategory] = None,
    donor_id: Optional[UUID] = None,
    include_expired: bool = False,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db)
):
    """Get all listings with optional filters"""
    stmt = select(FoodListing).options(selectinload(FoodListing.donor))
    
    # Apply filters
    conditions = [FoodListing.is_deleted == False]
    
    if status:
        conditions.append(FoodListing.status == status)
    else:
        # Default to available listings
        conditions.append(FoodListing.status == ListingStatus.available)
    
    if food_category:
        conditions.append(FoodListing.food_category == food_category)
    
    if donor_id:
        conditions.append(FoodListing.donor_id == donor_id)
    
    if not include_expired:
        conditions.append(FoodListing.expires_at > datetime.utcnow())
    
    stmt = stmt.where(and_(*conditions))
    stmt = stmt.order_by(FoodListing.created_at.desc())
    stmt = stmt.offset((page - 1) * page_size).limit(page_size)
    
    result = await db.execute(stmt)
    listings = result.scalars().all()
    
    return listings


@router.get("/nearby", response_model=List[ListingResponse])
async def get_nearby_listings(
    lat: float = Query(..., description="Latitude"),
    lng: float = Query(..., description="Longitude"),
    radius_meters: float = Query(5000, description="Search radius in meters"),
    food_category: Optional[FoodCategory] = None,
    db: AsyncSession = Depends(get_db)
):
    """Get listings within a radius of the given coordinates"""
    radius_km = radius_meters / 1000.0
    
    # Get all available listings with location
    stmt = select(FoodListing).options(selectinload(FoodListing.donor)).where(
        and_(
            FoodListing.is_deleted == False,
            FoodListing.status == ListingStatus.available,
            FoodListing.expires_at > datetime.utcnow(),
            FoodListing.location_lat.isnot(None),
            FoodListing.location_lng.isnot(None)
        )
    )
    
    if food_category:
        stmt = stmt.where(FoodListing.food_category == food_category)
    
    result = await db.execute(stmt)
    all_listings = result.scalars().all()
    
    # Filter by distance (in production, use PostGIS for efficiency)
    nearby_listings = []
    for listing in all_listings:
        distance = haversine_distance(lat, lng, listing.location_lat, listing.location_lng)
        if distance <= radius_km:
            nearby_listings.append(listing)
    
    # Sort by distance
    nearby_listings.sort(key=lambda l: haversine_distance(lat, lng, l.location_lat, l.location_lng))
    
    return nearby_listings


@router.get("/donor/{donor_id}", response_model=List[ListingResponse])
async def get_donor_listings(
    donor_id: UUID,
    status: Optional[ListingStatus] = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db)
):
    """Get all listings for a specific donor"""
    stmt = select(FoodListing).options(selectinload(FoodListing.donor)).where(
        and_(
            FoodListing.donor_id == donor_id,
            FoodListing.is_deleted == False
        )
    )
    
    if status:
        stmt = stmt.where(FoodListing.status == status)
    
    stmt = stmt.order_by(FoodListing.created_at.desc())
    stmt = stmt.offset((page - 1) * page_size).limit(page_size)
    
    result = await db.execute(stmt)
    listings = result.scalars().all()
    
    return listings


@router.get("/{listing_id}", response_model=ListingResponse)
async def get_listing(listing_id: UUID, db: AsyncSession = Depends(get_db)):
    """Get a single listing by ID"""
    stmt = select(FoodListing).options(selectinload(FoodListing.donor)).where(
        and_(
            FoodListing.id == listing_id,
            FoodListing.is_deleted == False
        )
    )
    result = await db.execute(stmt)
    listing = result.scalars().first()
    
    if not listing:
        raise HTTPException(status_code=404, detail="Listing not found")
    
    return listing


@router.post("", response_model=ListingResponse, status_code=201)
async def create_listing(listing_data: ListingCreate, db: AsyncSession = Depends(get_db)):
    """Create a new food listing"""
    try:
        # Verify donor exists
        stmt = select(User).where(User.id == listing_data.donor_id)
        result = await db.execute(stmt)
        donor = result.scalars().first()
        
        if not donor:
            raise HTTPException(status_code=404, detail="Donor not found")
        
        # Auto-set role to donor if user doesn't have one yet (allow any user to donate)
        if donor.role not in (UserRole.donor, UserRole.admin):
            donor.role = UserRole.donor
        
        # Validate pickup window
        if listing_data.pickup_window_start >= listing_data.pickup_window_end:
            raise HTTPException(status_code=400, detail="Pickup window start must be before end")
        
        if listing_data.expires_at <= datetime.now(datetime.timezone.utc):
            raise HTTPException(status_code=400, detail="Expiration must be in the future")
        
        # Use donor's location if listing location not provided
        location_lat = listing_data.location_lat or donor.location_lat
        location_lng = listing_data.location_lng or donor.location_lng
        address = listing_data.address or donor.address
        
        listing = FoodListing(
            donor_id=listing_data.donor_id,
            title=listing_data.title,
            description=listing_data.description,
            food_category=listing_data.food_category,
            quantity_kg=listing_data.quantity_kg,
            expires_at=listing_data.expires_at,
            pickup_window_start=listing_data.pickup_window_start,
            pickup_window_end=listing_data.pickup_window_end,
            location_lat=location_lat,
            location_lng=location_lng,
            address=address,
            requires_refrigeration=listing_data.requires_refrigeration,
            allergens=listing_data.allergens,
            handling_instructions=listing_data.handling_instructions,
            is_recurring=listing_data.is_recurring,
            recurrence_pattern=listing_data.recurrence_pattern,
            status=ListingStatus.available
        )
        
        db.add(listing)
        
        # Update donor's total donations count
        donor.total_donations = (donor.total_donations or 0) + 1
        
        await db.commit()
        await db.refresh(listing)
        
        # Load donor relationship
        stmt = select(FoodListing).options(selectinload(FoodListing.donor)).where(FoodListing.id == listing.id)
        result = await db.execute(stmt)
        listing = result.scalars().first()
        
        return listing

    except HTTPException:
        # Re-raise HTTP exceptions so they propagate correctly
        raise
    except Exception as e:
        # Catch unexpected errors, log them, and return 500 with detail
        import traceback
        traceback.print_exc()
        # Rollback transaction if active
        try:
            await db.rollback()
        except:
            pass
        raise HTTPException(status_code=500, detail=f"Internal Server Error: {str(e)}")


@router.put("/{listing_id}", response_model=ListingResponse)
async def update_listing(
    listing_id: UUID,
    update_data: ListingUpdate,
    db: AsyncSession = Depends(get_db)
):
    """Update an existing listing"""
    stmt = select(FoodListing).where(
        and_(
            FoodListing.id == listing_id,
            FoodListing.is_deleted == False
        )
    )
    result = await db.execute(stmt)
    listing = result.scalars().first()
    
    if not listing:
        raise HTTPException(status_code=404, detail="Listing not found")
    
    # Only allow updates to available listings
    if listing.status not in [ListingStatus.available, ListingStatus.reserved]:
        raise HTTPException(
            status_code=400, 
            detail=f"Cannot update listing with status '{listing.status}'"
        )
    
    # Apply updates
    update_dict = update_data.model_dump(exclude_unset=True)
    for field, value in update_dict.items():
        setattr(listing, field, value)
    
    listing.updated_at = datetime.utcnow()
    
    await db.commit()
    await db.refresh(listing)
    
    # Load relationships
    stmt = select(FoodListing).options(selectinload(FoodListing.donor)).where(FoodListing.id == listing.id)
    result = await db.execute(stmt)
    listing = result.scalars().first()
    
    return listing


@router.delete("/{listing_id}", status_code=204)
async def delete_listing(listing_id: UUID, db: AsyncSession = Depends(get_db)):
    """Soft delete a listing"""
    stmt = select(FoodListing).where(
        and_(
            FoodListing.id == listing_id,
            FoodListing.is_deleted == False
        )
    )
    result = await db.execute(stmt)
    listing = result.scalars().first()
    
    if not listing:
        raise HTTPException(status_code=404, detail="Listing not found")
    
    # Check if listing is already in delivery
    if listing.status in [ListingStatus.picked_up, ListingStatus.delivered]:
        raise HTTPException(
            status_code=400,
            detail="Cannot delete listing that is already being delivered"
        )
    
    listing.is_deleted = True
    listing.status = ListingStatus.cancelled
    listing.updated_at = datetime.utcnow()
    
    await db.commit()
    
    return None


@router.post("/{listing_id}/cancel", response_model=ListingResponse)
async def cancel_listing(listing_id: UUID, db: AsyncSession = Depends(get_db)):
    """Cancel a listing (donor wants to withdraw it)"""
    stmt = select(FoodListing).options(selectinload(FoodListing.donor)).where(
        and_(
            FoodListing.id == listing_id,
            FoodListing.is_deleted == False
        )
    )
    result = await db.execute(stmt)
    listing = result.scalars().first()
    
    if not listing:
        raise HTTPException(status_code=404, detail="Listing not found")
    
    if listing.status in [ListingStatus.picked_up, ListingStatus.delivered]:
        raise HTTPException(
            status_code=400,
            detail="Cannot cancel listing that is already being delivered"
        )
    
    listing.status = ListingStatus.cancelled
    listing.updated_at = datetime.utcnow()
    
    await db.commit()
    await db.refresh(listing)
    
    return listing


@router.get("/stats/summary")
async def get_listing_stats(
    donor_id: Optional[UUID] = None,
    db: AsyncSession = Depends(get_db)
):
    """Get listing statistics"""
    base_conditions = [FoodListing.is_deleted == False]
    
    if donor_id:
        base_conditions.append(FoodListing.donor_id == donor_id)
    
    # Total listings
    stmt = select(func.count(FoodListing.id)).where(and_(*base_conditions))
    result = await db.execute(stmt)
    total = result.scalar() or 0
    
    # Active listings
    stmt = select(func.count(FoodListing.id)).where(
        and_(
            *base_conditions,
            FoodListing.status == ListingStatus.available,
            FoodListing.expires_at > datetime.utcnow()
        )
    )
    result = await db.execute(stmt)
    active = result.scalar() or 0
    
    # Delivered listings
    stmt = select(func.count(FoodListing.id)).where(
        and_(*base_conditions, FoodListing.status == ListingStatus.delivered)
    )
    result = await db.execute(stmt)
    delivered = result.scalar() or 0
    
    # Total kg saved
    stmt = select(func.sum(FoodListing.quantity_kg)).where(
        and_(*base_conditions, FoodListing.status == ListingStatus.delivered)
    )
    result = await db.execute(stmt)
    kg_saved = result.scalar() or 0.0
    
    return {
        "total_listings": total,
        "active_listings": active,
        "delivered_listings": delivered,
        "kg_saved": kg_saved,
        "estimated_meals": int(kg_saved * 2.5),  # Approximate meals per kg
        "co2_reduced_kg": kg_saved * 2.5  # CO2 reduction estimate
    }

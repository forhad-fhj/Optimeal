from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import and_
from sqlalchemy.orm import selectinload
from typing import List, Optional
from datetime import datetime
from uuid import UUID
import math

from db import get_db
from models import FoodListing, User, ListingStatus, UserRole, FoodCategory
from schemas import MatchingRequest, MatchingResult, MatchScore

router = APIRouter(prefix="/api/v1/matching", tags=["matching"])

# Matching weights
CHARITY_WEIGHTS = {
    "distance": 0.4,
    "capacity": 0.3,
    "food_type": 0.3
}

VOLUNTEER_WEIGHTS = {
    "availability": 0.3,
    "reliability": 0.4,
    "proximity": 0.3
}

EARTH_RADIUS_KM = 6371.0
MAX_DISTANCE_KM = 20.0  # Maximum matching distance


def haversine_distance(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    """Calculate distance between two points in kilometers"""
    lat1_rad = math.radians(lat1)
    lat2_rad = math.radians(lat2)
    delta_lat = math.radians(lat2 - lat1)
    delta_lng = math.radians(lng2 - lng1)
    
    a = math.sin(delta_lat / 2) ** 2 + math.cos(lat1_rad) * math.cos(lat2_rad) * math.sin(delta_lng / 2) ** 2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    
    return EARTH_RADIUS_KM * c


def calculate_distance_score(distance_km: float) -> float:
    """Convert distance to 0-100 score (closer = higher)"""
    if distance_km <= 0:
        return 100.0
    if distance_km >= MAX_DISTANCE_KM:
        return 0.0
    return max(0, 100 * (1 - distance_km / MAX_DISTANCE_KM))


def calculate_capacity_score(listing_kg: float, charity_capacity_kg: Optional[float]) -> float:
    """Score based on charity's remaining capacity"""
    if charity_capacity_kg is None:
        return 50.0  # Neutral if unknown
    if charity_capacity_kg <= 0:
        return 0.0
    if listing_kg <= charity_capacity_kg:
        return 100.0
    # Partial score if over capacity
    return max(0, 100 * (charity_capacity_kg / listing_kg))


def calculate_food_type_score(
    listing_category: FoodCategory,
    preferred_types: Optional[List[str]]
) -> float:
    """Score based on charity's food type preferences"""
    if not preferred_types:
        return 50.0  # Neutral if no preferences
    
    if listing_category.value in preferred_types:
        return 100.0
    
    # Partial score for mixed category
    if listing_category == FoodCategory.mixed:
        return 70.0
    
    return 30.0  # Low score for non-preferred types


def calculate_charity_score(
    listing: FoodListing,
    charity: User
) -> MatchScore:
    """Calculate overall match score for a charity"""
    if not charity.location_lat or not charity.location_lng:
        return None
    
    if not listing.location_lat or not listing.location_lng:
        return None
    
    distance_km = haversine_distance(
        listing.location_lat, listing.location_lng,
        charity.location_lat, charity.location_lng
    )
    
    if distance_km > MAX_DISTANCE_KM:
        return None
    
    # Calculate component scores
    distance_score = calculate_distance_score(distance_km)
    capacity_score = calculate_capacity_score(listing.quantity_kg, charity.capacity_kg)
    food_type_score = calculate_food_type_score(
        listing.food_category,
        charity.preferred_food_types
    )
    
    # Weighted total
    total_score = (
        CHARITY_WEIGHTS["distance"] * distance_score +
        CHARITY_WEIGHTS["capacity"] * capacity_score +
        CHARITY_WEIGHTS["food_type"] * food_type_score
    )
    
    return MatchScore(
        user_id=charity.id,
        user_name=charity.name,
        user_role=UserRole.charity,
        score=round(total_score, 2),
        distance_km=round(distance_km, 2),
        reliability_score=charity.reliability_score or 100.0,
        breakdown={
            "distance": round(distance_score, 2),
            "capacity": round(capacity_score, 2),
            "food_type": round(food_type_score, 2)
        }
    )


def calculate_volunteer_score(
    listing: FoodListing,
    charity: User,
    volunteer: User
) -> MatchScore:
    """Calculate overall match score for a volunteer"""
    if not volunteer.location_lat or not volunteer.location_lng:
        return None
    
    if not listing.location_lat or not listing.location_lng:
        return None
    
    # Distance to listing (pickup point)
    distance_km = haversine_distance(
        volunteer.location_lat, volunteer.location_lng,
        listing.location_lat, listing.location_lng
    )
    
    if distance_km > MAX_DISTANCE_KM:
        return None
    
    # Calculate component scores
    availability_score = 100.0 if volunteer.is_available else 0.0
    reliability_score = volunteer.reliability_score or 100.0
    proximity_score = calculate_distance_score(distance_km)
    
    # Weighted total
    total_score = (
        VOLUNTEER_WEIGHTS["availability"] * availability_score +
        VOLUNTEER_WEIGHTS["reliability"] * reliability_score +
        VOLUNTEER_WEIGHTS["proximity"] * proximity_score
    )
    
    return MatchScore(
        user_id=volunteer.id,
        user_name=volunteer.name,
        user_role=UserRole.volunteer,
        score=round(total_score, 2),
        distance_km=round(distance_km, 2),
        reliability_score=reliability_score,
        breakdown={
            "availability": round(availability_score, 2),
            "reliability": round(reliability_score, 2),
            "proximity": round(proximity_score, 2)
        }
    )


@router.get("/suggestions/{listing_id}", response_model=MatchingResult)
async def get_matching_suggestions(
    listing_id: UUID,
    max_results: int = 5,
    db: AsyncSession = Depends(get_db)
):
    """Get top matching suggestions for a listing without auto-assigning"""
    # Get listing
    stmt = select(FoodListing).where(
        and_(
            FoodListing.id == listing_id,
            FoodListing.status == ListingStatus.available,
            FoodListing.is_deleted == False
        )
    )
    result = await db.execute(stmt)
    listing = result.scalars().first()
    
    if not listing:
        raise HTTPException(status_code=404, detail="Listing not found or not available")
    
    # Get all active charities
    stmt = select(User).where(
        and_(
            User.role == UserRole.charity,
            User.is_deleted == False,
            User.location_lat.isnot(None),
            User.location_lng.isnot(None)
        )
    )
    result = await db.execute(stmt)
    charities = result.scalars().all()
    
    # Score charities
    charity_scores = []
    for charity in charities:
        score = calculate_charity_score(listing, charity)
        if score:
            charity_scores.append(score)
    
    # Sort by score descending
    charity_scores.sort(key=lambda x: x.score, reverse=True)
    
    # Get available volunteers
    stmt = select(User).where(
        and_(
            User.role == UserRole.volunteer,
            User.is_available == True,
            User.is_deleted == False,
            User.location_lat.isnot(None),
            User.location_lng.isnot(None)
        )
    )
    result = await db.execute(stmt)
    volunteers = result.scalars().all()
    
    # Score volunteers (using best charity as reference)
    best_charity = charities[0] if charities else None
    volunteer_scores = []
    for volunteer in volunteers:
        score = calculate_volunteer_score(listing, best_charity, volunteer)
        if score:
            volunteer_scores.append(score)
    
    # Sort by score descending
    volunteer_scores.sort(key=lambda x: x.score, reverse=True)
    
    return MatchingResult(
        listing_id=listing_id,
        best_charity=charity_scores[0] if charity_scores else None,
        best_volunteer=volunteer_scores[0] if volunteer_scores else None,
        alternative_charities=charity_scores[1:max_results] if len(charity_scores) > 1 else [],
        alternative_volunteers=volunteer_scores[1:max_results] if len(volunteer_scores) > 1 else []
    )


@router.post("/run/{listing_id}", response_model=MatchingResult)
async def run_matching(
    listing_id: UUID,
    auto_assign: bool = False,
    db: AsyncSession = Depends(get_db)
):
    """Run matching algorithm and optionally auto-assign"""
    # Get suggestions first
    result = await get_matching_suggestions(listing_id, max_results=5, db=db)
    
    if auto_assign and result.best_charity and result.best_volunteer:
        # Get listing and assign
        stmt = select(FoodListing).where(FoodListing.id == listing_id)
        db_result = await db.execute(stmt)
        listing = db_result.scalars().first()
        
        if listing and listing.status == ListingStatus.available:
            listing.assigned_charity_id = result.best_charity.user_id
            listing.assigned_volunteer_id = result.best_volunteer.user_id
            listing.status = ListingStatus.reserved
            listing.updated_at = datetime.utcnow()
            
            await db.commit()
    
    return result


@router.post("/batch")
async def run_batch_matching(
    listing_ids: List[UUID],
    auto_assign: bool = False,
    db: AsyncSession = Depends(get_db)
):
    """Run matching for multiple listings"""
    results = []
    
    for listing_id in listing_ids:
        try:
            result = await run_matching(listing_id, auto_assign, db)
            results.append({
                "listing_id": str(listing_id),
                "status": "success",
                "result": result
            })
        except HTTPException as e:
            results.append({
                "listing_id": str(listing_id),
                "status": "error",
                "error": e.detail
            })
    
    return {
        "processed": len(listing_ids),
        "results": results
    }


@router.post("/rerun")
async def rerun_matching_on_state_change(
    db: AsyncSession = Depends(get_db)
):
    """Re-run matching for all available listings (called when state changes)"""
    # Get all available listings without assignments
    stmt = select(FoodListing).where(
        and_(
            FoodListing.status == ListingStatus.available,
            FoodListing.is_deleted == False,
            FoodListing.assigned_volunteer_id.is_(None),
            FoodListing.expires_at > datetime.utcnow()
        )
    )
    result = await db.execute(stmt)
    listings = result.scalars().all()
    
    processed = 0
    for listing in listings:
        try:
            await run_matching(listing.id, auto_assign=False, db=db)
            processed += 1
        except Exception:
            continue
    
    return {
        "message": f"Re-ran matching for {processed} listings",
        "total_listings": len(listings)
    }

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import and_
from sqlalchemy.orm import selectinload
from typing import List, Optional
from datetime import datetime
from uuid import UUID
import math

from db import get_db
from models import FoodListing, User, Delivery, RouteAssignment, ListingStatus, RouteStatus, UserRole
from schemas import RouteRequest, RouteResponse, RoutePoint, RouteAssignmentResponse

router = APIRouter(prefix="/api/v1/routes", tags=["routes"])

# Constants
EARTH_RADIUS_KM = 6371.0
AVERAGE_SPEED_KMH = 30.0  # Average driving speed in urban areas


def haversine_distance(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    """Calculate distance between two points in kilometers"""
    lat1_rad = math.radians(lat1)
    lat2_rad = math.radians(lat2)
    delta_lat = math.radians(lat2 - lat1)
    delta_lng = math.radians(lng2 - lng1)
    
    a = math.sin(delta_lat / 2) ** 2 + math.cos(lat1_rad) * math.cos(lat2_rad) * math.sin(delta_lng / 2) ** 2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    
    return EARTH_RADIUS_KM * c


def calculate_optimal_route(
    start_lat: float,
    start_lng: float,
    pickup_points: List[dict],
    end_lat: float,
    end_lng: float
) -> tuple[List[RoutePoint], float, int]:
    """
    Calculate optimal route using nearest neighbor heuristic.
    In production, this would use NetworkX or OSRM for better optimization.
    
    Returns: (ordered_stops, total_distance_km, estimated_duration_minutes)
    """
    if not pickup_points:
        # Direct route to charity
        distance = haversine_distance(start_lat, start_lng, end_lat, end_lng)
        duration = int((distance / AVERAGE_SPEED_KMH) * 60) + 5  # Add 5 min buffer
        
        stops = [
            RoutePoint(
                type="start",
                lat=start_lat,
                lng=start_lng,
                order=0,
                name="Your Location"
            ),
            RoutePoint(
                type="dropoff",
                lat=end_lat,
                lng=end_lng,
                order=1,
                name="Charity Dropoff"
            )
        ]
        return stops, distance, duration
    
    # Nearest neighbor algorithm for TSP approximation
    remaining = pickup_points.copy()
    ordered_pickups = []
    current_lat, current_lng = start_lat, start_lng
    total_distance = 0.0
    
    while remaining:
        # Find nearest pickup
        nearest = None
        nearest_dist = float('inf')
        
        for point in remaining:
            dist = haversine_distance(current_lat, current_lng, point['lat'], point['lng'])
            if dist < nearest_dist:
                nearest_dist = dist
                nearest = point
        
        if nearest:
            remaining.remove(nearest)
            ordered_pickups.append(nearest)
            total_distance += nearest_dist
            current_lat, current_lng = nearest['lat'], nearest['lng']
    
    # Add distance to final destination (charity)
    final_distance = haversine_distance(current_lat, current_lng, end_lat, end_lng)
    total_distance += final_distance
    
    # Build route stops
    stops = [
        RoutePoint(
            type="start",
            lat=start_lat,
            lng=start_lng,
            order=0,
            name="Your Location"
        )
    ]
    
    for i, pickup in enumerate(ordered_pickups):
        stops.append(RoutePoint(
            type="pickup",
            lat=pickup['lat'],
            lng=pickup['lng'],
            listing_id=pickup.get('listing_id'),
            order=i + 1,
            name=pickup.get('title', f'Pickup {i + 1}'),
            address=pickup.get('address'),
            details={
                'quantity_kg': pickup.get('quantity_kg'),
                'pickup_window_end': pickup.get('pickup_window_end')
            }
        ))
    
    stops.append(RoutePoint(
        type="dropoff",
        lat=end_lat,
        lng=end_lng,
        order=len(ordered_pickups) + 1,
        name="Charity Dropoff"
    ))
    
    # Calculate estimated duration
    # Base driving time + 5 minutes per stop for loading/unloading
    driving_time = (total_distance / AVERAGE_SPEED_KMH) * 60
    stop_time = len(ordered_pickups) * 5 + 10  # 5 min per pickup, 10 min for dropoff
    estimated_duration = int(driving_time + stop_time)
    
    return stops, round(total_distance, 2), estimated_duration


@router.post("/optimize", response_model=RouteResponse)
async def optimize_route(request: RouteRequest, db: AsyncSession = Depends(get_db)):
    """Calculate optimized multi-stop route for pickup and delivery"""
    
    # Validate charity exists
    stmt = select(User).where(
        and_(
            User.id == request.charity_id,
            User.role == UserRole.charity,
            User.is_deleted == False
        )
    )
    result = await db.execute(stmt)
    charity = result.scalars().first()
    
    if not charity:
        raise HTTPException(status_code=404, detail="Charity not found")
    
    if not charity.location_lat or not charity.location_lng:
        raise HTTPException(status_code=400, detail="Charity location not set")
    
    # Get listings
    stmt = select(FoodListing).where(
        and_(
            FoodListing.id.in_(request.listing_ids),
            FoodListing.status == ListingStatus.available,
            FoodListing.is_deleted == False,
            FoodListing.location_lat.isnot(None),
            FoodListing.location_lng.isnot(None)
        )
    )
    result = await db.execute(stmt)
    listings = result.scalars().all()
    
    if len(listings) != len(request.listing_ids):
        raise HTTPException(
            status_code=400, 
            detail="Some listings are not available or don't have location data"
        )
    
    # Prepare pickup points
    pickup_points = [
        {
            'listing_id': listing.id,
            'lat': listing.location_lat,
            'lng': listing.location_lng,
            'title': listing.title,
            'address': listing.address,
            'quantity_kg': listing.quantity_kg,
            'pickup_window_end': listing.pickup_window_end.isoformat() if listing.pickup_window_end else None
        }
        for listing in listings
    ]
    
    # Calculate optimal route
    stops, total_distance, estimated_duration = calculate_optimal_route(
        start_lat=request.volunteer_lat,
        start_lng=request.volunteer_lng,
        pickup_points=pickup_points,
        end_lat=charity.location_lat,
        end_lng=charity.location_lng
    )
    
    return RouteResponse(
        stops=stops,
        total_distance_km=total_distance,
        estimated_duration_minutes=estimated_duration,
        polyline=None  # In production, generate encoded polyline for map display
    )


@router.get("/{route_id}", response_model=RouteAssignmentResponse)
async def get_route(route_id: UUID, db: AsyncSession = Depends(get_db)):
    """Get route assignment details"""
    stmt = select(RouteAssignment).where(RouteAssignment.id == route_id)
    result = await db.execute(stmt)
    route = result.scalars().first()
    
    if not route:
        raise HTTPException(status_code=404, detail="Route not found")
    
    return route


@router.post("/{route_id}/reoptimize", response_model=RouteResponse)
async def reoptimize_route(
    route_id: UUID,
    current_lat: float = Query(...),
    current_lng: float = Query(...),
    skip_listing_ids: Optional[List[UUID]] = Query(default=[]),
    db: AsyncSession = Depends(get_db)
):
    """Re-optimize route after a stop failure or skip"""
    stmt = select(RouteAssignment).where(RouteAssignment.id == route_id)
    result = await db.execute(stmt)
    route_assignment = result.scalars().first()
    
    if not route_assignment:
        raise HTTPException(status_code=404, detail="Route not found")
    
    # Get delivery to find remaining listings
    stmt = select(Delivery).where(Delivery.id == route_assignment.delivery_id)
    result = await db.execute(stmt)
    delivery = result.scalars().first()
    
    if not delivery:
        raise HTTPException(status_code=404, detail="Delivery not found")
    
    # Get charity location
    stmt = select(User).where(User.id == delivery.charity_id)
    result = await db.execute(stmt)
    charity = result.scalars().first()
    
    # Get remaining listings (exclude skipped)
    remaining_listing_ids = [lid for lid in delivery.listing_ids if lid not in skip_listing_ids]
    
    stmt = select(FoodListing).where(
        and_(
            FoodListing.id.in_(remaining_listing_ids),
            FoodListing.status.in_([ListingStatus.available, ListingStatus.reserved, ListingStatus.assigned]),
            FoodListing.is_deleted == False
        )
    )
    result = await db.execute(stmt)
    listings = result.scalars().all()
    
    # Prepare pickup points
    pickup_points = [
        {
            'listing_id': listing.id,
            'lat': listing.location_lat,
            'lng': listing.location_lng,
            'title': listing.title,
            'address': listing.address,
            'quantity_kg': listing.quantity_kg
        }
        for listing in listings
        if listing.location_lat and listing.location_lng
    ]
    
    # Calculate new optimal route from current position
    stops, total_distance, estimated_duration = calculate_optimal_route(
        start_lat=current_lat,
        start_lng=current_lng,
        pickup_points=pickup_points,
        end_lat=charity.location_lat,
        end_lng=charity.location_lng
    )
    
    # Update route assignment
    route_assignment.route_json = [stop.model_dump() for stop in stops]
    route_assignment.total_distance_km = total_distance
    route_assignment.estimated_duration_minutes = estimated_duration
    route_assignment.updated_at = datetime.utcnow()
    
    await db.commit()
    
    return RouteResponse(
        stops=stops,
        total_distance_km=total_distance,
        estimated_duration_minutes=estimated_duration
    )


@router.put("/{route_id}/status")
async def update_route_status(
    route_id: UUID,
    status: RouteStatus,
    db: AsyncSession = Depends(get_db)
):
    """Update route status"""
    stmt = select(RouteAssignment).where(RouteAssignment.id == route_id)
    result = await db.execute(stmt)
    route = result.scalars().first()
    
    if not route:
        raise HTTPException(status_code=404, detail="Route not found")
    
    route.status = status
    route.updated_at = datetime.utcnow()
    
    await db.commit()
    
    return {"message": "Route status updated", "status": status}

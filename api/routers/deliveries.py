from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import and_, func
from sqlalchemy.orm import selectinload
from typing import List, Optional
from datetime import datetime, timedelta
from uuid import UUID

from db import get_db
from models import (
    Delivery, FoodListing, User, RouteAssignment, ImpactLog,
    DeliveryStatus, ListingStatus, RouteStatus, UserRole
)
from schemas import (
    DeliveryCreate, DeliveryResponse, DeliveryStatusUpdate,
    DeliveryTrackingResponse, UserBrief, RoutePoint
)

router = APIRouter(prefix="/api/v1/deliveries", tags=["deliveries"])

# Conversion constants
MEALS_PER_KG = 2.5
CO2_PER_KG = 2.5


@router.get("", response_model=List[DeliveryResponse])
async def get_deliveries(
    status: Optional[DeliveryStatus] = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db)
):
    """Get all deliveries with optional status filter"""
    stmt = select(Delivery).options(
        selectinload(Delivery.volunteer),
        selectinload(Delivery.charity)
    )
    
    if status:
        stmt = stmt.where(Delivery.status == status)
    
    stmt = stmt.order_by(Delivery.created_at.desc())
    stmt = stmt.offset((page - 1) * page_size).limit(page_size)
    
    result = await db.execute(stmt)
    deliveries = result.scalars().all()
    
    return deliveries


@router.get("/volunteer/{volunteer_id}", response_model=List[DeliveryResponse])
async def get_volunteer_deliveries(
    volunteer_id: UUID,
    status: Optional[DeliveryStatus] = None,
    active_only: bool = False,
    db: AsyncSession = Depends(get_db)
):
    """Get deliveries for a specific volunteer"""
    conditions = [Delivery.volunteer_id == volunteer_id]
    
    if status:
        conditions.append(Delivery.status == status)
    elif active_only:
        # Active statuses
        active_statuses = [
            DeliveryStatus.assigned,
            DeliveryStatus.en_route_pickup,
            DeliveryStatus.picked_up,
            DeliveryStatus.en_route_delivery
        ]
        conditions.append(Delivery.status.in_(active_statuses))
    
    stmt = select(Delivery).options(
        selectinload(Delivery.volunteer),
        selectinload(Delivery.charity)
    ).where(and_(*conditions)).order_by(Delivery.created_at.desc())
    
    result = await db.execute(stmt)
    deliveries = result.scalars().all()
    
    return deliveries


@router.get("/charity/{charity_id}", response_model=List[DeliveryResponse])
async def get_charity_deliveries(
    charity_id: UUID,
    status: Optional[DeliveryStatus] = None,
    incoming_only: bool = False,
    db: AsyncSession = Depends(get_db)
):
    """Get deliveries for a specific charity"""
    conditions = [Delivery.charity_id == charity_id]
    
    if status:
        conditions.append(Delivery.status == status)
    elif incoming_only:
        # Incoming = en route or picked up
        incoming_statuses = [
            DeliveryStatus.en_route_pickup,
            DeliveryStatus.picked_up,
            DeliveryStatus.en_route_delivery
        ]
        conditions.append(Delivery.status.in_(incoming_statuses))
    
    stmt = select(Delivery).options(
        selectinload(Delivery.volunteer),
        selectinload(Delivery.charity)
    ).where(and_(*conditions)).order_by(Delivery.created_at.desc())
    
    result = await db.execute(stmt)
    deliveries = result.scalars().all()
    
    return deliveries


@router.get("/{delivery_id}", response_model=DeliveryResponse)
async def get_delivery(delivery_id: UUID, db: AsyncSession = Depends(get_db)):
    """Get a single delivery by ID"""
    stmt = select(Delivery).options(
        selectinload(Delivery.volunteer),
        selectinload(Delivery.charity)
    ).where(Delivery.id == delivery_id)
    
    result = await db.execute(stmt)
    delivery = result.scalars().first()
    
    if not delivery:
        raise HTTPException(status_code=404, detail="Delivery not found")
    
    return delivery


@router.post("", response_model=DeliveryResponse, status_code=201)
async def create_delivery(
    delivery_data: DeliveryCreate,
    db: AsyncSession = Depends(get_db)
):
    """Create a new delivery (claim listings for delivery)"""
    try:
        # Verify volunteer
        stmt = select(User).where(
            and_(
                User.id == delivery_data.volunteer_id,
                User.role == UserRole.volunteer,
                User.is_deleted == False
            )
        )
        result = await db.execute(stmt)
        volunteer = result.scalars().first()
        
        if not volunteer:
            raise HTTPException(status_code=404, detail="Volunteer not found")
        
        # Auto-fix: if checking availability from backend, ensuring we don't block if they just went online
        # But for strictness, valid.
        if not volunteer.is_available:
            raise HTTPException(status_code=400, detail="Volunteer is not available")
        
        # Verify charity
        stmt = select(User).where(
            and_(
                User.id == delivery_data.charity_id,
                User.role == UserRole.charity,
                User.is_deleted == False
            )
        )
        result = await db.execute(stmt)
        charity = result.scalars().first()
        
        if not charity:
            raise HTTPException(status_code=404, detail="Charity not found")
        
        # Verify and reserve listings
        stmt = select(FoodListing).where(
            and_(
                FoodListing.id.in_(delivery_data.listing_ids),
                FoodListing.status == ListingStatus.available,
                FoodListing.is_deleted == False
            )
        )
        result = await db.execute(stmt)
        listings = result.scalars().all()
        
        if len(listings) != len(delivery_data.listing_ids):
            raise HTTPException(
                status_code=400,
                detail="Some listings are not available"
            )
        
        # Calculate ETAs based on route data
        pickup_eta = None
        delivery_eta = None
        total_distance = None
        estimated_duration = None
        
        if delivery_data.optimized_route_data:
            # Sum distances from route
            estimated_duration = len(delivery_data.optimized_route_data) * 15  # 15 min per stop estimate
            pickup_eta = datetime.utcnow() + timedelta(minutes=15)
            delivery_eta = datetime.utcnow() + timedelta(minutes=estimated_duration)
        
        # Create delivery
        from fastapi.encoders import jsonable_encoder
        
        delivery = Delivery(
            volunteer_id=delivery_data.volunteer_id,
            charity_id=delivery_data.charity_id,
            listing_ids=[lid for lid in delivery_data.listing_ids],
            optimized_route_data=jsonable_encoder(delivery_data.optimized_route_data) if delivery_data.optimized_route_data else None,
            status=DeliveryStatus.assigned,
            pickup_eta=pickup_eta,
            delivery_eta=delivery_eta,
            total_distance_km=total_distance,
            estimated_duration_minutes=estimated_duration
        )
        
        db.add(delivery)
        await db.flush()  # Generate delivery.id before using it for route_assignment
        
        # Update listings status
        for listing in listings:
            listing.status = ListingStatus.assigned
            listing.assigned_volunteer_id = delivery_data.volunteer_id
            listing.assigned_charity_id = delivery_data.charity_id
            listing.updated_at = datetime.utcnow()
        
        # Create route assignment if route data provided
        if delivery_data.optimized_route_data:
            route_assignment = RouteAssignment(
                delivery_id=delivery.id,
                volunteer_id=delivery_data.volunteer_id,
                route_json=jsonable_encoder(delivery_data.optimized_route_data),
                total_distance_km=total_distance or 0,
                estimated_duration_minutes=estimated_duration or 0,
                status=RouteStatus.planned
            )
            db.add(route_assignment)
        
        await db.commit()
        await db.refresh(delivery)
        
        # Load relationships
        stmt = select(Delivery).options(
            selectinload(Delivery.volunteer),
            selectinload(Delivery.charity)
        ).where(Delivery.id == delivery.id)
        result = await db.execute(stmt)
        delivery = result.scalars().first()
        
        return delivery

    except HTTPException:
        raise
    except Exception as e:
        import traceback
        traceback.print_exc()
        try:
            await db.rollback()
        except:
            pass
        raise HTTPException(status_code=500, detail=f"Internal Server Error: {str(e)}")


@router.put("/{delivery_id}/status", response_model=DeliveryResponse)
async def update_delivery_status(
    delivery_id: UUID,
    update: DeliveryStatusUpdate,
    db: AsyncSession = Depends(get_db)
):
    """Update delivery status"""
    stmt = select(Delivery).where(Delivery.id == delivery_id)
    result = await db.execute(stmt)
    delivery = result.scalars().first()
    
    if not delivery:
        raise HTTPException(status_code=404, detail="Delivery not found")
    
    # Validate status transition
    valid_transitions = {
        DeliveryStatus.pending: [DeliveryStatus.assigned, DeliveryStatus.cancelled],
        DeliveryStatus.assigned: [DeliveryStatus.en_route_pickup, DeliveryStatus.cancelled],
        DeliveryStatus.en_route_pickup: [DeliveryStatus.picked_up, DeliveryStatus.failed],
        DeliveryStatus.picked_up: [DeliveryStatus.en_route_delivery, DeliveryStatus.failed],
        DeliveryStatus.en_route_delivery: [DeliveryStatus.delivered, DeliveryStatus.failed],
        DeliveryStatus.delivered: [DeliveryStatus.confirmed],
        DeliveryStatus.confirmed: [],
        DeliveryStatus.failed: [],
        DeliveryStatus.cancelled: []
    }
    
    if update.status not in valid_transitions.get(delivery.status, []):
        raise HTTPException(
            status_code=400,
            detail=f"Cannot transition from {delivery.status} to {update.status}"
        )
    
    # Update delivery
    delivery.status = update.status
    delivery.updated_at = datetime.utcnow()
    
    if update.notes:
        delivery.volunteer_notes = update.notes
    
    if update.checklist:
        if update.status == DeliveryStatus.picked_up:
            delivery.pickup_checklist = update.checklist
            delivery.actual_pickup_time = datetime.utcnow()
        elif update.status == DeliveryStatus.delivered:
            delivery.delivery_checklist = update.checklist
            delivery.actual_delivery_time = datetime.utcnow()
    
    # Update listings status based on delivery status
    if update.status == DeliveryStatus.picked_up:
        stmt_listings = select(FoodListing).where(FoodListing.id.in_(delivery.listing_ids))
        result = await db.execute(stmt_listings)
        listings = result.scalars().all()
        for listing in listings:
            listing.status = ListingStatus.picked_up
            listing.updated_at = datetime.utcnow()
    
    elif update.status == DeliveryStatus.delivered:
        stmt_listings = select(FoodListing).where(FoodListing.id.in_(delivery.listing_ids))
        result = await db.execute(stmt_listings)
        listings = result.scalars().all()
        
        total_kg = 0.0
        for listing in listings:
            listing.status = ListingStatus.delivered
            listing.updated_at = datetime.utcnow()
            total_kg += listing.quantity_kg
        
        delivery.completed_at = datetime.utcnow()
        
        # Create impact log
        impact_log = ImpactLog(
            user_id=delivery.volunteer_id,
            delivery_id=delivery.id,
            kg_saved=total_kg,
            meals_rescued=int(total_kg * MEALS_PER_KG),
            co2_reduced_kg=total_kg * CO2_PER_KG
        )
        db.add(impact_log)
        
        # Update volunteer stats
        stmt_volunteer = select(User).where(User.id == delivery.volunteer_id)
        result = await db.execute(stmt_volunteer)
        volunteer = result.scalars().first()
        if volunteer:
            volunteer.total_deliveries = (volunteer.total_deliveries or 0) + 1
    
    elif update.status == DeliveryStatus.failed:
        # Revert listings to available
        stmt_listings = select(FoodListing).where(FoodListing.id.in_(delivery.listing_ids))
        result = await db.execute(stmt_listings)
        listings = result.scalars().all()
        for listing in listings:
            listing.status = ListingStatus.available
            listing.assigned_volunteer_id = None
            listing.assigned_charity_id = None
            listing.updated_at = datetime.utcnow()
    
    # Update route assignment status
    stmt_route = select(RouteAssignment).where(RouteAssignment.delivery_id == delivery.id)
    result = await db.execute(stmt_route)
    route = result.scalars().first()
    if route:
        if update.status in [DeliveryStatus.en_route_pickup, DeliveryStatus.picked_up, DeliveryStatus.en_route_delivery]:
            route.status = RouteStatus.active
        elif update.status == DeliveryStatus.delivered:
            route.status = RouteStatus.completed
        elif update.status == DeliveryStatus.failed:
            route.status = RouteStatus.failed
        route.updated_at = datetime.utcnow()
    
    await db.commit()
    
    # Load relationships
    stmt = select(Delivery).options(
        selectinload(Delivery.volunteer),
        selectinload(Delivery.charity)
    ).where(Delivery.id == delivery.id)
    result = await db.execute(stmt)
    delivery = result.scalars().first()
    
    return delivery


@router.put("/{delivery_id}/confirm", response_model=DeliveryResponse)
async def confirm_delivery(
    delivery_id: UUID,
    notes: Optional[str] = None,
    db: AsyncSession = Depends(get_db)
):
    """Charity confirms receipt of delivery"""
    stmt = select(Delivery).where(Delivery.id == delivery_id)
    result = await db.execute(stmt)
    delivery = result.scalars().first()
    
    if not delivery:
        raise HTTPException(status_code=404, detail="Delivery not found")
    
    if delivery.status != DeliveryStatus.delivered:
        raise HTTPException(
            status_code=400,
            detail="Can only confirm deliveries with 'delivered' status"
        )
    
    delivery.status = DeliveryStatus.confirmed
    delivery.charity_confirmed = True
    delivery.charity_notes = notes
    delivery.updated_at = datetime.utcnow()
    
    await db.commit()
    
    # Load relationships
    stmt = select(Delivery).options(
        selectinload(Delivery.volunteer),
        selectinload(Delivery.charity)
    ).where(Delivery.id == delivery.id)
    result = await db.execute(stmt)
    delivery = result.scalars().first()
    
    return delivery


@router.get("/{delivery_id}/track", response_model=DeliveryTrackingResponse)
async def track_delivery(delivery_id: UUID, db: AsyncSession = Depends(get_db)):
    """Get real-time tracking data for a delivery"""
    stmt = select(Delivery).options(
        selectinload(Delivery.route_assignment)
    ).where(Delivery.id == delivery_id)
    
    result = await db.execute(stmt)
    delivery = result.scalars().first()
    
    if not delivery:
        raise HTTPException(status_code=404, detail="Delivery not found")
    
    # In production, this would fetch real-time location from volunteer's device
    # For now, return the latest known data
    
    total_stops = 0
    current_stop = 0
    
    if delivery.route_assignment:
        route_data = delivery.route_assignment.route_json
        if route_data:
            total_stops = len(route_data)
            # Estimate current stop based on status
            if delivery.status == DeliveryStatus.en_route_pickup:
                current_stop = 1
            elif delivery.status == DeliveryStatus.picked_up:
                current_stop = len([s for s in route_data if s.get('type') == 'pickup'])
            elif delivery.status == DeliveryStatus.en_route_delivery:
                current_stop = total_stops - 1
            elif delivery.status == DeliveryStatus.delivered:
                current_stop = total_stops
    
    return DeliveryTrackingResponse(
        delivery_id=delivery.id,
        status=delivery.status,
        volunteer_location=None,  # Would be real-time in production
        pickup_eta=delivery.pickup_eta,
        delivery_eta=delivery.delivery_eta,
        current_stop=current_stop,
        total_stops=total_stops
    )


@router.get("/stats/summary")
async def get_delivery_stats(
    user_id: Optional[UUID] = None,
    role: Optional[str] = None,
    db: AsyncSession = Depends(get_db)
):
    """Get delivery statistics"""
    base_conditions = []
    
    if user_id and role:
        if role == "volunteer":
            base_conditions.append(Delivery.volunteer_id == user_id)
        elif role == "charity":
            base_conditions.append(Delivery.charity_id == user_id)
    
    # Total deliveries
    stmt = select(func.count(Delivery.id))
    if base_conditions:
        stmt = stmt.where(and_(*base_conditions))
    result = await db.execute(stmt)
    total = result.scalar() or 0
    
    # Completed deliveries
    completed_conditions = base_conditions + [Delivery.status.in_([DeliveryStatus.delivered, DeliveryStatus.confirmed])]
    stmt = select(func.count(Delivery.id)).where(and_(*completed_conditions))
    result = await db.execute(stmt)
    completed = result.scalar() or 0
    
    # Active deliveries
    active_statuses = [
        DeliveryStatus.assigned,
        DeliveryStatus.en_route_pickup,
        DeliveryStatus.picked_up,
        DeliveryStatus.en_route_delivery
    ]
    active_conditions = base_conditions + [Delivery.status.in_(active_statuses)]
    stmt = select(func.count(Delivery.id)).where(and_(*active_conditions))
    result = await db.execute(stmt)
    active = result.scalar() or 0
    
    # Failed deliveries
    failed_conditions = base_conditions + [Delivery.status == DeliveryStatus.failed]
    stmt = select(func.count(Delivery.id)).where(and_(*failed_conditions))
    result = await db.execute(stmt)
    failed = result.scalar() or 0
    
    return {
        "total_deliveries": total,
        "completed_deliveries": completed,
        "active_deliveries": active,
        "failed_deliveries": failed,
        "success_rate": round((completed / total * 100), 1) if total > 0 else 0
    }

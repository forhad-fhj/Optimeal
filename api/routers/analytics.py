from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import and_, func, extract
from typing import List, Optional
from datetime import datetime, timedelta
from uuid import UUID

from db import get_db
from models import (
    User, FoodListing, Delivery, ImpactLog,
    UserRole, ListingStatus, DeliveryStatus
)
from schemas import (
    ImpactSummary, AreaImpact, PlatformAnalytics,
    TrendResponse, TrendDataPoint
)

router = APIRouter(prefix="/api/v1/analytics", tags=["analytics"])


@router.get("/platform", response_model=PlatformAnalytics)
async def get_platform_analytics(db: AsyncSession = Depends(get_db)):
    """Get overall platform statistics"""
    # User counts
    stmt = select(func.count(User.id)).where(User.is_deleted == False)
    result = await db.execute(stmt)
    total_users = result.scalar() or 0
    
    stmt = select(func.count(User.id)).where(
        and_(User.role == UserRole.donor, User.is_deleted == False)
    )
    result = await db.execute(stmt)
    total_donors = result.scalar() or 0
    
    stmt = select(func.count(User.id)).where(
        and_(User.role == UserRole.volunteer, User.is_deleted == False)
    )
    result = await db.execute(stmt)
    total_volunteers = result.scalar() or 0
    
    stmt = select(func.count(User.id)).where(
        and_(User.role == UserRole.charity, User.is_deleted == False)
    )
    result = await db.execute(stmt)
    total_charities = result.scalar() or 0
    
    # Listing counts
    stmt = select(func.count(FoodListing.id)).where(FoodListing.is_deleted == False)
    result = await db.execute(stmt)
    total_listings = result.scalar() or 0
    
    stmt = select(func.count(FoodListing.id)).where(
        and_(
            FoodListing.status == ListingStatus.available,
            FoodListing.is_deleted == False,
            FoodListing.expires_at > datetime.utcnow()
        )
    )
    result = await db.execute(stmt)
    active_listings = result.scalar() or 0
    
    # Delivery counts
    stmt = select(func.count(Delivery.id))
    result = await db.execute(stmt)
    total_deliveries = result.scalar() or 0
    
    stmt = select(func.count(Delivery.id)).where(
        Delivery.status.in_([DeliveryStatus.delivered, DeliveryStatus.confirmed])
    )
    result = await db.execute(stmt)
    completed_deliveries = result.scalar() or 0
    
    # Impact totals
    stmt = select(
        func.sum(ImpactLog.meals_rescued),
        func.sum(ImpactLog.kg_saved),
        func.sum(ImpactLog.co2_reduced_kg)
    )
    result = await db.execute(stmt)
    row = result.first()
    total_meals = row[0] or 0
    total_kg = row[1] or 0.0
    total_co2 = row[2] or 0.0
    
    return PlatformAnalytics(
        total_users=total_users,
        total_donors=total_donors,
        total_volunteers=total_volunteers,
        total_charities=total_charities,
        total_listings=total_listings,
        active_listings=active_listings,
        total_deliveries=total_deliveries,
        completed_deliveries=completed_deliveries,
        total_meals_rescued=int(total_meals),
        total_kg_saved=round(total_kg, 1),
        total_co2_reduced_kg=round(total_co2, 1)
    )


@router.get("/impact", response_model=ImpactSummary)
async def get_impact_summary(
    user_id: Optional[UUID] = None,
    days: int = Query(30, ge=1, le=365),
    db: AsyncSession = Depends(get_db)
):
    """Get impact summary for platform or specific user"""
    period_start = datetime.utcnow() - timedelta(days=days)
    
    conditions = [ImpactLog.created_at >= period_start]
    
    if user_id:
        conditions.append(ImpactLog.user_id == user_id)
    
    stmt = select(
        func.sum(ImpactLog.meals_rescued),
        func.sum(ImpactLog.kg_saved),
        func.sum(ImpactLog.co2_reduced_kg),
        func.count(ImpactLog.id)
    ).where(and_(*conditions))
    
    result = await db.execute(stmt)
    row = result.first()
    
    return ImpactSummary(
        total_meals_rescued=int(row[0] or 0),
        total_kg_saved=round(row[1] or 0.0, 1),
        total_co2_reduced_kg=round(row[2] or 0.0, 1),
        total_deliveries=int(row[3] or 0),
        period_start=period_start,
        period_end=datetime.utcnow()
    )


@router.get("/impact/user/{user_id}", response_model=ImpactSummary)
async def get_user_impact(
    user_id: UUID,
    db: AsyncSession = Depends(get_db)
):
    """Get lifetime impact for a specific user"""
    stmt = select(
        func.sum(ImpactLog.meals_rescued),
        func.sum(ImpactLog.kg_saved),
        func.sum(ImpactLog.co2_reduced_kg),
        func.count(ImpactLog.id)
    ).where(ImpactLog.user_id == user_id)
    
    result = await db.execute(stmt)
    row = result.first()
    
    return ImpactSummary(
        total_meals_rescued=int(row[0] or 0),
        total_kg_saved=round(row[1] or 0.0, 1),
        total_co2_reduced_kg=round(row[2] or 0.0, 1),
        total_deliveries=int(row[3] or 0)
    )


@router.get("/impact/area", response_model=List[AreaImpact])
async def get_area_impact(
    grid_size: float = Query(0.1, description="Grid size in degrees"),
    db: AsyncSession = Depends(get_db)
):
    """Get impact breakdown by geographic area"""
    # Group by rounded lat/lng
    stmt = select(
        func.round(ImpactLog.area_lat / grid_size) * grid_size,
        func.round(ImpactLog.area_lng / grid_size) * grid_size,
        func.sum(ImpactLog.meals_rescued),
        func.sum(ImpactLog.kg_saved),
        func.count(ImpactLog.id)
    ).where(
        and_(
            ImpactLog.area_lat.isnot(None),
            ImpactLog.area_lng.isnot(None)
        )
    ).group_by(
        func.round(ImpactLog.area_lat / grid_size),
        func.round(ImpactLog.area_lng / grid_size)
    )
    
    result = await db.execute(stmt)
    rows = result.all()
    
    areas = []
    for row in rows:
        if row[0] and row[1]:
            areas.append(AreaImpact(
                lat=float(row[0]),
                lng=float(row[1]),
                meals_rescued=int(row[2] or 0),
                kg_saved=round(float(row[3] or 0), 1),
                delivery_count=int(row[4] or 0)
            ))
    
    return areas


@router.get("/trends/meals", response_model=TrendResponse)
async def get_meals_trend(
    period: str = Query("daily", regex="^(daily|weekly|monthly)$"),
    days: int = Query(30, ge=7, le=365),
    db: AsyncSession = Depends(get_db)
):
    """Get meals rescued trend over time"""
    period_start = datetime.utcnow() - timedelta(days=days)
    
    if period == "daily":
        date_trunc = func.date_trunc('day', ImpactLog.created_at)
    elif period == "weekly":
        date_trunc = func.date_trunc('week', ImpactLog.created_at)
    else:
        date_trunc = func.date_trunc('month', ImpactLog.created_at)
    
    stmt = select(
        date_trunc.label('period'),
        func.sum(ImpactLog.meals_rescued)
    ).where(
        ImpactLog.created_at >= period_start
    ).group_by(date_trunc).order_by(date_trunc)
    
    result = await db.execute(stmt)
    rows = result.all()
    
    data_points = [
        TrendDataPoint(date=row[0], value=float(row[1] or 0))
        for row in rows
        if row[0]
    ]
    
    return TrendResponse(
        metric_name="meals_rescued",
        period=period,
        data_points=data_points
    )


@router.get("/trends/deliveries", response_model=TrendResponse)
async def get_deliveries_trend(
    period: str = Query("daily", regex="^(daily|weekly|monthly)$"),
    days: int = Query(30, ge=7, le=365),
    db: AsyncSession = Depends(get_db)
):
    """Get deliveries trend over time"""
    period_start = datetime.utcnow() - timedelta(days=days)
    
    if period == "daily":
        date_trunc = func.date_trunc('day', Delivery.created_at)
    elif period == "weekly":
        date_trunc = func.date_trunc('week', Delivery.created_at)
    else:
        date_trunc = func.date_trunc('month', Delivery.created_at)
    
    stmt = select(
        date_trunc.label('period'),
        func.count(Delivery.id)
    ).where(
        and_(
            Delivery.created_at >= period_start,
            Delivery.status.in_([DeliveryStatus.delivered, DeliveryStatus.confirmed])
        )
    ).group_by(date_trunc).order_by(date_trunc)
    
    result = await db.execute(stmt)
    rows = result.all()
    
    data_points = [
        TrendDataPoint(date=row[0], value=float(row[1] or 0))
        for row in rows
        if row[0]
    ]
    
    return TrendResponse(
        metric_name="completed_deliveries",
        period=period,
        data_points=data_points
    )


@router.get("/leaderboard/volunteers")
async def get_volunteer_leaderboard(
    limit: int = Query(10, ge=1, le=50),
    db: AsyncSession = Depends(get_db)
):
    """Get top volunteers by deliveries"""
    stmt = select(
        User.id,
        User.name,
        User.image_url,
        User.total_deliveries,
        User.reliability_score
    ).where(
        and_(
            User.role == UserRole.volunteer,
            User.is_deleted == False,
            User.total_deliveries > 0
        )
    ).order_by(User.total_deliveries.desc()).limit(limit)
    
    result = await db.execute(stmt)
    rows = result.all()
    
    return [
        {
            "rank": i + 1,
            "user_id": str(row[0]),
            "name": row[1],
            "image_url": row[2],
            "total_deliveries": row[3],
            "reliability_score": row[4]
        }
        for i, row in enumerate(rows)
    ]


@router.get("/leaderboard/donors")
async def get_donor_leaderboard(
    limit: int = Query(10, ge=1, le=50),
    db: AsyncSession = Depends(get_db)
):
    """Get top donors by donations"""
    stmt = select(
        User.id,
        User.name,
        User.image_url,
        User.total_donations
    ).where(
        and_(
            User.role == UserRole.donor,
            User.is_deleted == False,
            User.total_donations > 0
        )
    ).order_by(User.total_donations.desc()).limit(limit)
    
    result = await db.execute(stmt)
    rows = result.all()
    
    return [
        {
            "rank": i + 1,
            "user_id": str(row[0]),
            "name": row[1],
            "image_url": row[2],
            "total_donations": row[3]
        }
        for i, row in enumerate(rows)
    ]

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import and_, func
from typing import List, Optional
from datetime import datetime, timedelta
from uuid import UUID

from db import get_db
from models import Feedback, User, Delivery, ReliabilityMetric, DeliveryStatus, MetricType
from schemas import FeedbackCreate, FeedbackResponse, ReliabilityResponse, UserBrief

router = APIRouter(prefix="/api/v1/feedback", tags=["feedback"])


@router.post("", response_model=FeedbackResponse, status_code=201)
async def create_feedback(
    feedback_data: FeedbackCreate,
    from_user_id: UUID = Query(..., description="ID of user submitting feedback"),
    db: AsyncSession = Depends(get_db)
):
    """Submit feedback after a delivery"""
    # Verify delivery exists and is completed
    stmt = select(Delivery).where(Delivery.id == feedback_data.delivery_id)
    result = await db.execute(stmt)
    delivery = result.scalars().first()
    
    if not delivery:
        raise HTTPException(status_code=404, detail="Delivery not found")
    
    if delivery.status not in [DeliveryStatus.delivered, DeliveryStatus.confirmed]:
        raise HTTPException(status_code=400, detail="Can only submit feedback for completed deliveries")
    
    # Verify from_user is part of the delivery
    if from_user_id not in [delivery.volunteer_id, delivery.charity_id]:
        raise HTTPException(status_code=403, detail="You are not part of this delivery")
    
    # Verify to_user is part of the delivery
    if feedback_data.to_user_id not in [delivery.volunteer_id, delivery.charity_id]:
        raise HTTPException(status_code=400, detail="Invalid recipient")
    
    # Can't rate yourself
    if from_user_id == feedback_data.to_user_id:
        raise HTTPException(status_code=400, detail="Cannot submit feedback for yourself")
    
    # Check if already submitted
    stmt = select(Feedback).where(
        and_(
            Feedback.delivery_id == feedback_data.delivery_id,
            Feedback.from_user_id == from_user_id
        )
    )
    result = await db.execute(stmt)
    existing = result.scalars().first()
    
    if existing:
        raise HTTPException(status_code=400, detail="Feedback already submitted for this delivery")
    
    # Create feedback
    feedback = Feedback(
        delivery_id=feedback_data.delivery_id,
        from_user_id=from_user_id,
        to_user_id=feedback_data.to_user_id,
        rating=feedback_data.rating,
        comment=feedback_data.comment,
        food_quality_rating=feedback_data.food_quality_rating,
        timeliness_rating=feedback_data.timeliness_rating,
        communication_rating=feedback_data.communication_rating
    )
    
    db.add(feedback)
    await db.commit()
    await db.refresh(feedback)
    
    # Trigger reliability recalculation
    await recalculate_reliability(feedback_data.to_user_id, db)
    
    return feedback


@router.get("/user/{user_id}", response_model=List[FeedbackResponse])
async def get_user_feedback(
    user_id: UUID,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db)
):
    """Get feedback received by a user"""
    stmt = select(Feedback).where(
        Feedback.to_user_id == user_id
    ).order_by(Feedback.created_at.desc())
    
    stmt = stmt.offset((page - 1) * page_size).limit(page_size)
    
    result = await db.execute(stmt)
    feedback_list = result.scalars().all()
    
    return feedback_list


@router.get("/delivery/{delivery_id}", response_model=List[FeedbackResponse])
async def get_delivery_feedback(
    delivery_id: UUID,
    db: AsyncSession = Depends(get_db)
):
    """Get all feedback for a delivery"""
    stmt = select(Feedback).where(
        Feedback.delivery_id == delivery_id
    ).order_by(Feedback.created_at.desc())
    
    result = await db.execute(stmt)
    feedback_list = result.scalars().all()
    
    return feedback_list


async def recalculate_reliability(user_id: UUID, db: AsyncSession):
    """Recalculate and update user's reliability score"""
    # Get user
    stmt = select(User).where(User.id == user_id)
    result = await db.execute(stmt)
    user = result.scalars().first()
    
    if not user:
        return
    
    now = datetime.utcnow()
    period_start = now - timedelta(days=90)  # Last 90 days
    
    # Calculate average rating
    stmt = select(func.avg(Feedback.rating)).where(
        and_(
            Feedback.to_user_id == user_id,
            Feedback.created_at >= period_start
        )
    )
    result = await db.execute(stmt)
    avg_rating = result.scalar() or 5.0
    
    # Count deliveries
    if user.role.value == "volunteer":
        stmt = select(func.count(Delivery.id)).where(
            and_(
                Delivery.volunteer_id == user_id,
                Delivery.created_at >= period_start
            )
        )
        result = await db.execute(stmt)
        total_deliveries = result.scalar() or 0
        
        # Count completed
        stmt = select(func.count(Delivery.id)).where(
            and_(
                Delivery.volunteer_id == user_id,
                Delivery.status.in_([DeliveryStatus.delivered, DeliveryStatus.confirmed]),
                Delivery.created_at >= period_start
            )
        )
        result = await db.execute(stmt)
        completed_deliveries = result.scalar() or 0
        
        # Count failed/cancelled
        stmt = select(func.count(Delivery.id)).where(
            and_(
                Delivery.volunteer_id == user_id,
                Delivery.status.in_([DeliveryStatus.failed, DeliveryStatus.cancelled]),
                Delivery.created_at >= period_start
            )
        )
        result = await db.execute(stmt)
        failed_deliveries = result.scalar() or 0
        
        # Calculate completion rate
        completion_rate = (completed_deliveries / total_deliveries * 100) if total_deliveries > 0 else 100.0
        
        # Calculate reliability score
        # 50% from rating (on 5-point scale), 50% from completion rate
        rating_component = (avg_rating / 5.0) * 50
        completion_component = (completion_rate / 100.0) * 50
        reliability_score = rating_component + completion_component
        
    else:
        # For non-volunteers, just use rating
        reliability_score = (avg_rating / 5.0) * 100
    
    # Update user
    user.reliability_score = round(reliability_score, 1)
    
    # Store metric snapshot
    metric = ReliabilityMetric(
        user_id=user_id,
        metric_type=MetricType.rating,
        value=reliability_score,
        period_start=period_start,
        period_end=now,
        sample_size=total_deliveries if user.role.value == "volunteer" else 0
    )
    db.add(metric)
    
    await db.commit()


@router.get("/reliability/{user_id}", response_model=ReliabilityResponse)
async def get_reliability_score(user_id: UUID, db: AsyncSession = Depends(get_db)):
    """Get detailed reliability metrics for a user"""
    # Get user
    stmt = select(User).where(User.id == user_id)
    result = await db.execute(stmt)
    user = result.scalars().first()
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    now = datetime.utcnow()
    period_start = now - timedelta(days=90)
    
    # Get average rating
    stmt = select(func.avg(Feedback.rating)).where(
        and_(
            Feedback.to_user_id == user_id,
            Feedback.created_at >= period_start
        )
    )
    result = await db.execute(stmt)
    avg_rating = result.scalar() or 5.0
    
    # Get delivery stats for volunteers
    on_time_pct = 100.0
    completion_rate = 100.0
    total_deliveries = 0
    
    if user.role.value == "volunteer":
        stmt = select(func.count(Delivery.id)).where(
            and_(
                Delivery.volunteer_id == user_id,
                Delivery.created_at >= period_start
            )
        )
        result = await db.execute(stmt)
        total_deliveries = result.scalar() or 0
        
        if total_deliveries > 0:
            # Completed
            stmt = select(func.count(Delivery.id)).where(
                and_(
                    Delivery.volunteer_id == user_id,
                    Delivery.status.in_([DeliveryStatus.delivered, DeliveryStatus.confirmed]),
                    Delivery.created_at >= period_start
                )
            )
            result = await db.execute(stmt)
            completed = result.scalar() or 0
            completion_rate = (completed / total_deliveries) * 100
            
            # On-time (simplified - delivered before ETA)
            # In production, compare actual_delivery_time with delivery_eta
            on_time_pct = min(100, completion_rate + 10)  # Simplified estimate
    
    return ReliabilityResponse(
        user_id=user_id,
        overall_score=user.reliability_score or 100.0,
        on_time_percentage=round(on_time_pct, 1),
        completion_rate=round(completion_rate, 1),
        average_rating=round(avg_rating, 1),
        total_deliveries=total_deliveries,
        metrics_breakdown={
            "rating_component": round((avg_rating / 5.0) * 50, 1),
            "completion_component": round((completion_rate / 100.0) * 50, 1)
        }
    )


@router.post("/reliability/recalculate/{user_id}")
async def trigger_reliability_recalculation(
    user_id: UUID,
    db: AsyncSession = Depends(get_db)
):
    """Manually trigger reliability score recalculation"""
    await recalculate_reliability(user_id, db)
    
    # Return updated score
    stmt = select(User).where(User.id == user_id)
    result = await db.execute(stmt)
    user = result.scalars().first()
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    return {
        "user_id": str(user_id),
        "reliability_score": user.reliability_score
    }

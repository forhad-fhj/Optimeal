import uuid
import enum
from datetime import datetime
from sqlalchemy import Column, String, Float, DateTime, ForeignKey, Enum, JSON, ARRAY, Boolean, Integer, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from db import Base


# ============ ENUMS ============

class UserRole(str, enum.Enum):
    donor = "donor"
    volunteer = "volunteer"
    charity = "charity"
    admin = "admin"


class ListingStatus(str, enum.Enum):
    available = "available"
    reserved = "reserved"
    assigned = "assigned"
    picked_up = "picked_up"
    delivered = "delivered"
    expired = "expired"
    cancelled = "cancelled"


class DeliveryStatus(str, enum.Enum):
    pending = "pending"
    assigned = "assigned"
    en_route_pickup = "en_route_pickup"
    picked_up = "picked_up"
    en_route_delivery = "en_route_delivery"
    delivered = "delivered"
    confirmed = "confirmed"
    failed = "failed"
    cancelled = "cancelled"


class FoodCategory(str, enum.Enum):
    perishable = "perishable"
    non_perishable = "non_perishable"
    prepared = "prepared"
    bakery = "bakery"
    produce = "produce"
    dairy = "dairy"
    meat = "meat"
    mixed = "mixed"


class RouteStatus(str, enum.Enum):
    planned = "planned"
    active = "active"
    completed = "completed"
    failed = "failed"


class MetricType(str, enum.Enum):
    on_time = "on_time"
    cancellation = "cancellation"
    completion = "completion"
    rating = "rating"


# ============ MODELS ============

class User(Base):
    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email = Column(String, unique=True, nullable=True, index=True)
    name = Column(String, nullable=False)
    role = Column(Enum(UserRole), default=UserRole.volunteer, index=True)
    location_lat = Column(Float, nullable=True)
    location_lng = Column(Float, nullable=True)
    address = Column(String, nullable=True)
    phone = Column(String, nullable=True)
    image_url = Column(String, nullable=True)
    auth_provider = Column(String, nullable=True)
    auth_provider_id = Column(String, nullable=True)
    
    # Volunteer-specific
    is_available = Column(Boolean, default=False)
    
    # Trust & reliability
    reliability_score = Column(Float, default=100.0)
    total_deliveries = Column(Integer, default=0)
    total_donations = Column(Integer, default=0)
    
    # Charity-specific
    capacity_kg = Column(Float, nullable=True)
    preferred_food_types = Column(JSON, nullable=True)  # List of FoodCategory values
    
    # Soft delete
    is_deleted = Column(Boolean, default=False)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    food_listings = relationship("FoodListing", back_populates="donor", foreign_keys="FoodListing.donor_id")
    volunteer_deliveries = relationship("Delivery", back_populates="volunteer", foreign_keys="Delivery.volunteer_id")
    charity_deliveries = relationship("Delivery", back_populates="charity", foreign_keys="Delivery.charity_id")


class FoodListing(Base):
    __tablename__ = "food_listings"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    donor_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)
    
    # Basic info
    title = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    food_category = Column(Enum(FoodCategory), default=FoodCategory.mixed)
    quantity_kg = Column(Float, nullable=False)
    
    # Timing
    expires_at = Column(DateTime, nullable=False, index=True)
    pickup_window_start = Column(DateTime, nullable=False)
    pickup_window_end = Column(DateTime, nullable=False)
    
    # Location
    location_lat = Column(Float, nullable=True)
    location_lng = Column(Float, nullable=True)
    address = Column(String, nullable=True)
    
    # Assignment
    assigned_volunteer_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    assigned_charity_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    
    # Recurring donations
    is_recurring = Column(Boolean, default=False)
    recurrence_pattern = Column(JSON, nullable=True)  # e.g., {"frequency": "weekly", "days": [1, 3, 5]}
    parent_listing_id = Column(UUID(as_uuid=True), ForeignKey("food_listings.id"), nullable=True)
    
    # Food safety
    requires_refrigeration = Column(Boolean, default=False)
    allergens = Column(JSON, nullable=True)  # List of allergen strings
    handling_instructions = Column(Text, nullable=True)
    
    status = Column(Enum(ListingStatus), default=ListingStatus.available, index=True)
    is_deleted = Column(Boolean, default=False)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    donor = relationship("User", back_populates="food_listings", foreign_keys=[donor_id])
    assigned_volunteer = relationship("User", foreign_keys=[assigned_volunteer_id])
    assigned_charity = relationship("User", foreign_keys=[assigned_charity_id])
    parent_listing = relationship("FoodListing", remote_side=[id], backref="child_listings")


class Delivery(Base):
    __tablename__ = "deliveries"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    volunteer_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)
    charity_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)
    listing_ids = Column(ARRAY(UUID(as_uuid=True)), nullable=False)
    
    # Route data
    optimized_route_data = Column(JSON, nullable=True)
    total_distance_km = Column(Float, nullable=True)
    estimated_duration_minutes = Column(Integer, nullable=True)
    
    # Timing
    pickup_eta = Column(DateTime, nullable=True)
    delivery_eta = Column(DateTime, nullable=True)
    actual_pickup_time = Column(DateTime, nullable=True)
    actual_delivery_time = Column(DateTime, nullable=True)
    
    # Status & notes
    status = Column(Enum(DeliveryStatus), default=DeliveryStatus.pending, index=True)
    volunteer_notes = Column(Text, nullable=True)
    charity_notes = Column(Text, nullable=True)
    charity_confirmed = Column(Boolean, default=False)
    
    # Food safety checklist
    pickup_checklist = Column(JSON, nullable=True)  # e.g., {"temperature_ok": true, "packaging_intact": true}
    delivery_checklist = Column(JSON, nullable=True)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    completed_at = Column(DateTime, nullable=True)

    # Relationships
    volunteer = relationship("User", back_populates="volunteer_deliveries", foreign_keys=[volunteer_id])
    charity = relationship("User", back_populates="charity_deliveries", foreign_keys=[charity_id])
    route_assignment = relationship("RouteAssignment", back_populates="delivery", uselist=False)
    feedback = relationship("Feedback", back_populates="delivery")
    impact_log = relationship("ImpactLog", back_populates="delivery", uselist=False)


class RouteAssignment(Base):
    __tablename__ = "route_assignments"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    delivery_id = Column(UUID(as_uuid=True), ForeignKey("deliveries.id"), nullable=False, unique=True)
    volunteer_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)
    
    route_json = Column(JSON, nullable=False)  # Full route with waypoints
    total_distance_km = Column(Float, nullable=False)
    estimated_duration_minutes = Column(Integer, nullable=False)
    
    status = Column(Enum(RouteStatus), default=RouteStatus.planned, index=True)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    delivery = relationship("Delivery", back_populates="route_assignment")
    volunteer = relationship("User")


class Feedback(Base):
    __tablename__ = "feedback"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    delivery_id = Column(UUID(as_uuid=True), ForeignKey("deliveries.id"), nullable=False, index=True)
    from_user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    to_user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)
    
    rating = Column(Integer, nullable=False)  # 1-5
    comment = Column(Text, nullable=True)
    
    # Specific feedback categories
    food_quality_rating = Column(Integer, nullable=True)  # 1-5
    timeliness_rating = Column(Integer, nullable=True)  # 1-5
    communication_rating = Column(Integer, nullable=True)  # 1-5
    
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    delivery = relationship("Delivery", back_populates="feedback")
    from_user = relationship("User", foreign_keys=[from_user_id])
    to_user = relationship("User", foreign_keys=[to_user_id])


class ReliabilityMetric(Base):
    __tablename__ = "reliability_metrics"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)
    
    metric_type = Column(Enum(MetricType), nullable=False)
    value = Column(Float, nullable=False)
    
    # Time period for this metric
    period_start = Column(DateTime, nullable=False)
    period_end = Column(DateTime, nullable=False)
    
    # Context
    sample_size = Column(Integer, default=0)  # Number of data points
    
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    user = relationship("User")


class ImpactLog(Base):
    __tablename__ = "impact_logs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)
    delivery_id = Column(UUID(as_uuid=True), ForeignKey("deliveries.id"), nullable=True, index=True)
    
    # Impact metrics
    meals_rescued = Column(Integer, default=0)
    kg_saved = Column(Float, default=0.0)
    co2_reduced_kg = Column(Float, default=0.0)  # Estimated at 2.5kg CO2 per 1kg food
    
    # Geographic data for area analysis
    area_lat = Column(Float, nullable=True)
    area_lng = Column(Float, nullable=True)
    
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    user = relationship("User")
    delivery = relationship("Delivery", back_populates="impact_log")


# ============ AUDIT LOG (Future-ready) ============

class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    
    action = Column(String, nullable=False)  # e.g., "delivery.created", "listing.updated"
    entity_type = Column(String, nullable=False)  # e.g., "Delivery", "FoodListing"
    entity_id = Column(UUID(as_uuid=True), nullable=False)
    
    old_values = Column(JSON, nullable=True)
    new_values = Column(JSON, nullable=True)
    
    ip_address = Column(String, nullable=True)
    user_agent = Column(String, nullable=True)
    
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    user = relationship("User")

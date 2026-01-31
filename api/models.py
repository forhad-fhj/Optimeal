import uuid
import enum
from datetime import datetime, timedelta
from sqlalchemy import Column, String, Float, DateTime, ForeignKey, Enum, JSON, ARRAY, Boolean
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from db import Base

class UserRole(str, enum.Enum):
    donor = "donor"
    volunteer = "volunteer"
    charity = "charity"

class ListingStatus(str, enum.Enum):
    available = "available"
    reserved = "reserved"
    picked_up = "picked_up"
    delivered = "delivered"
    expired = "expired"

class DeliveryStatus(str, enum.Enum):
    en_route = "en_route"
    completed = "completed"
    failed = "failed"

class User(Base):
    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email = Column(String, unique=True, nullable=True, index=True)
    name = Column(String, nullable=False)
    role = Column(Enum(UserRole), default=UserRole.volunteer)
    location_lat = Column(Float, nullable=True)
    location_lng = Column(Float, nullable=True)
    phone = Column(String, nullable=True)
    image_url = Column(String, nullable=True)
    auth_provider = Column(String, nullable=True) # e.g. "google"
    auth_provider_id = Column(String, nullable=True) # sub
    
    created_at = Column(DateTime, default=datetime.utcnow)

class FoodListing(Base):
    __tablename__ = "food_listings"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    donor_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    title = Column(String, nullable=False)
    quantity_kg = Column(Float, nullable=False)
    expires_at = Column(DateTime, nullable=False, index=True)
    pickup_window_start = Column(DateTime, nullable=False)
    pickup_window_end = Column(DateTime, nullable=False)
    status = Column(Enum(ListingStatus), default=ListingStatus.available, index=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    donor = relationship("User")

class Delivery(Base):
    __tablename__ = "deliveries"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    volunteer_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    charity_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    listing_ids = Column(ARRAY(UUID(as_uuid=True)), nullable=False)
    optimized_route_data = Column(JSON, nullable=False)
    status = Column(Enum(DeliveryStatus), default=DeliveryStatus.en_route, index=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    completed_at = Column(DateTime, nullable=True)

    volunteer = relationship("User", foreign_keys=[volunteer_id])
    charity = relationship("User", foreign_keys=[charity_id])

from pydantic import BaseModel, EmailStr
from typing import List, Optional, Any
from datetime import datetime
from uuid import UUID
from models import UserRole, ListingStatus, DeliveryStatus

class UserBase(BaseModel):
    name: str
    email: Optional[EmailStr] = None
    role: UserRole
    location_lat: Optional[float] = None
    location_lng: Optional[float] = None
    phone: Optional[str] = None
    image_url: Optional[str] = None

class UserCreate(UserBase):
    auth_provider_id: Optional[str] = None
    auth_provider: Optional[str] = None

class UserResponse(UserBase):
    id: UUID
    created_at: datetime
    class Config:
        from_attributes = True

class AuthSyncRequest(BaseModel):
    email: EmailStr
    name: str
    image_url: Optional[str] = None
    provider: str = "google"
    provider_id: str

class ListingBase(BaseModel):
    title: str
    quantity_kg: float
    expires_at: datetime
    pickup_window_start: datetime
    pickup_window_end: datetime

class ListingCreate(ListingBase):
    donor_id: UUID

class ListingResponse(ListingBase):
    id: UUID
    donor_id: UUID
    status: ListingStatus
    created_at: datetime
    donor: Optional[UserResponse] = None

    class Config:
        from_attributes = True

class RouteRequest(BaseModel):
    volunteer_lat: float
    volunteer_lng: float
    charity_id: UUID
    listing_ids: List[UUID]

class RoutePoint(BaseModel):
    type: str 
    lat: float
    lng: float
    listing_id: Optional[UUID] = None
    order: Optional[int] = None
    details: Optional[dict] = None

class DeliveryCreate(BaseModel):
    volunteer_id: UUID
    charity_id: UUID
    listing_ids: List[UUID]
    optimized_route_data: List[RoutePoint]

class DeliveryResponse(BaseModel):
    id: UUID
    volunteer_id: UUID
    charity_id: UUID
    status: DeliveryStatus
    created_at: datetime

    class Config:
        from_attributes = True

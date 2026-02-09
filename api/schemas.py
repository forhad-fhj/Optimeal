from pydantic import BaseModel, EmailStr, Field
from typing import List, Optional, Any, Dict
from datetime import datetime
from uuid import UUID
from enum import Enum


# ============ ENUMS (mirror SQLAlchemy enums) ============

class UserRole(str, Enum):
    donor = "donor"
    volunteer = "volunteer"
    charity = "charity"
    admin = "admin"


class ListingStatus(str, Enum):
    available = "available"
    reserved = "reserved"
    assigned = "assigned"
    picked_up = "picked_up"
    delivered = "delivered"
    expired = "expired"
    cancelled = "cancelled"


class DeliveryStatus(str, Enum):
    pending = "pending"
    assigned = "assigned"
    en_route_pickup = "en_route_pickup"
    picked_up = "picked_up"
    en_route_delivery = "en_route_delivery"
    delivered = "delivered"
    confirmed = "confirmed"
    failed = "failed"
    cancelled = "cancelled"


class FoodCategory(str, Enum):
    perishable = "perishable"
    non_perishable = "non_perishable"
    prepared = "prepared"
    bakery = "bakery"
    produce = "produce"
    dairy = "dairy"
    meat = "meat"
    mixed = "mixed"


class RouteStatus(str, Enum):
    planned = "planned"
    active = "active"
    completed = "completed"
    failed = "failed"


class MetricType(str, Enum):
    on_time = "on_time"
    cancellation = "cancellation"
    completion = "completion"
    rating = "rating"


# ============ USER SCHEMAS ============

class UserBase(BaseModel):
    name: str
    email: Optional[EmailStr] = None
    role: UserRole = UserRole.volunteer
    location_lat: Optional[float] = None
    location_lng: Optional[float] = None
    address: Optional[str] = None
    phone: Optional[str] = None
    image_url: Optional[str] = None


class UserCreate(UserBase):
    auth_provider_id: Optional[str] = None
    auth_provider: Optional[str] = None


class UserUpdate(BaseModel):
    name: Optional[str] = None
    role: Optional[UserRole] = None
    phone: Optional[str] = None
    location_lat: Optional[float] = None
    location_lng: Optional[float] = None
    address: Optional[str] = None
    is_available: Optional[bool] = None
    capacity_kg: Optional[float] = None
    preferred_food_types: Optional[List[FoodCategory]] = None


class UserResponse(UserBase):
    id: UUID
    is_available: bool = False
    reliability_score: float = 100.0
    total_deliveries: int = 0
    total_donations: int = 0
    capacity_kg: Optional[float] = None
    preferred_food_types: Optional[List[str]] = None
    created_at: datetime

    class Config:
        from_attributes = True


class UserBrief(BaseModel):
    """Minimal user info for embedding in other responses"""
    id: UUID
    name: str
    role: UserRole
    image_url: Optional[str] = None

    class Config:
        from_attributes = True


# ============ AUTH SCHEMAS ============

class AuthSyncRequest(BaseModel):
    email: EmailStr
    name: str
    image_url: Optional[str] = None
    provider: str = "google"
    provider_id: str


# ============ LISTING SCHEMAS ============

class ListingBase(BaseModel):
    title: str
    description: Optional[str] = None
    food_category: FoodCategory = FoodCategory.mixed
    quantity_kg: float = Field(gt=0)
    expires_at: datetime
    pickup_window_start: datetime
    pickup_window_end: datetime
    location_lat: Optional[float] = None
    location_lng: Optional[float] = None
    address: Optional[str] = None
    requires_refrigeration: bool = False
    allergens: Optional[List[str]] = None
    handling_instructions: Optional[str] = None


class ListingCreate(ListingBase):
    donor_id: UUID
    is_recurring: bool = False
    recurrence_pattern: Optional[Dict[str, Any]] = None


class ListingUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    food_category: Optional[FoodCategory] = None
    quantity_kg: Optional[float] = Field(default=None, gt=0)
    expires_at: Optional[datetime] = None
    pickup_window_start: Optional[datetime] = None
    pickup_window_end: Optional[datetime] = None
    location_lat: Optional[float] = None
    location_lng: Optional[float] = None
    address: Optional[str] = None
    status: Optional[ListingStatus] = None
    requires_refrigeration: Optional[bool] = None
    allergens: Optional[List[str]] = None
    handling_instructions: Optional[str] = None


class ListingResponse(ListingBase):
    id: UUID
    donor_id: UUID
    status: ListingStatus
    assigned_volunteer_id: Optional[UUID] = None
    assigned_charity_id: Optional[UUID] = None
    is_recurring: bool = False
    created_at: datetime
    donor: Optional[UserBrief] = None

    class Config:
        from_attributes = True


class ListingBrief(BaseModel):
    """Minimal listing info for embedding"""
    id: UUID
    title: str
    quantity_kg: float
    food_category: FoodCategory
    expires_at: datetime
    status: ListingStatus

    class Config:
        from_attributes = True


class NearbyListingsRequest(BaseModel):
    lat: float
    lng: float
    radius_meters: float = 5000


# ============ ROUTE SCHEMAS ============

class RoutePoint(BaseModel):
    type: str  # "start", "pickup", "dropoff"
    lat: float
    lng: float
    listing_id: Optional[UUID] = None
    order: int
    address: Optional[str] = None
    name: Optional[str] = None
    details: Optional[Dict[str, Any]] = None


class RouteRequest(BaseModel):
    volunteer_lat: float
    volunteer_lng: float
    charity_id: UUID
    listing_ids: List[UUID]


class RouteResponse(BaseModel):
    stops: List[RoutePoint]
    total_distance_km: float
    estimated_duration_minutes: int
    polyline: Optional[str] = None  # Encoded polyline for map display


class RouteAssignmentResponse(BaseModel):
    id: UUID
    delivery_id: UUID
    volunteer_id: UUID
    route_json: List[RoutePoint]
    total_distance_km: float
    estimated_duration_minutes: int
    status: RouteStatus
    created_at: datetime

    class Config:
        from_attributes = True


# ============ DELIVERY SCHEMAS ============

class DeliveryCreate(BaseModel):
    volunteer_id: UUID
    charity_id: UUID
    listing_ids: List[UUID]
    optimized_route_data: Optional[List[RoutePoint]] = None


class DeliveryStatusUpdate(BaseModel):
    status: DeliveryStatus
    notes: Optional[str] = None
    checklist: Optional[Dict[str, bool]] = None


class DeliveryResponse(BaseModel):
    id: UUID
    volunteer_id: UUID
    charity_id: UUID
    listing_ids: List[UUID]
    status: DeliveryStatus
    pickup_eta: Optional[datetime] = None
    delivery_eta: Optional[datetime] = None
    actual_pickup_time: Optional[datetime] = None
    actual_delivery_time: Optional[datetime] = None
    charity_confirmed: bool = False
    total_distance_km: Optional[float] = None
    estimated_duration_minutes: Optional[int] = None
    volunteer_notes: Optional[str] = None
    created_at: datetime
    completed_at: Optional[datetime] = None
    volunteer: Optional[UserBrief] = None
    charity: Optional[UserBrief] = None

    class Config:
        from_attributes = True


class DeliveryTrackingResponse(BaseModel):
    delivery_id: UUID
    status: DeliveryStatus
    volunteer_location: Optional[Dict[str, float]] = None  # {"lat": x, "lng": y}
    pickup_eta: Optional[datetime] = None
    delivery_eta: Optional[datetime] = None
    current_stop: Optional[int] = None
    total_stops: int = 0


# ============ FEEDBACK SCHEMAS ============

class FeedbackCreate(BaseModel):
    delivery_id: UUID
    to_user_id: UUID
    rating: int = Field(ge=1, le=5)
    comment: Optional[str] = None
    food_quality_rating: Optional[int] = Field(default=None, ge=1, le=5)
    timeliness_rating: Optional[int] = Field(default=None, ge=1, le=5)
    communication_rating: Optional[int] = Field(default=None, ge=1, le=5)


class FeedbackResponse(BaseModel):
    id: UUID
    delivery_id: UUID
    from_user_id: UUID
    to_user_id: UUID
    rating: int
    comment: Optional[str] = None
    food_quality_rating: Optional[int] = None
    timeliness_rating: Optional[int] = None
    communication_rating: Optional[int] = None
    created_at: datetime
    from_user: Optional[UserBrief] = None

    class Config:
        from_attributes = True


# ============ RELIABILITY SCHEMAS ============

class ReliabilityResponse(BaseModel):
    user_id: UUID
    overall_score: float
    on_time_percentage: float
    completion_rate: float
    average_rating: float
    total_deliveries: int
    metrics_breakdown: Optional[Dict[str, float]] = None


# ============ IMPACT SCHEMAS ============

class ImpactLogCreate(BaseModel):
    user_id: UUID
    delivery_id: Optional[UUID] = None
    meals_rescued: int = 0
    kg_saved: float = 0.0
    co2_reduced_kg: float = 0.0
    area_lat: Optional[float] = None
    area_lng: Optional[float] = None


class ImpactLogResponse(BaseModel):
    id: UUID
    user_id: UUID
    delivery_id: Optional[UUID] = None
    meals_rescued: int
    kg_saved: float
    co2_reduced_kg: float
    created_at: datetime

    class Config:
        from_attributes = True


class ImpactSummary(BaseModel):
    total_meals_rescued: int = 0
    total_kg_saved: float = 0.0
    total_co2_reduced_kg: float = 0.0
    total_deliveries: int = 0
    period_start: Optional[datetime] = None
    period_end: Optional[datetime] = None


class AreaImpact(BaseModel):
    area_name: Optional[str] = None
    lat: float
    lng: float
    meals_rescued: int
    kg_saved: float
    delivery_count: int


# ============ MATCHING SCHEMAS ============

class MatchScore(BaseModel):
    user_id: UUID
    user_name: str
    user_role: UserRole
    score: float
    distance_km: float
    reliability_score: float
    breakdown: Dict[str, float]


class MatchingResult(BaseModel):
    listing_id: UUID
    best_charity: Optional[MatchScore] = None
    best_volunteer: Optional[MatchScore] = None
    alternative_charities: List[MatchScore] = []
    alternative_volunteers: List[MatchScore] = []


class MatchingRequest(BaseModel):
    listing_id: UUID
    auto_assign: bool = False


# ============ ANALYTICS SCHEMAS ============

class PlatformAnalytics(BaseModel):
    total_users: int = 0
    total_donors: int = 0
    total_volunteers: int = 0
    total_charities: int = 0
    total_listings: int = 0
    active_listings: int = 0
    total_deliveries: int = 0
    completed_deliveries: int = 0
    total_meals_rescued: int = 0
    total_kg_saved: float = 0.0
    total_co2_reduced_kg: float = 0.0


class TrendDataPoint(BaseModel):
    date: datetime
    value: float


class TrendResponse(BaseModel):
    metric_name: str
    period: str  # "daily", "weekly", "monthly"
    data_points: List[TrendDataPoint]


# ============ PAGINATION ============

class PaginatedResponse(BaseModel):
    items: List[Any]
    total: int
    page: int
    page_size: int
    total_pages: int


# ============ ERROR RESPONSES ============

class ErrorResponse(BaseModel):
    detail: str
    error_code: Optional[str] = None


class ValidationErrorResponse(BaseModel):
    detail: List[Dict[str, Any]]

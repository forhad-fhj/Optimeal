// ============ ENUMS ============

export type UserRole = 'donor' | 'volunteer' | 'charity' | 'admin';

export type ListingStatus =
    | 'available'
    | 'reserved'
    | 'assigned'
    | 'picked_up'
    | 'delivered'
    | 'expired'
    | 'cancelled';

export type DeliveryStatus =
    | 'pending'
    | 'assigned'
    | 'en_route_pickup'
    | 'picked_up'
    | 'en_route_delivery'
    | 'delivered'
    | 'confirmed'
    | 'failed'
    | 'cancelled';

export type FoodCategory =
    | 'perishable'
    | 'non_perishable'
    | 'prepared'
    | 'bakery'
    | 'produce'
    | 'dairy'
    | 'meat'
    | 'mixed';

// ============ USER ============

export interface User {
    id: string;
    email?: string;
    name: string;
    role: UserRole;
    location_lat?: number;
    location_lng?: number;
    address?: string;
    phone?: string;
    image_url?: string;
    is_available?: boolean;
    reliability_score?: number;
    total_deliveries?: number;
    total_donations?: number;
    capacity_kg?: number;
    preferred_food_types?: FoodCategory[];
    created_at: string;
}

export interface UserBrief {
    id: string;
    name: string;
    role: UserRole;
    image_url?: string;
}

// ============ FOOD LISTING ============

export interface FoodListing {
    id: string;
    donor_id: string;
    title: string;
    description?: string;
    food_category: FoodCategory;
    quantity_kg: number;
    expires_at: string;
    pickup_window_start: string;
    pickup_window_end: string;
    location_lat?: number;
    location_lng?: number;
    address?: string;
    status: ListingStatus;
    assigned_volunteer_id?: string;
    assigned_charity_id?: string;
    requires_refrigeration?: boolean;
    allergens?: string[];
    handling_instructions?: string;
    is_recurring?: boolean;
    created_at: string;
    donor?: UserBrief;
}

export interface ListingCreate {
    donor_id: string;
    title: string;
    description?: string;
    food_category?: FoodCategory;
    quantity_kg: number;
    expires_at: string;
    pickup_window_start: string;
    pickup_window_end: string;
    location_lat?: number;
    location_lng?: number;
    address?: string;
    requires_refrigeration?: boolean;
    allergens?: string[];
    handling_instructions?: string;
    is_recurring?: boolean;
    recurrence_pattern?: Record<string, unknown>;
}

// ============ ROUTE ============

export interface RoutePoint {
    type: 'start' | 'pickup' | 'dropoff';
    lat: number;
    lng: number;
    listing_id?: string;
    order: number;
    address?: string;
    name?: string;
    details?: Record<string, unknown>;
}

export interface RouteResponse {
    stops: RoutePoint[];
    total_distance_km: number;
    estimated_duration_minutes: number;
    polyline?: string;
}

// ============ DELIVERY ============

export interface Delivery {
    id: string;
    volunteer_id: string;
    charity_id: string;
    listing_ids: string[];
    status: DeliveryStatus;
    pickup_eta?: string;
    delivery_eta?: string;
    actual_pickup_time?: string;
    actual_delivery_time?: string;
    charity_confirmed?: boolean;
    total_distance_km?: number;
    estimated_duration_minutes?: number;
    volunteer_notes?: string;
    created_at: string;
    completed_at?: string;
    volunteer?: UserBrief;
    charity?: UserBrief;
}

export interface DeliveryCreate {
    volunteer_id: string;
    charity_id: string;
    listing_ids: string[];
    optimized_route_data?: RoutePoint[];
}

export interface DeliveryTracking {
    delivery_id: string;
    status: DeliveryStatus;
    volunteer_location?: { lat: number; lng: number };
    pickup_eta?: string;
    delivery_eta?: string;
    current_stop?: number;
    total_stops: number;
}

// ============ FEEDBACK ============

export interface Feedback {
    id: string;
    delivery_id: string;
    from_user_id: string;
    to_user_id: string;
    rating: number;
    comment?: string;
    food_quality_rating?: number;
    timeliness_rating?: number;
    communication_rating?: number;
    created_at: string;
    from_user?: UserBrief;
}

export interface FeedbackCreate {
    delivery_id: string;
    to_user_id: string;
    rating: number;
    comment?: string;
    food_quality_rating?: number;
    timeliness_rating?: number;
    communication_rating?: number;
}

// ============ RELIABILITY ============

export interface ReliabilityScore {
    user_id: string;
    overall_score: number;
    on_time_percentage: number;
    completion_rate: number;
    average_rating: number;
    total_deliveries: number;
    metrics_breakdown?: Record<string, number>;
}

// ============ IMPACT ============

export interface ImpactSummary {
    total_meals_rescued: number;
    total_kg_saved: number;
    total_co2_reduced_kg: number;
    total_deliveries: number;
    period_start?: string;
    period_end?: string;
}

export interface AreaImpact {
    area_name?: string;
    lat: number;
    lng: number;
    meals_rescued: number;
    kg_saved: number;
    delivery_count: number;
}

// ============ ANALYTICS ============

export interface PlatformAnalytics {
    total_users: number;
    total_donors: number;
    total_volunteers: number;
    total_charities: number;
    total_listings: number;
    active_listings: number;
    total_deliveries: number;
    completed_deliveries: number;
    total_meals_rescued: number;
    total_kg_saved: number;
    total_co2_reduced_kg: number;
}

export interface TrendDataPoint {
    date: string;
    value: number;
}

export interface TrendResponse {
    metric_name: string;
    period: 'daily' | 'weekly' | 'monthly';
    data_points: TrendDataPoint[];
}

// ============ MATCHING ============

export interface MatchScore {
    user_id: string;
    user_name: string;
    user_role: UserRole;
    score: number;
    distance_km: number;
    reliability_score: number;
    breakdown: Record<string, number>;
}

export interface MatchingResult {
    listing_id: string;
    best_charity?: MatchScore;
    best_volunteer?: MatchScore;
    alternative_charities: MatchScore[];
    alternative_volunteers: MatchScore[];
}

// ============ LISTING STATS ============

export interface ListingStats {
    total_listings: number;
    active_listings: number;
    delivered_listings: number;
    kg_saved: number;
    estimated_meals: number;
    co2_reduced_kg: number;
}

// ============ DELIVERY STATS ============

export interface DeliveryStats {
    total_deliveries: number;
    completed_deliveries: number;
    active_deliveries: number;
    failed_deliveries: number;
    success_rate: number;
}

export interface User {
    id: string;
    name: string;
    role: 'donor' | 'volunteer' | 'charity';
    location_lat?: number;
    location_lng?: number;
}

export interface FoodListing {
    id: string;
    title: string;
    quantity_kg: number;
    expires_at: string;
    status: string;
    donor: User;
}

export interface RoutePoint {
    lat: number;
    lng: number;
    type: string;
    listing_id?: string;
}

export interface Delivery {
    id: string;
    status: string;
    optimized_route_data: any;
    listing_ids: string[];
}

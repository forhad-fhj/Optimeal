const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

interface FetchOptions {
    method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
    body?: unknown;
    headers?: Record<string, string>;
}

async function request<T>(url: string, options: FetchOptions = {}): Promise<T> {
    const { method = 'GET', body, headers = {} } = options;

    const config: RequestInit = {
        method,
        headers: {
            'Content-Type': 'application/json',
            ...headers,
        },
    };

    if (body && method !== 'GET') {
        config.body = JSON.stringify(body);
    }

    const res = await fetch(`${API_URL}${url}`, config);

    if (!res.ok) {
        const error = await res.json().catch(() => ({ detail: 'API Error' }));
        throw new Error(error.detail || 'API Error');
    }

    // Handle 204 No Content
    if (res.status === 204) {
        return null as T;
    }

    return res.json();
}

// ============ GENERIC METHODS ============

export const fetcher = <T = unknown>(url: string): Promise<T> => request<T>(url);

export const postData = <T = unknown>(url: string, data: unknown): Promise<T> =>
    request<T>(url, { method: 'POST', body: data });

export const putData = <T = unknown>(url: string, data: unknown = {}): Promise<T> =>
    request<T>(url, { method: 'PUT', body: data });

export const deleteData = <T = unknown>(url: string): Promise<T> =>
    request<T>(url, { method: 'DELETE' });

// ============ AUTH API ============

export const authApi = {
    sync: (data: { email: string; name: string; image_url?: string; provider: string; provider_id: string }) =>
        postData('/api/auth/sync', data),

    getMe: (email: string) =>
        fetcher(`/api/auth/me?email=${encodeURIComponent(email)}`),
};

// ============ USERS API ============

export const usersApi = {
    getById: (id: string) => fetcher(`/api/users/${id}`),

    update: (id: string, data: unknown) => putData(`/api/users/${id}`, data),

    toggleAvailability: (id: string, isAvailable: boolean) =>
        putData(`/api/users/${id}/availability?is_available=${isAvailable}`),

    getCharities: () => fetcher('/api/users/charities'),

    getAvailableVolunteers: () => fetcher('/api/users/volunteers/available'),
};

// ============ LISTINGS API ============

export const listingsApi = {
    getAll: (params?: { status?: string; food_category?: string; page?: number; page_size?: number }) => {
        const searchParams = new URLSearchParams();
        if (params) {
            Object.entries(params).forEach(([key, value]) => {
                if (value !== undefined) searchParams.append(key, String(value));
            });
        }
        const query = searchParams.toString();
        return fetcher(`/api/v1/listings${query ? `?${query}` : ''}`);
    },

    getNearby: (lat: number, lng: number, radiusMeters = 5000, foodCategory?: string) => {
        let url = `/api/v1/listings/nearby?lat=${lat}&lng=${lng}&radius_meters=${radiusMeters}`;
        if (foodCategory) url += `&food_category=${foodCategory}`;
        return fetcher(url);
    },

    getByDonor: (donorId: string, status?: string) => {
        let url = `/api/v1/listings/donor/${donorId}`;
        if (status) url += `?status=${status}`;
        return fetcher(url);
    },

    getById: (id: string) => fetcher(`/api/v1/listings/${id}`),

    create: (data: unknown) => postData('/api/v1/listings', data),

    update: (id: string, data: unknown) => putData(`/api/v1/listings/${id}`, data),

    delete: (id: string) => deleteData(`/api/v1/listings/${id}`),

    cancel: (id: string) => postData(`/api/v1/listings/${id}/cancel`, {}),

    getStats: (donorId?: string) => {
        let url = '/api/v1/listings/stats/summary';
        if (donorId) url += `?donor_id=${donorId}`;
        return fetcher(url);
    },
};

// ============ ROUTES API ============

export const routesApi = {
    optimize: (data: { volunteer_lat: number; volunteer_lng: number; charity_id: string; listing_ids: string[] }) =>
        postData('/api/v1/routes/optimize', data),

    getById: (id: string) => fetcher(`/api/v1/routes/${id}`),

    reoptimize: (id: string, currentLat: number, currentLng: number, skipListingIds: string[] = []) =>
        postData(`/api/v1/routes/${id}/reoptimize?current_lat=${currentLat}&current_lng=${currentLng}`, { skip_listing_ids: skipListingIds }),
};

// ============ DELIVERIES API ============

export const deliveriesApi = {
    getAll: (status?: string) => {
        let url = '/api/v1/deliveries';
        if (status) url += `?status=${status}`;
        return fetcher(url);
    },

    getByVolunteer: (volunteerId: string, activeOnly = false) => {
        let url = `/api/v1/deliveries/volunteer/${volunteerId}`;
        if (activeOnly) url += '?active_only=true';
        return fetcher(url);
    },

    getByCharity: (charityId: string, incomingOnly = false) => {
        let url = `/api/v1/deliveries/charity/${charityId}`;
        if (incomingOnly) url += '?incoming_only=true';
        return fetcher(url);
    },

    getById: (id: string) => fetcher(`/api/v1/deliveries/${id}`),

    create: (data: unknown) => postData('/api/v1/deliveries', data),

    updateStatus: (id: string, status: string, notes?: string, checklist?: Record<string, boolean>) =>
        putData(`/api/v1/deliveries/${id}/status`, { status, notes, checklist }),

    confirm: (id: string, notes?: string) =>
        putData(`/api/v1/deliveries/${id}/confirm${notes ? `?notes=${encodeURIComponent(notes)}` : ''}`),

    track: (id: string) => fetcher(`/api/v1/deliveries/${id}/track`),

    getStats: (userId?: string, role?: string) => {
        let url = '/api/v1/deliveries/stats/summary';
        if (userId && role) url += `?user_id=${userId}&role=${role}`;
        return fetcher(url);
    },
};

// ============ MATCHING API ============

export const matchingApi = {
    getSuggestions: (listingId: string, maxResults = 5) =>
        fetcher(`/api/v1/matching/suggestions/${listingId}?max_results=${maxResults}`),

    run: (listingId: string, autoAssign = false) =>
        postData(`/api/v1/matching/run/${listingId}?auto_assign=${autoAssign}`, {}),

    runBatch: (listingIds: string[], autoAssign = false) =>
        postData(`/api/v1/matching/batch?auto_assign=${autoAssign}`, listingIds),
};

// ============ FEEDBACK API ============

export const feedbackApi = {
    create: (fromUserId: string, data: unknown) =>
        postData(`/api/v1/feedback?from_user_id=${fromUserId}`, data),

    getByUser: (userId: string) => fetcher(`/api/v1/feedback/user/${userId}`),

    getByDelivery: (deliveryId: string) => fetcher(`/api/v1/feedback/delivery/${deliveryId}`),

    getReliability: (userId: string) => fetcher(`/api/v1/feedback/reliability/${userId}`),
};

// ============ ANALYTICS API ============

export const analyticsApi = {
    getPlatform: () => fetcher('/api/v1/analytics/platform'),

    getImpact: (userId?: string, days = 30) => {
        let url = `/api/v1/analytics/impact?days=${days}`;
        if (userId) url += `&user_id=${userId}`;
        return fetcher(url);
    },

    getUserImpact: (userId: string) => fetcher(`/api/v1/analytics/impact/user/${userId}`),

    getAreaImpact: (gridSize = 0.1) => fetcher(`/api/v1/analytics/impact/area?grid_size=${gridSize}`),

    getMealsTrend: (period: 'daily' | 'weekly' | 'monthly' = 'daily', days = 30) =>
        fetcher(`/api/v1/analytics/trends/meals?period=${period}&days=${days}`),

    getDeliveriesTrend: (period: 'daily' | 'weekly' | 'monthly' = 'daily', days = 30) =>
        fetcher(`/api/v1/analytics/trends/deliveries?period=${period}&days=${days}`),

    getVolunteerLeaderboard: (limit = 10) => fetcher(`/api/v1/analytics/leaderboard/volunteers?limit=${limit}`),

    getDonorLeaderboard: (limit = 10) => fetcher(`/api/v1/analytics/leaderboard/donors?limit=${limit}`),
};

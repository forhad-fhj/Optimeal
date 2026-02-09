'use client';

import dynamic from 'next/dynamic';
import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { listingsApi, routesApi, deliveriesApi, usersApi } from '@/lib/api';
import { FoodListing, RoutePoint, RouteResponse, UserBrief, DeliveryStats, FoodCategory } from '@/types';

// Dynamic import for Map to avoid SSR issues with Leaflet
const Map = dynamic(() => import('@/components/Map'), { ssr: false });

// Category display
const CATEGORY_EMOJI: Record<FoodCategory, string> = {
    prepared: '🍲',
    bakery: '🥖',
    produce: '🥬',
    dairy: '🧀',
    meat: '🥩',
    perishable: '❄️',
    non_perishable: '📦',
    mixed: '📋',
};

export default function VolunteerPage() {
    const { data: session } = useSession();
    const [position, setPosition] = useState<[number, number] | undefined>(undefined);
    const [listings, setListings] = useState<FoodListing[]>([]);
    const [charities, setCharities] = useState<UserBrief[]>([]);
    const [selectedListings, setSelectedListings] = useState<string[]>([]);
    const [selectedCharity, setSelectedCharity] = useState<string>('');
    const [route, setRoute] = useState<RoutePoint[]>([]);
    const [routeInfo, setRouteInfo] = useState<{ distance: number; duration: number } | null>(null);
    const [stats, setStats] = useState<DeliveryStats | null>(null);
    const [isAvailable, setIsAvailable] = useState(false);
    const [loading, setLoading] = useState(true);
    const [calculating, setCalculating] = useState(false);
    const [claiming, setClaiming] = useState(false);

    const userId = typeof window !== 'undefined' ? localStorage.getItem('optimeal_user_id') : null;

    // Get user location
    useEffect(() => {
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                const { latitude, longitude } = pos.coords;
                setPosition([latitude, longitude]);
            },
            (err) => {
                console.error('Geolocation error:', err);
                // Default to a location if geolocation fails
                setPosition([23.8103, 90.4125]); // Dhaka
            }
        );
    }, []);

    // Fetch data when position is available
    const fetchData = useCallback(async () => {
        if (!position) return;

        setLoading(true);
        try {
            const [listingsData, charitiesData] = await Promise.all([
                listingsApi.getNearby(position[0], position[1], 10000) as Promise<FoodListing[]>,
                usersApi.getCharities() as Promise<UserBrief[]>,
            ]);

            setListings(listingsData);
            setCharities(charitiesData);

            // Get stats if user is logged in
            if (userId) {
                const statsData = await deliveriesApi.getStats(userId, 'volunteer') as DeliveryStats;
                setStats(statsData);
            }
        } catch (err) {
            console.error('Failed to fetch data:', err);
        } finally {
            setLoading(false);
        }
    }, [position, userId]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const toggleListing = (id: string) => {
        setSelectedListings(prev =>
            prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
        );
        // Clear route when selection changes
        setRoute([]);
        setRouteInfo(null);
    };

    const toggleAvailability = async () => {
        if (!userId) {
            alert('Please login to toggle availability');
            return;
        }

        try {
            await usersApi.toggleAvailability(userId, !isAvailable);
            setIsAvailable(!isAvailable);
        } catch (err) {
            console.error('Failed to toggle availability:', err);
            alert('Failed to update availability');
        }
    };

    const calculateRoute = async () => {
        if (!position || selectedListings.length === 0 || !selectedCharity) {
            alert('Please select listings and a charity');
            return;
        }

        setCalculating(true);
        try {
            const data = await routesApi.optimize({
                volunteer_lat: position[0],
                volunteer_lng: position[1],
                charity_id: selectedCharity,
                listing_ids: selectedListings,
            }) as RouteResponse;

            setRoute(data.stops);
            setRouteInfo({
                distance: data.total_distance_km,
                duration: data.estimated_duration_minutes,
            });
        } catch (err) {
            console.error('Failed to calculate route:', err);
            alert('Failed to calculate route');
        } finally {
            setCalculating(false);
        }
    };

    const claimDelivery = async () => {
        if (route.length === 0 || !selectedCharity || !userId) {
            alert('Please calculate a route first');
            return;
        }

        setClaiming(true);
        try {
            await deliveriesApi.create({
                volunteer_id: userId,
                charity_id: selectedCharity,
                listing_ids: selectedListings,
                optimized_route_data: route,
            });

            alert('Delivery claimed successfully!');

            // Reset state
            setSelectedListings([]);
            setRoute([]);
            setRouteInfo(null);

            // Refresh listings
            fetchData();
        } catch (err) {
            console.error('Failed to claim delivery:', err);
            alert('Failed to claim delivery');
        } finally {
            setClaiming(false);
        }
    };

    const getTimeRemaining = (expiresAt: string) => {
        const diff = new Date(expiresAt).getTime() - Date.now();
        if (diff < 0) return 'Expired';
        const hours = Math.floor(diff / (1000 * 60 * 60));
        if (hours < 1) return `${Math.floor(diff / (1000 * 60))}m`;
        if (hours < 24) return `${hours}h`;
        return `${Math.floor(hours / 24)}d`;
    };

    if (!session) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-blue-50">
                <div className="text-center p-8 bg-white rounded-2xl shadow-xl">
                    <h2 className="text-2xl font-bold text-gray-800 mb-4">Volunteer Dashboard</h2>
                    <p className="text-gray-600 mb-6">Please sign in to start delivering food</p>
                    <Button className="bg-green-600 hover:bg-green-700">Sign In</Button>
                </div>
            </div>
        );
    }

    return (
        <div className="h-[calc(100vh-64px)] flex flex-col bg-gray-50">
            {/* Top Bar */}
            <div className="bg-white border-b shadow-sm z-20">
                <div className="max-w-7xl mx-auto px-4 py-4">
                    <div className="flex flex-wrap items-center justify-between gap-4">
                        {/* Left: Title & Stats */}
                        <div className="flex items-center gap-6">
                            <div>
                                <h1 className="text-xl font-bold text-gray-900">Volunteer Map</h1>
                                <p className="text-sm text-gray-500">
                                    {loading ? 'Loading...' : `${listings.length} pickups nearby`}
                                </p>
                            </div>

                            {stats && (
                                <div className="hidden md:flex items-center gap-4 pl-6 border-l">
                                    <div className="text-center">
                                        <p className="text-2xl font-bold text-green-600">{stats.completed_deliveries}</p>
                                        <p className="text-xs text-gray-500">Completed</p>
                                    </div>
                                    <div className="text-center">
                                        <p className="text-2xl font-bold text-blue-600">{stats.active_deliveries}</p>
                                        <p className="text-xs text-gray-500">Active</p>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Right: Controls */}
                        <div className="flex items-center gap-3">
                            {/* Availability Toggle */}
                            <button
                                onClick={toggleAvailability}
                                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors ${isAvailable
                                        ? 'bg-green-100 text-green-800 hover:bg-green-200'
                                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                    }`}
                            >
                                <span className={`w-2 h-2 rounded-full ${isAvailable ? 'bg-green-500' : 'bg-gray-400'}`} />
                                {isAvailable ? 'Available' : 'Unavailable'}
                            </button>

                            {/* Charity Selector */}
                            <select
                                value={selectedCharity}
                                onChange={e => setSelectedCharity(e.target.value)}
                                className="px-4 py-2 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-green-500 focus:border-transparent"
                            >
                                <option value="">Select Charity</option>
                                {charities.map(c => (
                                    <option key={c.id} value={c.id}>{c.name}</option>
                                ))}
                            </select>

                            {/* Calculate Route Button */}
                            <Button
                                onClick={calculateRoute}
                                disabled={selectedListings.length === 0 || !selectedCharity || calculating}
                                className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
                            >
                                {calculating ? 'Calculating...' : `Route (${selectedListings.length})`}
                            </Button>

                            {/* Claim Delivery Button */}
                            <Button
                                onClick={claimDelivery}
                                disabled={route.length === 0 || claiming}
                                className="bg-green-600 hover:bg-green-700 disabled:opacity-50"
                            >
                                {claiming ? 'Claiming...' : 'Claim Delivery'}
                            </Button>
                        </div>
                    </div>

                    {/* Route Info Bar */}
                    {routeInfo && (
                        <div className="mt-4 p-3 bg-blue-50 rounded-xl flex items-center justify-between">
                            <div className="flex items-center gap-6">
                                <div className="flex items-center gap-2">
                                    <span className="text-blue-600">📍</span>
                                    <span className="font-medium">{route.length} stops</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="text-blue-600">🛣️</span>
                                    <span className="font-medium">{routeInfo.distance.toFixed(1)} km</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="text-blue-600">⏱️</span>
                                    <span className="font-medium">~{routeInfo.duration} min</span>
                                </div>
                            </div>
                            <Button
                                onClick={() => window.open(`https://www.google.com/maps/dir/${route.map(s => `${s.lat},${s.lng}`).join('/')}`, '_blank')}
                                variant="outline"
                                size="sm"
                            >
                                Open in Maps
                            </Button>
                        </div>
                    )}
                </div>
            </div>

            {/* Main Content: Map + Sidebar */}
            <div className="flex-grow flex overflow-hidden">
                {/* Sidebar: Listings */}
                <div className="w-80 bg-white border-r overflow-y-auto hidden lg:block">
                    <div className="p-4 border-b bg-gray-50">
                        <h3 className="font-semibold text-gray-900">Available Pickups</h3>
                        <p className="text-sm text-gray-500">Select items to add to your route</p>
                    </div>

                    {loading ? (
                        <div className="p-8 text-center">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mx-auto"></div>
                        </div>
                    ) : listings.length === 0 ? (
                        <div className="p-8 text-center text-gray-500">
                            <p>No pickups nearby</p>
                        </div>
                    ) : (
                        <div className="divide-y">
                            {listings.map(listing => (
                                <button
                                    key={listing.id}
                                    onClick={() => toggleListing(listing.id)}
                                    className={`w-full p-4 text-left transition-colors hover:bg-gray-50 ${selectedListings.includes(listing.id) ? 'bg-green-50 border-l-4 border-green-500' : ''
                                        }`}
                                >
                                    <div className="flex items-start gap-3">
                                        <span className="text-2xl">
                                            {CATEGORY_EMOJI[listing.food_category] || '📦'}
                                        </span>
                                        <div className="flex-grow min-w-0">
                                            <p className="font-medium text-gray-900 truncate">{listing.title}</p>
                                            <p className="text-sm text-gray-500">{listing.quantity_kg} kg</p>
                                            <div className="flex items-center gap-2 mt-1">
                                                <span className={`text-xs px-2 py-0.5 rounded-full ${new Date(listing.expires_at).getTime() - Date.now() < 3600000
                                                        ? 'bg-red-100 text-red-700'
                                                        : 'bg-gray-100 text-gray-600'
                                                    }`}>
                                                    {getTimeRemaining(listing.expires_at)}
                                                </span>
                                                {listing.requires_refrigeration && (
                                                    <span className="text-xs text-blue-600">❄️ Cold</span>
                                                )}
                                            </div>
                                        </div>
                                        {selectedListings.includes(listing.id) && (
                                            <span className="text-green-600 text-xl">✓</span>
                                        )}
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* Map */}
                <div className="flex-grow relative">
                    <Map
                        volunteerLocation={position}
                        listings={listings}
                        route={route}
                        onSelectListing={toggleListing}
                        selectedListings={selectedListings}
                    />
                </div>
            </div>
        </div>
    );
}

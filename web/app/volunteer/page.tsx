'use client';

import dynamic from 'next/dynamic';
import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { listingsApi, routesApi, deliveriesApi, usersApi } from '@/lib/api';
import { FoodListing, RoutePoint, RouteResponse, UserBrief, DeliveryStats, FoodCategory } from '@/types';
import { MapPin, Navigation, Clock, CheckCircle2, Truck, ChevronLeft, ChevronRight, Menu } from 'lucide-react';

// Dynamic import for Map to avoid SSR issues with Leaflet
const Map = dynamic(() => import('@/components/Map'), { ssr: false });

const CATEGORY_ICONS: Record<FoodCategory, string> = {
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
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);

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
                setPosition([23.8103, 90.4125]); // Default: Dhaka
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
        setRoute([]);
        setRouteInfo(null);
    };

    const toggleAvailability = async () => {
        if (!userId) return;
        try {
            await usersApi.toggleAvailability(userId, !isAvailable);
            setIsAvailable(!isAvailable);
        } catch (err) {
            console.error('Failed to toggle availability:', err);
        }
    };

    const calculateRoute = async () => {
        if (!position || selectedListings.length === 0 || !selectedCharity) {
            alert('Please select listings and a charity destination.');
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
            alert('Could not calculate optimal route.');
        } finally {
            setCalculating(false);
        }
    };

    const claimDelivery = async () => {
        if (route.length === 0 || !selectedCharity || !userId) return;

        setClaiming(true);
        try {
            await deliveriesApi.create({
                volunteer_id: userId,
                charity_id: selectedCharity,
                listing_ids: selectedListings,
                optimized_route_data: route,
            });

            alert('Delivery claimed! Check your dashboard for details.');
            setSelectedListings([]);
            setRoute([]);
            setRouteInfo(null);
            fetchData();
        } catch (err) {
            console.error('Failed to claim delivery:', err);
            alert('Failed to claim delivery. Please try again.');
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
            <div className="min-h-screen flex items-center justify-center bg-slate-50">
                <div className="text-center p-8 bg-white rounded-2xl shadow-sm border border-slate-200 max-w-md w-full">
                    <h2 className="text-2xl font-bold text-slate-900 mb-2">Volunteer Portal</h2>
                    <p className="text-slate-500 mb-8">Sign in to start recovering food and helping your community.</p>
                    <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white" onClick={() => (window.location.href = '/api/auth/signin')}>
                        Sign In
                    </Button>
                </div>
            </div>
        );
    }

    return (
        <div className="h-[calc(100vh-64px)] flex flex-col bg-slate-50 relative overflow-hidden">
            {/* Map Area */}
            <div className="absolute inset-0 z-0">
                <Map
                    volunteerLocation={position}
                    listings={listings}
                    route={route}
                    onSelectListing={toggleListing}
                    selectedListings={selectedListings}
                />
            </div>

            {/* Floating Stats Bar (Desktop) */}
            <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 hidden md:flex bg-white/90 backdrop-blur-md shadow-lg rounded-full px-6 py-2 border border-slate-200 gap-8 items-center">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-emerald-100 rounded-full text-emerald-600">
                        <CheckCircle2 size={18} />
                    </div>
                    <div>
                        <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">Completed</p>
                        <p className="text-lg font-bold text-slate-900 leading-none">{stats?.completed_deliveries || 0}</p>
                    </div>
                </div>
                <div className="w-px h-8 bg-slate-200"></div>
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-100 rounded-full text-blue-600">
                        <Truck size={18} />
                    </div>
                    <div>
                        <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">Active</p>
                        <p className="text-lg font-bold text-slate-900 leading-none">{stats?.active_deliveries || 0}</p>
                    </div>
                </div>
                <div className="w-px h-8 bg-slate-200"></div>
                <button
                    onClick={toggleAvailability}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${isAvailable
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : 'bg-slate-50 text-slate-600 border border-slate-200'
                        }`}
                >
                    <div className={`w-2 h-2 rounded-full ${isAvailable ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`} />
                    {isAvailable ? 'Online' : 'Offline'}
                </button>
            </div>

            {/* Sidebar Controls */}
            <div
                className={`absolute left-0 top-0 bottom-0 bg-white shadow-2xl z-20 transition-transform duration-300 ease-in-out border-r border-slate-200 flex flex-col ${isSidebarOpen ? 'translate-x-0 w-full md:w-96' : '-translate-x-full w-0'
                    }`}
            >
                {/* Sidebar Header */}
                <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-white sticky top-0 z-10">
                    <div>
                        <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                            <Navigation className="text-blue-600" size={20} />
                            Route Planner
                        </h1>
                        <p className="text-sm text-slate-500 mt-1">{listings.length} pickups available</p>
                    </div>
                    <button onClick={() => setIsSidebarOpen(false)} className="md:hidden p-2 hover:bg-slate-100 rounded-lg">
                        <ChevronLeft size={20} />
                    </button>
                </div>

                {/* Main Content Areas */}
                <div className="flex-grow overflow-y-auto">
                    {/* Action Panel */}
                    <div className="p-5 space-y-4 bg-slate-50/50 border-b border-slate-100">
                        <div>
                            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 block">
                                Delivery Destination
                            </label>
                            <select
                                value={selectedCharity}
                                onChange={e => setSelectedCharity(e.target.value)}
                                className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                            >
                                <option value="">Select Charity...</option>
                                {charities.map(c => (
                                    <option key={c.id} value={c.id}>{c.name}</option>
                                ))}
                            </select>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <Button
                                onClick={calculateRoute}
                                disabled={selectedListings.length === 0 || !selectedCharity || calculating}
                                className="bg-blue-600 hover:bg-blue-700 text-white w-full"
                                size="sm"
                            >
                                {calculating ? 'Working...' : 'Optimize Route'}
                            </Button>
                            <Button
                                onClick={claimDelivery}
                                disabled={route.length === 0 || claiming}
                                className="bg-emerald-600 hover:bg-emerald-700 text-white w-full"
                                size="sm"
                            >
                                {claiming ? 'Claiming...' : 'Start Delivery'}
                            </Button>
                        </div>

                        {routeInfo && (
                            <div className="mt-4 p-3 bg-blue-50 border border-blue-100 rounded-lg flex justify-between items-center text-sm">
                                <div className="text-blue-900">
                                    <span className="font-semibold">{routeInfo.distance.toFixed(1)} km</span>
                                    <span className="mx-1">•</span>
                                    <span>~{routeInfo.duration} mins</span>
                                </div>
                                <span className="text-blue-600 font-medium">{route.length} stops</span>
                            </div>
                        )}
                    </div>

                    {/* Listings Feed */}
                    <div className="p-2">
                        <h3 className="px-3 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wider sticky top-0 bg-white/95 backdrop-blur z-10">
                            Nearby Pickups
                        </h3>
                        {loading ? (
                            <div className="py-10 text-center">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto opacity-50"></div>
                            </div>
                        ) : listings.length === 0 ? (
                            <div className="text-center py-10 px-4">
                                <span className="text-4xl block mb-2">🌿</span>
                                <p className="text-slate-500 text-sm">No food to rescue nearby right now.</p>
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {listings.map(listing => {
                                    const isSelected = selectedListings.includes(listing.id);
                                    return (
                                        <div
                                            key={listing.id}
                                            onClick={() => toggleListing(listing.id)}
                                            className={`p-3 rounded-xl border transition-all cursor-pointer hover:shadow-md ${isSelected
                                                    ? 'bg-blue-50 border-blue-200 shadow-sm ring-1 ring-blue-100'
                                                    : 'bg-white border-slate-100 hover:border-blue-200'
                                                }`}
                                        >
                                            <div className="flex items-start gap-3">
                                                <span className="text-2xl bg-slate-50 p-2 rounded-lg">
                                                    {CATEGORY_ICONS[listing.food_category] || '📦'}
                                                </span>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex justify-between items-start">
                                                        <h4 className={`font-semibold text-sm truncate ${isSelected ? 'text-blue-900' : 'text-slate-900'}`}>
                                                            {listing.title}
                                                        </h4>
                                                        {isSelected && <CheckCircle2 size={16} className="text-blue-600 flex-shrink-0" />}
                                                    </div>
                                                    <p className="text-xs text-slate-500 mt-0.5">{listing.quantity_kg} kg • {listing.address?.split(',')[0]}</p>
                                                    <div className="flex items-center gap-2 mt-2">
                                                        <span className={`inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded ${new Date(listing.expires_at).getTime() - Date.now() < 3600000
                                                                ? 'bg-rose-50 text-rose-600'
                                                                : 'bg-slate-100 text-slate-600'
                                                            }`}>
                                                            <Clock size={10} />
                                                            {getTimeRemaining(listing.expires_at)}
                                                        </span>
                                                        {listing.requires_refrigeration && (
                                                            <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-cyan-50 text-cyan-700">❄️ Cold</span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>

                {/* Sidebar Footer */}
                <div className="p-4 border-t border-slate-100 bg-slate-50 text-xs text-slate-400 text-center">
                    OptiMeal Logistics v1.0
                </div>
            </div>

            {/* Closed Sidebar Trigger */}
            {!isSidebarOpen && (
                <button
                    onClick={() => setIsSidebarOpen(true)}
                    className="absolute left-4 top-4 z-20 bg-white p-3 rounded-full shadow-lg border border-slate-200 hover:bg-slate-50 transition-transform hover:scale-105"
                >
                    <Menu size={24} className="text-slate-700" />
                </button>
            )}
        </div>
    );
}

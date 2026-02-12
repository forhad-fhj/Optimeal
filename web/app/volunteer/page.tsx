'use client';

import dynamic from 'next/dynamic';
import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/toast';
import { listingsApi, routesApi, deliveriesApi, usersApi } from '@/lib/api';
import { FoodListing, RoutePoint, RouteResponse, UserBrief, DeliveryStats, FoodCategory, Delivery } from '@/types';
import {
    MapPin, Navigation, Clock, CheckCircle2, Truck, ChevronLeft, ChevronRight,
    Menu, Search, Crosshair, Package, Phone, Calendar, ArrowRight, User
} from 'lucide-react';

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

// Extended interface for active deliveries to hold listing details
interface DeliveryWithDetails extends Delivery {
    listings_details?: FoodListing[];
}

export default function VolunteerPage() {
    const { data: session } = useSession();
    const { success, error } = useToast();

    // State
    const [position, setPosition] = useState<[number, number] | undefined>(undefined);
    const [listings, setListings] = useState<FoodListing[]>([]);
    const [charities, setCharities] = useState<UserBrief[]>([]);

    // Selection & Routing
    const [selectedListings, setSelectedListings] = useState<string[]>([]);
    const [selectedCharity, setSelectedCharity] = useState<string>('');
    const [route, setRoute] = useState<RoutePoint[]>([]);
    const [routeInfo, setRouteInfo] = useState<{ distance: number; duration: number } | null>(null);

    // Dashboard Data
    const [stats, setStats] = useState<DeliveryStats | null>(null);
    const [activeDeliveries, setActiveDeliveries] = useState<DeliveryWithDetails[]>([]);
    const [completedDeliveries, setCompletedDeliveries] = useState<Delivery[]>([]);

    // UI State
    const [activeTab, setActiveTab] = useState<'current' | 'completed' | 'browse'>('current');
    const [isAvailable, setIsAvailable] = useState(false);
    const [loading, setLoading] = useState(true);
    const [calculating, setCalculating] = useState(false);
    const [claiming, setClaiming] = useState(false);
    const [locationDenied, setLocationDenied] = useState(false);
    const [locationSearch, setLocationSearch] = useState('');
    const [searchingLocation, setSearchingLocation] = useState(false);

    const userId = typeof window !== 'undefined' ? localStorage.getItem('optimeal_user_id') : null;

    // Get user location
    useEffect(() => {
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                setPosition([pos.coords.latitude, pos.coords.longitude]);
                setLocationDenied(false);
            },
            (err) => {
                console.error('Geolocation error:', err);
                setLocationDenied(true);
            }
        );
    }, []);

    // Fetch Data
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

                // Fetch all deliveries and split
                const allDeliveries = await deliveriesApi.getByVolunteer(userId, false) as Delivery[];
                const active = allDeliveries.filter(d => !['delivered', 'confirmed', 'cancelled', 'failed'].includes(d.status));
                const history = allDeliveries.filter(d => ['delivered', 'confirmed', 'cancelled', 'failed'].includes(d.status));

                // Enrich active deliveries with detail
                const enrichedActive = await Promise.all(active.map(async (d) => {
                    // Fetch listing details for payload info
                    try {
                        const details = await Promise.all(d.listing_ids.map(id => listingsApi.getById(id)));
                        return { ...d, listings_details: details as FoodListing[] };
                    } catch (e) {
                        return d;
                    }
                }));

                setActiveDeliveries(enrichedActive);
                setCompletedDeliveries(history);

                // If we have active deliveries, default to 'current' tab, else 'browse'
                if (active.length === 0 && activeTab === 'current') {
                    setActiveTab('browse');
                } else if (active.length > 0 && activeTab === 'browse') {
                    setActiveTab('current');
                }
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

    const toggleAvailability = async () => {
        if (!userId) return;
        try {
            await usersApi.toggleAvailability(userId, !isAvailable);
            setIsAvailable(!isAvailable);
        } catch (err) {
            console.error('Failed to toggle availability:', err);
        }
    };

    const toggleListing = (id: string) => {
        setSelectedListings(prev =>
            prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
        );
        setRoute([]);
        setRouteInfo(null);
    };

    const calculateRoute = async () => {
        if (!position || selectedListings.length === 0 || !selectedCharity) return;
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
            error('Route Failed', 'Could not calculate route.');
        } finally {
            setCalculating(false);
        }
    };

    const claimDelivery = async () => {
        if (route.length === 0 || !selectedCharity || !userId) return;
        setClaiming(true);
        try {
            if (!isAvailable) {
                await usersApi.toggleAvailability(userId, true);
                setIsAvailable(true);
            }
            await deliveriesApi.create({
                volunteer_id: userId,
                charity_id: selectedCharity,
                listing_ids: selectedListings,
                optimized_route_data: route,
            });
            success('Delivery Claimed!', 'Added to your Current Tasks.');
            setSelectedListings([]);
            setRoute([]);
            setRouteInfo(null);
            setActiveTab('current');
            fetchData();
        } catch (err) {
            error('Claim Failed', 'Could not claim delivery.');
        } finally {
            setClaiming(false);
        }
    };

    const completePickup = async (id: string) => {
        try {
            await deliveriesApi.updateStatus(id, 'picked_up');
            success('Pickup Confirmed', 'Proceed to drop-off location.');
            fetchData();
        } catch (e) {
            error('Update Failed', 'Could not update status.');
        }
    }

    const completeDelivery = async (id: string) => {
        try {
            await deliveriesApi.updateStatus(id, 'delivered');
            success('Delivery Completed', 'Great job!');
            fetchData();
        } catch (e) {
            error('Update Failed', 'Could not update status.');
        }
    }

    // Render Helpers
    if (!session) return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50">
            <div className="text-center p-8">
                <h2 className="text-2xl font-bold text-slate-900">Volunteer Portal</h2>
                <Button className="mt-4 bg-emerald-600" onClick={() => (window.location.href = '/api/auth/signin')}>Sign In</Button>
            </div>
        </div>
    );

    return (
        <div className="flex h-[calc(100vh-64px)] overflow-hidden bg-slate-50 font-sans">

            {/* === LEFT SIDEBAR (Fixed 400px) === */}
            <div className="w-[400px] flex-shrink-0 bg-white border-r border-slate-200 flex flex-col z-20 shadow-xl">

                {/* Header */}
                <div className="p-6 border-b border-slate-100 bg-white">
                    <div className="flex justify-between items-center mb-4">
                        <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                            <Navigation className="text-emerald-600" size={24} />
                            Route Planner
                        </h1>
                        <button
                            onClick={toggleAvailability}
                            className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold uppercase tracking-wider transition-colors ${isAvailable
                                ? 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                                : 'bg-slate-100 text-slate-500 border border-slate-200'}`}
                        >
                            <div className={`w-2 h-2 rounded-full ${isAvailable ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`} />
                            {isAvailable ? 'Online' : 'Offline'}
                        </button>
                    </div>

                    {/* Stats Row */}
                    <div className="grid grid-cols-3 gap-2">
                        <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 text-center">
                            <p className="text-[10px] text-slate-500 font-bold uppercase">Today</p>
                            <p className="text-lg font-bold text-slate-800">{stats?.total_deliveries || 0}</p> // using total for mock
                        </div>
                        <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 text-center">
                            <p className="text-[10px] text-slate-500 font-bold uppercase">Est. Time</p>
                            <p className="text-lg font-bold text-slate-800">{(routeInfo?.duration || 0)}m</p>
                        </div>
                        <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 text-center">
                            <p className="text-[10px] text-slate-500 font-bold uppercase">Impact</p>
                            <p className="text-lg font-bold text-emerald-600">{(stats?.total_deliveries || 0) * 5}</p> // mock meals
                        </div>
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-slate-200 bg-white">
                    <button onClick={() => setActiveTab('current')} className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider relative ${activeTab === 'current' ? 'text-emerald-600' : 'text-slate-400 hover:text-slate-600'}`}>
                        Current Tasks
                        {activeTab === 'current' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-emerald-600"></div>}
                    </button>
                    <button onClick={() => setActiveTab('completed')} className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider relative ${activeTab === 'completed' ? 'text-emerald-600' : 'text-slate-400 hover:text-slate-600'}`}>
                        Completed
                        {activeTab === 'completed' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-emerald-600"></div>}
                    </button>
                    <button onClick={() => setActiveTab('browse')} className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider relative ${activeTab === 'browse' ? 'text-emerald-600' : 'text-slate-400 hover:text-slate-600'}`}>
                        Browse
                        {activeTab === 'browse' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-emerald-600"></div>}
                    </button>
                </div>

                {/* Content Area */}
                <div className="flex-grow overflow-y-auto bg-slate-50 p-4 space-y-4">

                    {/* === CURRENT TASKS === */}
                    {activeTab === 'current' && (
                        activeDeliveries.length === 0 ? (
                            <div className="text-center py-10 opacity-60">
                                <Truck size={48} className="mx-auto text-slate-300 mb-3" />
                                <p className="text-slate-500 text-sm">No active tasks.</p>
                                <Button variant="link" onClick={() => setActiveTab('browse')} className="text-emerald-600 text-sm">Find Pickups</Button>
                            </div>
                        ) : (
                            activeDeliveries.map(delivery => (
                                <div key={delivery.id} className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                                    {/* Header */}
                                    <div className="bg-slate-50 p-3 border-b border-slate-100 flex justify-between items-center">
                                        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Delivery #{delivery.id.slice(0, 6)}</span>
                                        <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 text-[10px] font-bold uppercase rounded-full tracking-wide">
                                            {delivery.status.replace('_', ' ')}
                                        </span>
                                    </div>

                                    <div className="p-4 relative">
                                        {/* Connector Line */}
                                        <div className="absolute left-[29px] top-5 bottom-8 w-0.5 bg-slate-200"></div>

                                        {/* Pickup */}
                                        <div className="flex gap-4 mb-6 relative z-10">
                                            <div className="w-8 h-8 rounded-full bg-white border-2 border-emerald-500 shadow-sm flex items-center justify-center flex-shrink-0">
                                                <div className="w-2.5 h-2.5 rounded-full bg-emerald-500"></div>
                                            </div>
                                            <div className="flex-1">
                                                <p className="text-xs text-slate-400 font-bold uppercase mb-0.5">Pickup Location</p>
                                                <p className="font-bold text-slate-900">{delivery.listings_details?.[0]?.address || 'Unknown Address'}</p>
                                                <p className="text-sm text-slate-500">{delivery.listings_details?.[0]?.title || 'Multiple Items'}</p>
                                            </div>
                                        </div>

                                        {/* Dropoff */}
                                        <div className="flex gap-4 relative z-10">
                                            <div className="w-8 h-8 rounded-full bg-white border-2 border-rose-500 shadow-sm flex items-center justify-center flex-shrink-0">
                                                <div className="w-2.5 h-2.5 rounded-full bg-rose-500"></div>
                                            </div>
                                            <div className="flex-1">
                                                <p className="text-xs text-slate-400 font-bold uppercase mb-0.5">Drop-off Location</p>
                                                <p className="font-bold text-slate-900">{delivery.charity?.name || 'Charity'}</p>
                                                <p className="text-sm text-slate-500">Food Bank Destination</p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Metadata */}
                                    <div className="px-4 pb-4 flex gap-4 text-xs text-slate-500 border-b border-slate-100 pb-3 mb-3 mx-4">
                                        <div className="flex items-center gap-1.5 bg-slate-50 px-2 py-1 rounded-lg">
                                            <Clock size={14} className="text-amber-500" />
                                            <span>Pickup By {new Date(delivery.pickup_eta || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                        </div>
                                        <div className="flex items-center gap-1.5 bg-slate-50 px-2 py-1 rounded-lg">
                                            <Navigation size={14} className="text-blue-500" />
                                            <span>{delivery.total_distance_km?.toFixed(1) || '2.4'} km</span>
                                        </div>
                                        <div className="flex items-center gap-1.5 bg-slate-50 px-2 py-1 rounded-lg">
                                            <Package size={14} className="text-purple-500" />
                                            <span>{delivery.listings_details?.reduce((acc, l) => acc + l.quantity_kg, 0) || 5}kg Payload</span>
                                        </div>
                                    </div>

                                    {/* Actions */}
                                    <div className="p-4 pt-0 grid grid-cols-4 gap-2">
                                        <Button variant="outline" size="sm" className="col-span-1 border-slate-200 text-slate-600" title="Navigate">
                                            <Navigation size={16} />
                                        </Button>
                                        <Button variant="outline" size="sm" className="col-span-1 border-slate-200 text-slate-600" title="Call Contact">
                                            <Phone size={16} />
                                        </Button>
                                        {delivery.status === 'assigned' || delivery.status === 'en_route_pickup' ? (
                                            <Button size="sm" className="col-span-2 bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-200 shadow-lg" onClick={() => completePickup(delivery.id)}>
                                                Confirm Pickup
                                            </Button>
                                        ) : (
                                            <Button size="sm" className="col-span-2 bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-200 shadow-lg" onClick={() => completeDelivery(delivery.id)}>
                                                Complete Dropoff
                                            </Button>
                                        )}
                                    </div>
                                </div>
                            ))
                        )
                    )}

                    {/* === COMPLETED TASKS === */}
                    {activeTab === 'completed' && (
                        completedDeliveries.length === 0 ? (
                            <div className="text-center py-10 text-slate-400 text-sm">No completed tasks yet.</div>
                        ) : (
                            completedDeliveries.map(delivery => (
                                <div key={delivery.id} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm opacity-75">
                                    <div className="flex justify-between items-center mb-2">
                                        <span className="text-xs font-bold text-slate-400">#{delivery.id.slice(0, 6)}</span>
                                        <span className="text-xs font-medium text-emerald-600 flex items-center gap-1"><CheckCircle2 size={12} /> {new Date(delivery.created_at).toLocaleDateString()}</span>
                                    </div>
                                    <p className="text-sm font-semibold text-slate-800">{delivery.charity?.name || 'Charity'}</p>
                                    <p className="text-xs text-slate-500">Delivered successfully</p>
                                </div>
                            ))
                        )
                    )}

                    {/* === BROWSE === */}
                    {activeTab === 'browse' && (
                        <div className="space-y-4">
                            {/* Destination Select */}
                            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 block">Delivery Destination</label>
                                <select
                                    className="w-full text-sm p-2 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500"
                                    value={selectedCharity}
                                    onChange={e => setSelectedCharity(e.target.value)}
                                >
                                    <option value="">{charities.length === 0 ? 'No charities available' : 'Select Drop-off Point...'}</option>
                                    {charities.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                </select>
                            </div>

                            {/* Optimize & Claim */}
                            <div className="grid grid-cols-2 gap-2">
                                <Button size="sm" variant="outline" onClick={calculateRoute} disabled={calculating || !selectedCharity || selectedListings.length === 0}>
                                    {calculating ? 'Analyzing...' : 'Optimize Route'}
                                </Button>
                                <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white" onClick={claimDelivery} disabled={claiming || route.length === 0}>
                                    {claiming ? 'Confirming...' : 'Start Delivery'}
                                </Button>
                            </div>

                            {routeInfo && (
                                <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-lg flex justify-between text-emerald-800 text-sm font-medium">
                                    <span>{routeInfo.distance.toFixed(1)} km</span>
                                    <span>~{routeInfo.duration} mins</span>
                                </div>
                            )}

                            {/* Feed */}
                            <div className="space-y-2 mt-4">
                                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Nearby Pickups ({listings.length})</h3>
                                {listings.map(listing => (
                                    <div
                                        key={listing.id}
                                        onClick={() => toggleListing(listing.id)}
                                        className={`p-3 bg-white border rounded-xl cursor-pointer transition-all ${selectedListings.includes(listing.id) ? 'border-emerald-500 shadow-md ring-1 ring-emerald-500' : 'border-slate-200 hover:border-emerald-300'}`}
                                    >
                                        <div className="flex gap-3">
                                            <div className="text-2xl pt-1">
                                                {CATEGORY_ICONS[listing.food_category] || '📦'}
                                            </div>
                                            <div className="flex-1">
                                                <div className="flex justify-between">
                                                    <h4 className="text-sm font-bold text-slate-800">{listing.title}</h4>
                                                    {selectedListings.includes(listing.id) && <CheckCircle2 size={16} className="text-emerald-500" />}
                                                </div>
                                                <p className="text-xs text-slate-500 mt-1">{listing.quantity_kg}kg • {listing.address?.split(',')[0]}</p>
                                                <div className="flex gap-2 mt-2">
                                                    <span className="text-[10px] bg-slate-100 px-1.5 py-0.5 rounded text-slate-600 font-medium">Expires in 2h</span>
                                                    {listing.requires_refrigeration && <span className="text-[10px] bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded font-medium">Frozen</span>}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* === RIGHT MAP AREA === */}
            <div className="flex-grow relative h-full bg-slate-200">
                <Map
                    volunteerLocation={position}
                    listings={listings}
                    route={route}
                    onSelectListing={toggleListing}
                    selectedListings={selectedListings}
                />

                {/* Floating Recenter */}
                <button
                    onClick={() => {
                        // This would trigger a map flyTo if implemented
                        navigator.geolocation.getCurrentPosition(pos => setPosition([pos.coords.latitude, pos.coords.longitude]));
                    }}
                    className="absolute bottom-6 right-6 z-[1000] bg-white p-3 rounded-full shadow-lg text-slate-600 hover:text-emerald-600 transition-colors"
                >
                    <Crosshair size={24} />
                </button>
            </div>
        </div>
    );
}

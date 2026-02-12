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
    Menu, Search, Crosshair, Package, Phone, Calendar, ArrowRight, User,
    Zap, Award, TrendingUp, ShieldCheck, Camera, X, PenTool, UploadCloud, AlertCircle
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

// Extended interface for active deliveries
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

    // Mobile Sheet State
    const [isSheetOpen, setIsSheetOpen] = useState(true);

    // Verification Modal State
    const [verificationStep, setVerificationStep] = useState<'none' | 'photo' | 'signature'>('none');
    const [verifyingId, setVerifyingId] = useState<string | null>(null);
    const [uploadedPhoto, setUploadedPhoto] = useState<string | null>(null); // Mock URL
    const [recipientName, setRecipientName] = useState('');

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

                const allDeliveries = await deliveriesApi.getByVolunteer(userId, false) as Delivery[];
                const active = allDeliveries.filter(d => !['delivered', 'confirmed', 'cancelled', 'failed'].includes(d.status));
                const history = allDeliveries.filter(d => ['delivered', 'confirmed', 'cancelled', 'failed'].includes(d.status));

                const enrichedActive = await Promise.all(active.map(async (d) => {
                    try {
                        const details = await Promise.all(d.listing_ids.map(id => listingsApi.getById(id)));
                        return { ...d, listings_details: details as FoodListing[] };
                    } catch (e) {
                        return d;
                    }
                }));

                setActiveDeliveries(enrichedActive);
                setCompletedDeliveries(history);

                if (active.length > 0 && activeTab === 'browse') setActiveTab('current');
            }
        } catch (err) {
            console.error('Failed to fetch data:', err);
        } finally {
            setLoading(false);
        }
    }, [position, userId]); // Removing activeTab dependency to prevent loop

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    // Actions
    const toggleAvailability = async () => {
        if (!userId) return;
        try {
            await usersApi.toggleAvailability(userId, !isAvailable);
            setIsAvailable(!isAvailable);
        } catch (err) {
            console.error(err);
        }
    };

    const toggleListing = (id: string) => {
        setSelectedListings(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
        setRoute([]);
        setRouteInfo(null);
        if (window.innerWidth < 768) setIsSheetOpen(true);
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
            setRouteInfo({ distance: data.total_distance_km, duration: data.estimated_duration_minutes });
        } catch (err) { error('Route Failed', 'Could not optimize route.'); }
        finally { setCalculating(false); }
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
            success('Delivery Active', 'Route assigned. Drive safely!');
            setSelectedListings([]);
            setRoute([]);
            setRouteInfo(null);
            setActiveTab('current');
            fetchData();
        } catch (err) { error('Claim Failed', 'Could not assign delivery.'); }
        finally { setClaiming(false); }
    };

    const handleDropoffClick = (id: string) => {
        setVerifyingId(id);
        setVerificationStep('photo');
        setUploadedPhoto(null);
        setRecipientName('');
    }

    const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            // Mock upload - in real app would upload to S3/Cloudinary
            setTimeout(() => {
                setUploadedPhoto(URL.createObjectURL(e.target.files![0]));
            }, 1000); // Simulate upload delay
        }
    };

    const submitVerification = async () => {
        if (!verifyingId) return;
        try {
            await deliveriesApi.updateStatus(verifyingId, 'delivered', 'Delivery Complete');
            success('Delivery Verified!', 'Great job! Impact recorded.');
            setVerificationStep('none');
            setVerifyingId(null);
            fetchData();
        } catch (e) { error('Verification Failed', 'Could not complete delivery.'); }
    };

    const updateStatus = async (id: string, status: string, msg: string) => {
        try {
            await deliveriesApi.updateStatus(id, status);
            success(msg, 'Status updated.');
            fetchData();
        } catch (e) { error('Update Failed', 'Could not update status.'); }
    };

    if (!session) return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50">
            <div className="text-center p-8 bg-white/80 backdrop-blur-xl rounded-2xl shadow-xl border border-white/20">
                <h2 className="text-2xl font-bold text-slate-900">Volunteer Portal</h2>
                <Button className="mt-4 bg-emerald-600 hover:bg-emerald-700" onClick={() => window.location.href = '/api/auth/signin'}>Sign In Required</Button>
            </div>
        </div>
    );

    return (
        <div className="flex flex-col md:flex-row h-[calc(100vh-64px)] overflow-hidden bg-slate-50 relative">

            {/* === DESKTOP SIDEBAR / MOBILE BOTTOM SHEET === */}
            <div
                className={`
                    fixed md:static inset-x-0 bottom-0 z-30 
                    md:w-[420px] md:flex-shrink-0 md:h-full
                    bg-white/95 backdrop-blur-xl md:bg-white
                    border-t md:border-r md:border-t-0 border-slate-200 
                    shadow-[0_-4px_20px_-5px_rgba(0,0,0,0.1)] md:shadow-xl
                    transition-transform duration-300 ease-out
                    flex flex-col
                    ${isSheetOpen ? 'translate-y-0' : 'translate-y-[92%] md:translate-y-0'}
                    rounded-t-3xl md:rounded-none
                    h-[80vh] md:h-auto
                `}
            >
                {/* Drag Handle (Mobile) */}
                <div
                    className="md:hidden w-full p-2 flex justify-center cursor-grab active:cursor-grabbing"
                    onClick={() => setIsSheetOpen(!isSheetOpen)}
                >
                    <div className="w-12 h-1.5 bg-slate-300 rounded-full" />
                </div>

                {/* === DASHBOARD HEADER & STATS === */}
                <div className="px-6 py-4 border-b border-slate-100 bg-white/50">
                    <div className="flex justify-between items-center mb-4">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 shadow-sm border border-emerald-200">
                                <User size={20} />
                            </div>
                            <div>
                                <h1 className="text-sm font-bold text-slate-900 leading-tight">Volunteer Dashboard</h1>
                                <div className="flex items-center gap-1 text-[10px] text-slate-500 font-medium uppercase tracking-wide">
                                    <ShieldCheck size={10} className="text-emerald-500" /> Verified Driver
                                </div>
                            </div>
                        </div>
                        <button
                            onClick={toggleAvailability}
                            className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider transition-all shadow-sm active:scale-95 ${isAvailable
                                ? 'bg-emerald-500 text-white shadow-emerald-200 shadow-lg ring-2 ring-emerald-500 ring-offset-1'
                                : 'bg-slate-100 text-slate-500 border border-slate-200'}`}
                        >
                            <div className={`w-2 h-2 rounded-full bg-white ${isAvailable ? 'animate-pulse' : ''}`} />
                            {isAvailable ? 'Online' : 'Offline'}
                        </button>
                    </div>

                    {/* Quick Stats Row */}
                    <div className="grid grid-cols-4 gap-2 mb-2">
                        <div className="bg-slate-50 p-2 rounded-xl border border-slate-100 text-center">
                            <Truck size={14} className="mx-auto text-blue-500 mb-1" />
                            <p className="text-[10px] text-slate-400 font-bold uppercase">Total</p>
                            <p className="text-sm font-bold text-slate-800">{stats?.total_deliveries || 0}</p>
                        </div>
                        <div className="bg-slate-50 p-2 rounded-xl border border-slate-100 text-center">
                            <TrendingUp size={14} className="mx-auto text-emerald-500 mb-1" />
                            <p className="text-[10px] text-slate-400 font-bold uppercase">Impact</p>
                            <p className="text-sm font-bold text-slate-800">{(stats?.total_deliveries || 0) * 5}</p>
                        </div>
                        <div className="bg-slate-50 p-2 rounded-xl border border-slate-100 text-center">
                            <Zap size={14} className="mx-auto text-amber-500 mb-1" />
                            <p className="text-[10px] text-slate-400 font-bold uppercase">Streak</p>
                            <p className="text-sm font-bold text-slate-800">3d</p>
                        </div>
                        <div className="bg-slate-50 p-2 rounded-xl border border-slate-100 text-center">
                            <Award size={14} className="mx-auto text-purple-500 mb-1" />
                            <p className="text-[10px] text-slate-400 font-bold uppercase">Rank</p>
                            <p className="text-sm font-bold text-slate-800">Gold</p>
                        </div>
                    </div>
                </div>

                {/* TABS */}
                <div className="flex border-b border-slate-200 bg-white sticky top-0 z-10">
                    {['current', 'browse', 'completed'].map(tab => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab as any)}
                            className={`flex-1 py-3 text-[11px] font-bold uppercase tracking-wider transition-colors relative 
                                ${activeTab === tab ? 'text-emerald-600 bg-emerald-50/50' : 'text-slate-400 hover:text-slate-600'}`
                            }
                        >
                            {tab}
                            {activeTab === tab && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-emerald-600" />}
                        </button>
                    ))}
                </div>

                {/* SCROLLABLE CONTENT */}
                <div className="flex-grow overflow-y-auto p-4 space-y-4 bg-slate-50/50">

                    {/* CURRENT TASKS */}
                    {activeTab === 'current' && (
                        activeDeliveries.length === 0 ? (
                            <div className="text-center py-12 px-4 rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50">
                                <Truck size={40} className="mx-auto text-slate-300 mb-3" />
                                <p className="text-slate-500 text-sm font-medium">You're available for tasks.</p>
                                <p className="text-slate-400 text-xs mt-1">Check "Browse" to find pickups nearby.</p>
                                <Button variant="outline" size="sm" onClick={() => setActiveTab('browse')} className="mt-4 border-slate-200 text-slate-600">
                                    Find Pickups
                                </Button>
                            </div>
                        ) : (
                            activeDeliveries.map(d => {
                                // Determine state colors
                                const isPickedUp = d.status === 'picked_up' || d.status === 'en_route_delivery';
                                const statusColor = isPickedUp ? 'bg-purple-100 text-purple-700' : 'bg-amber-100 text-amber-700';

                                return (
                                    <div key={d.id} className="bg-white rounded-2xl shadow-lg shadow-slate-100 border border-slate-100 overflow-hidden ring-1 ring-slate-100">
                                        <div className="p-4 relative">
                                            <div className="absolute left-[29px] top-6 bottom-10 w-0.5 bg-gradient-to-b from-emerald-500 to-rose-500 opacity-20"></div>

                                            {/* Pickup */}
                                            <div className="flex gap-4 mb-6 relative">
                                                <div className="w-8 h-8 rounded-full bg-emerald-50 border-2 border-emerald-500 shadow-sm flex items-center justify-center flex-shrink-0 z-10">
                                                    <div className={`w-2.5 h-2.5 rounded-full bg-emerald-500 ${!isPickedUp ? 'animate-pulse' : ''}`}></div>
                                                </div>
                                                <div className={`flex-1 ${isPickedUp ? 'opacity-50' : ''}`}>
                                                    <div className="flex justify-between items-start">
                                                        <p className="text-[10px] text-emerald-600 font-bold uppercase tracking-wide mb-0.5">Pickup Point</p>
                                                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${statusColor}`}>{d.status.replace('_', ' ')}</span>
                                                    </div>
                                                    <p className="font-bold text-slate-900 text-sm">{d.listings_details?.[0]?.address || 'Pickup Location'}</p>
                                                    <p className="text-xs text-slate-500 mt-0.5">{d.listings_details?.[0]?.title || 'Multiple Items'}</p>
                                                </div>
                                            </div>

                                            {/* Dropoff */}
                                            <div className="flex gap-4 relative">
                                                <div className="w-8 h-8 rounded-full bg-rose-50 border-2 border-rose-500 shadow-sm flex items-center justify-center flex-shrink-0 z-10">
                                                    <div className={`w-2.5 h-2.5 rounded-full bg-rose-500 ${isPickedUp ? 'animate-pulse' : ''}`}></div>
                                                </div>
                                                <div className="flex-1">
                                                    <p className="text-[10px] text-rose-600 font-bold uppercase tracking-wide mb-0.5">Drop-off Point</p>
                                                    <p className="font-bold text-slate-900 text-sm">{d.charity?.name || 'Charity Organization'}</p>
                                                    <p className="text-xs text-slate-500 mt-0.5">Food Bank Destination</p>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Action Grid */}
                                        <div className="grid grid-cols-4 divide-x divide-slate-100 border-t border-slate-100 bg-slate-50/50">
                                            <button className="p-3 flex items-center justify-center text-slate-500 hover:bg-slate-50 hover:text-blue-600 transition-colors" title="Navigate">
                                                <Navigation size={18} />
                                            </button>
                                            <button className="p-3 flex items-center justify-center text-slate-500 hover:bg-slate-50 hover:text-emerald-600 transition-colors" title="Call">
                                                <Phone size={18} />
                                            </button>
                                            <div className="col-span-2 p-2">
                                                {!isPickedUp ? (
                                                    <Button className="w-full bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-200 text-xs h-full" onClick={() => updateStatus(d.id, 'picked_up', 'Pickup Confirmed')}>
                                                        Confirm Pickup
                                                    </Button>
                                                ) : (
                                                    <Button className="w-full bg-rose-600 hover:bg-rose-700 text-white shadow-md shadow-rose-200 text-xs h-full" onClick={() => handleDropoffClick(d.id)}>
                                                        Verify Dropoff
                                                    </Button>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                )
                            })
                        )
                    )}

                    {/* BROWSE */}
                    {activeTab === 'browse' && (
                        <div className="space-y-4">
                            {/* Destination Input */}
                            <div className="bg-white p-3 rounded-xl shadow-sm border border-slate-200">
                                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 block">Destination</label>
                                <select
                                    className="w-full text-sm p-2 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500 transition-shadow"
                                    value={selectedCharity}
                                    onChange={e => setSelectedCharity(e.target.value)}
                                >
                                    <option value="">Select Drop-off Point...</option>
                                    {charities.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                </select>
                            </div>

                            {/* Optimize Actions */}
                            <div className="grid grid-cols-2 gap-2">
                                <Button variant="outline" size="sm" onClick={calculateRoute} disabled={calculating || !selectedCharity} className="h-10 border-slate-200 bg-white hover:bg-slate-50 text-slate-700">
                                    {calculating ? 'Optimizing...' : 'Calculate Route'}
                                </Button>
                                <Button size="sm" className="h-10 bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-200" onClick={claimDelivery} disabled={claiming || route.length === 0}>
                                    {claiming ? 'Confirming...' : 'Accept Task'}
                                </Button>
                            </div>

                            {/* Listings */}
                            <div className="space-y-2 pb-20">
                                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Nearby Pickups</h3>
                                {listings.map(l => (
                                    <div
                                        key={l.id}
                                        onClick={() => toggleListing(l.id)}
                                        className={`group p-3 bg-white border rounded-xl cursor-pointer transition-all ${selectedListings.includes(l.id)
                                            ? 'border-emerald-500 shadow-md ring-1 ring-emerald-500 bg-emerald-50/10'
                                            : 'border-slate-200 hover:border-emerald-300 hover:shadow-sm'}`}
                                    >
                                        <div className="flex items-start gap-3">
                                            <span className="text-2xl p-2 bg-slate-50 rounded-lg group-hover:bg-white transition-colors">{CATEGORY_ICONS[l.food_category]}</span>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex justify-between items-start">
                                                    <h4 className="text-sm font-bold text-slate-800 truncate">{l.title}</h4>
                                                    {selectedListings.includes(l.id) && <CheckCircle2 size={16} className="text-emerald-500 flex-shrink-0" />}
                                                </div>
                                                <p className="text-xs text-slate-500 truncate">{l.address}</p>
                                                <div className="flex items-center gap-2 mt-2 text-[10px] font-medium text-slate-400">
                                                    <span className="bg-slate-100 px-1.5 py-0.5 rounded">{l.quantity_kg}kg</span>
                                                    <span>•</span>
                                                    <span className={new Date(l.expires_at).getTime() - Date.now() < 3600000 ? 'text-rose-500' : ''}>
                                                        Expires {new Date(l.expires_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* COMPLETED TASKS */}
                    {activeTab === 'completed' && (
                        completedDeliveries.length === 0 ? (
                            <div className="text-center py-12 px-4 rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50">
                                <CheckCircle2 size={40} className="mx-auto text-slate-300 mb-3" />
                                <p className="text-slate-500 text-sm font-medium">No completed tasks yet.</p>
                                <p className="text-slate-400 text-xs mt-1">Your verified deliveries will appear here.</p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {completedDeliveries.map(d => (
                                    <div key={d.id} className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm opacity-75 hover:opacity-100 transition-opacity">
                                        <div className="flex justify-between items-start mb-2">
                                            <div>
                                                <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-slate-100 text-slate-600">
                                                    {d.status.replace('_', ' ')}
                                                </span>
                                                <p className="font-bold text-slate-800 text-sm mt-1">
                                                    To: {d.charity?.name || 'Charity'}
                                                </p>
                                            </div>
                                            <span className="text-xs text-slate-400">
                                                {d.completed_at ? new Date(d.completed_at).toLocaleDateString() : 'Unknown Date'}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-2 text-xs text-slate-500">
                                            <CheckCircle2 size={14} className="text-emerald-500" />
                                            <span>Delivery Verified</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )
                    )}
                </div>
            </div>

            {/* === MAP AREA === */}
            <div className="flex-grow md:h-full relative z-0 bg-slate-200">
                <Map
                    volunteerLocation={position}
                    listings={listings}
                    route={route}
                    onSelectListing={toggleListing}
                    selectedListings={selectedListings}
                    routeInfo={routeInfo}
                />

                {/* Floating Map Controls */}
                <div className="absolute top-4 right-4 z-[1000] flex flex-col gap-2">
                    <button
                        onClick={() => {
                            if (userId) fetchData();
                            navigator.geolocation.getCurrentPosition(pos => setPosition([pos.coords.latitude, pos.coords.longitude]));
                        }}
                        className="bg-white/90 backdrop-blur-md p-3 rounded-2xl shadow-lg border border-white/50 text-slate-600 hover:text-emerald-600 hover:scale-105 transition-all"
                    >
                        <Crosshair size={20} />
                    </button>
                    <button
                        className="bg-white/90 backdrop-blur-md p-3 rounded-2xl shadow-lg border border-white/50 text-slate-600 hover:text-emerald-600 hover:scale-105 transition-all"
                    >
                        <Navigation size={20} />
                    </button>
                </div>

                {/* Mobile FAB to open sheet if closed */}
                {!isSheetOpen && !verificationStep && (
                    <button
                        onClick={() => setIsSheetOpen(true)}
                        className="md:hidden absolute bottom-6 left-1/2 -translate-x-1/2 z-[1000] bg-emerald-600 text-white px-6 py-3 rounded-full shadow-xl shadow-emerald-500/30 font-bold flex items-center gap-2 animate-bounce-subtle"
                    >
                        <Menu size={18} />
                        Open Tasks
                    </button>
                )}
            </div>

            {/* === DELIVERY VERIFICATION MODAL === */}
            {verificationStep !== 'none' && (
                <div className="fixed inset-0 z-[1001] bg-slate-900/40 backdrop-blur-sm flex items-end md:items-center justify-center p-4">
                    <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom duration-300">
                        <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                            <h3 className="font-bold text-slate-900">Delivery Verification</h3>
                            <button onClick={() => setVerificationStep('none')} className="p-2 hover:bg-slate-100 rounded-full">
                                <X size={20} className="text-slate-400" />
                            </button>
                        </div>

                        <div className="p-6 space-y-6">
                            {/* Step 1: Proof Photo */}
                            {verificationStep === 'photo' && (
                                <>
                                    <div className="text-center">
                                        <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-4 text-blue-500">
                                            <Camera size={28} />
                                        </div>
                                        <h4 className="font-bold text-lg text-slate-800">Proof of Delivery</h4>
                                        <p className="text-sm text-slate-500 mt-1">Take a photo of the food at the drop-off location safely.</p>
                                    </div>

                                    <div className="border-2 border-dashed border-slate-200 rounded-2xl p-8 text-center hover:bg-slate-50 transition-colors relative group cursor-pointer">
                                        <input
                                            type="file"
                                            className="absolute inset-0 opacity-0 cursor-pointer"
                                            accept="image/*"
                                            onChange={handlePhotoUpload}
                                        />
                                        {uploadedPhoto ? (
                                            <img src={uploadedPhoto} alt="Proof" className="mx-auto h-32 object-cover rounded-lg shadow-sm" />
                                        ) : (
                                            <>
                                                <UploadCloud size={32} className="mx-auto text-slate-300 mb-2 group-hover:scale-110 transition-transform" />
                                                <p className="text-sm font-semibold text-slate-600">Tap to Upload Photo</p>
                                            </>
                                        )}
                                    </div>

                                    <Button
                                        className="w-full bg-blue-600 hover:bg-blue-700 h-12 text-md shadow-lg shadow-blue-200"
                                        disabled={!uploadedPhoto}
                                        onClick={() => setVerificationStep('signature')}
                                    >
                                        Next
                                    </Button>
                                </>
                            )}

                            {/* Step 2: Signature */}
                            {verificationStep === 'signature' && (
                                <>
                                    <div className="text-center">
                                        <div className="w-16 h-16 bg-purple-50 rounded-full flex items-center justify-center mx-auto mb-4 text-purple-500">
                                            <PenTool size={28} />
                                        </div>
                                        <h4 className="font-bold text-lg text-slate-800">Recipient Signature</h4>
                                        <p className="text-sm text-slate-500 mt-1">Ask the charity representative to sign below.</p>
                                    </div>

                                    <div className="space-y-3">
                                        <input
                                            type="text"
                                            placeholder="Recipient Name"
                                            className="w-full p-3 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-purple-500"
                                            value={recipientName}
                                            onChange={e => setRecipientName(e.target.value)}
                                        />
                                        <div className="h-40 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-center text-slate-400 text-sm">
                                            [Signature Pad Placeholder]
                                        </div>
                                    </div>

                                    <Button
                                        className="w-full bg-emerald-600 hover:bg-emerald-700 h-12 text-md shadow-lg shadow-emerald-200"
                                        disabled={!recipientName}
                                        onClick={submitVerification}
                                    >
                                        Complete Delivery
                                    </Button>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

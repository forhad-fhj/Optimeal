'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import dynamic from 'next/dynamic';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { listingsApi, analyticsApi } from '@/lib/api';
import { FoodListing, ListingCreate, ListingStats, ImpactSummary, FoodCategory, ListingStatus } from '@/types';
import ImpactCard from '@/components/ImpactCard';
import { useToast } from '@/components/ui/toast';
import { Plus, X, MapPin, Clock, Package, Leaf } from 'lucide-react';

const LocationPicker = dynamic(() => import('@/components/LocationPicker'), { ssr: false });

const FOOD_CATEGORIES: { value: FoodCategory; label: string }[] = [
    { value: 'prepared', label: '🍲 Prepared Meals' },
    { value: 'bakery', label: '🥖 Bakery Items' },
    { value: 'produce', label: '🥬 Fresh Produce' },
    { value: 'dairy', label: '🧀 Dairy Products' },
    { value: 'meat', label: '🥩 Meat & Proteins' },
    { value: 'perishable', label: '❄️ Perishable' },
    { value: 'non_perishable', label: '📦 Non-Perishable' },
    { value: 'mixed', label: '📋 Mixed Items' },
];

const STATUS_DATA: Record<ListingStatus, { color: string; label: string }> = {
    available: { color: 'bg-emerald-100 text-emerald-700', label: 'Available' },
    reserved: { color: 'bg-amber-100 text-amber-700', label: 'Reserved' },
    assigned: { color: 'bg-blue-100 text-blue-700', label: 'Driver Assigned' },
    picked_up: { color: 'bg-purple-100 text-purple-700', label: 'In Transit' },
    delivered: { color: 'bg-slate-100 text-slate-600', label: 'Delivered' },
    expired: { color: 'bg-red-50 text-red-600', label: 'Expired' },
    cancelled: { color: 'bg-gray-100 text-gray-500', label: 'Cancelled' },
};

export default function DonorPage() {
    const { data: session } = useSession();
    const toast = useToast();
    const [listings, setListings] = useState<FoodListing[]>([]);
    const [stats, setStats] = useState<ListingStats | null>(null);
    const [impact, setImpact] = useState<ImpactSummary | null>(null);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    // Helper: get today and tomorrow as YYYY-MM-DD
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const toDateStr = (d: Date) => d.toISOString().split('T')[0];
    const toTimeStr = (d: Date) => d.toTimeString().slice(0, 5);

    const [formData, setFormData] = useState<Partial<ListingCreate> & { location_lat?: number; location_lng?: number }>({
        title: '',
        description: '',
        food_category: 'mixed',
        quantity_kg: undefined,
        expires_at: '',
        pickup_window_start: '',
        pickup_window_end: '',
        address: '',
        requires_refrigeration: false,
        allergens: [],
        location_lat: undefined,
        location_lng: undefined,
    });

    // Separate date/time state for better UX
    const [startDate, setStartDate] = useState(toDateStr(today));
    const [startTime, setStartTime] = useState('09:00');
    const [endDate, setEndDate] = useState(toDateStr(tomorrow));
    const [endTime, setEndTime] = useState('17:00');

    const userId = typeof window !== 'undefined' ? localStorage.getItem('optimeal_user_id') : null;

    const fetchData = useCallback(async () => {
        if (!userId) return;

        setLoading(true);
        try {
            const [listingsData, statsData, impactData] = await Promise.all([
                listingsApi.getByDonor(userId) as Promise<FoodListing[]>,
                listingsApi.getStats(userId) as Promise<ListingStats>,
                analyticsApi.getUserImpact(userId) as Promise<ImpactSummary>,
            ]);

            setListings(listingsData);
            setStats(statsData);
            setImpact(impactData);
        } catch (error) {
            console.error('Failed to fetch data:', error);
        } finally {
            setLoading(false);
        }
    }, [userId]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!userId) {
            alert('Please login first to sync your account.');
            return;
        }

        setSubmitting(true);
        try {
            // Combine date+time into ISO strings
            const pickupStart = new Date(`${startDate}T${startTime}`).toISOString();
            const pickupEnd = new Date(`${endDate}T${endTime}`).toISOString();
            const expiresAt = pickupEnd; // expires when pickup window ends

            await listingsApi.create({
                title: formData.title,
                description: formData.description || undefined,
                food_category: formData.food_category,
                quantity_kg: Number(formData.quantity_kg),
                pickup_window_start: pickupStart,
                pickup_window_end: pickupEnd,
                expires_at: expiresAt,
                address: formData.address,
                location_lat: formData.location_lat,
                location_lng: formData.location_lng,
                requires_refrigeration: formData.requires_refrigeration,
                allergens: formData.allergens,
                donor_id: userId,
            });

            setShowForm(false);
            setFormData({
                title: '',
                description: '',
                food_category: 'mixed',
                quantity_kg: undefined,
                expires_at: '',
                pickup_window_start: '',
                pickup_window_end: '',
                address: '',
                requires_refrigeration: false,
                allergens: [],
                location_lat: undefined,
                location_lng: undefined,
            });

            fetchData();
            toast.success('Listing created!', 'Your food listing is now available for pickup.');
        } catch (error: any) {
            console.error('Failed to create listing:', error);
            toast.error('Failed to create listing', error?.message || 'Please try again or check your details.');
        } finally {
            setSubmitting(false);
        }
    };

    const handleCancel = async (listingId: string) => {
        if (!confirm('Are you sure you want to cancel this listing?')) return;

        try {
            await listingsApi.cancel(listingId);
            fetchData();
            toast.success('Listing cancelled');
        } catch (error) {
            console.error('Failed to cancel listing:', error);
            toast.error('Failed to cancel listing');
        }
    };

    const formatDate = (dateStr: string) => {
        return new Date(dateStr).toLocaleString('en-US', {
            month: 'short',
            day: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
        });
    };

    if (!session) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50">
                <div className="text-center p-8 bg-white rounded-2xl shadow-sm border border-slate-100 max-w-md w-full">
                    <h2 className="text-2xl font-bold text-slate-900 mb-2">Donor Portal</h2>
                    <p className="text-slate-500 mb-8">Sign in to manage contributions and track impact.</p>
                    <Button className="w-full bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-600/20">
                        Sign In with Google
                    </Button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50/50 pb-20">
            <div className="max-w-7xl mx-auto px-4 md:px-6 py-8">
                {/* Header Section */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-4">
                    <div>
                        <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Donor Dashboard</h1>
                        <p className="text-slate-500 mt-1">Manage food recovery and visualize your community impact.</p>
                    </div>
                    <Button
                        onClick={() => setShowForm(!showForm)}
                        className={`px-6 py-2.5 rounded-full font-medium transition-all shadow-lg hover:shadow-xl ${showForm
                            ? 'bg-rose-50 text-rose-600 hover:bg-rose-100 border border-rose-200 shadow-none'
                            : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/20'
                            }`}
                    >
                        {showForm ? <span className="flex items-center gap-2"><X size={18} /> Cancel</span> : <span className="flex items-center gap-2"><Plus size={18} /> New Listing</span>}
                    </Button>
                </div>

                {/* Impact Overview Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
                    <ImpactCard
                        title="Meals Rescued"
                        value={impact?.total_meals_rescued ?? 0}
                        icon="🍽️"
                        colorScheme="green"
                        trend={{ value: 12, isPositive: true }}
                    />
                    <ImpactCard
                        title="Food Saved"
                        value={`${(impact?.total_kg_saved ?? 0).toFixed(1)} kg`}
                        icon="📦"
                        colorScheme="amber"
                        trend={{ value: 5.4, isPositive: true }}
                    />
                    <ImpactCard
                        title="CO₂ Reduced"
                        value={`${(impact?.total_co2_reduced_kg ?? 0).toFixed(1)} kg`}
                        icon="🌱"
                        colorScheme="blue"
                    />
                    <ImpactCard
                        title="Active Listings"
                        value={stats?.active_listings ?? 0}
                        icon="📋"
                        colorScheme="purple"
                    />
                </div>

                {/* Create Listing Form Panel */}
                {showForm && (
                    <div className="bg-white rounded-2xl p-8 shadow-xl shadow-slate-200/50 mb-10 border border-slate-100 animate-fade-in-up">
                        <div className="max-w-3xl mx-auto">
                            <div className="flex justify-between items-center mb-6">
                                <h2 className="text-2xl font-bold text-slate-900">Create New Listing</h2>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setShowForm(false)}
                                    className="text-slate-400 hover:text-slate-600"
                                >
                                    <X size={20} />
                                </Button>
                            </div>
                            <form onSubmit={handleSubmit} className="space-y-8">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    <div className="space-y-4">
                                        <div className="space-y-2">
                                            <label className="text-sm font-medium text-slate-700">Item Title *</label>
                                            <Input
                                                placeholder="e.g., Assorted Bagels (2 Dozen)"
                                                value={formData.title}
                                                onChange={e => setFormData({ ...formData, title: e.target.value })}
                                                required
                                                className="rounded-lg border-slate-200 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all font-medium py-2.5"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-sm font-medium text-slate-700">Category *</label>
                                            <select
                                                value={formData.food_category}
                                                onChange={e => setFormData({ ...formData, food_category: e.target.value as FoodCategory })}
                                                className="w-full px-3 py-2.5 border border-slate-200 rounded-lg focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all bg-white"
                                                required
                                            >
                                                {FOOD_CATEGORIES.map(cat => (
                                                    <option key={cat.value} value={cat.value}>{cat.label}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-sm font-medium text-slate-700">Description</label>
                                            <textarea
                                                placeholder="Details about packaging, condition..."
                                                value={formData.description}
                                                onChange={e => setFormData({ ...formData, description: e.target.value })}
                                                rows={4}
                                                className="w-full px-3 py-2.5 border border-slate-200 rounded-lg focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all resize-none"
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-4">
                                        <div className="space-y-2">
                                            <label className="text-sm font-medium text-slate-700">Weight (kg) *</label>
                                            <Input
                                                type="number"
                                                step="0.1"
                                                placeholder="Total estimated weight"
                                                value={formData.quantity_kg ?? ''}
                                                onChange={e => setFormData({ ...formData, quantity_kg: parseFloat(e.target.value) })}
                                                required
                                                className="rounded-lg border-slate-200 py-2.5"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-sm font-medium text-slate-700">Pickup Location *</label>
                                            <LocationPicker
                                                address={formData.address || ''}
                                                lat={formData.location_lat}
                                                lng={formData.location_lng}
                                                onLocationChange={({ address, lat, lng }) => {
                                                    setFormData({ ...formData, address, location_lat: lat, location_lng: lng });
                                                }}
                                            />
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <label className="text-xs font-semibold uppercase text-slate-500 tracking-wider">Start Date</label>
                                                <Input
                                                    type="date"
                                                    value={startDate}
                                                    onChange={e => setStartDate(e.target.value)}
                                                    required
                                                    className="rounded-lg text-sm"
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-xs font-semibold uppercase text-slate-500 tracking-wider">Start Time</label>
                                                <Input
                                                    type="time"
                                                    value={startTime}
                                                    onChange={e => setStartTime(e.target.value)}
                                                    required
                                                    className="rounded-lg text-sm"
                                                />
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <label className="text-xs font-semibold uppercase text-slate-500 tracking-wider">End Date</label>
                                                <Input
                                                    type="date"
                                                    value={endDate}
                                                    onChange={e => setEndDate(e.target.value)}
                                                    required
                                                    className="rounded-lg text-sm"
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-xs font-semibold uppercase text-slate-500 tracking-wider">End Time</label>
                                                <Input
                                                    type="time"
                                                    value={endTime}
                                                    onChange={e => setEndTime(e.target.value)}
                                                    required
                                                    className="rounded-lg text-sm"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="pt-4 border-t border-slate-100 flex justify-end gap-3">
                                    <Button
                                        type="button"
                                        onClick={() => setShowForm(false)}
                                        variant="ghost"
                                        className="text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                                    >
                                        Cancel
                                    </Button>
                                    <Button
                                        type="submit"
                                        disabled={submitting}
                                        className="bg-emerald-600 hover:bg-emerald-700 text-white min-w-[140px] shadow-lg shadow-emerald-600/20"
                                    >
                                        {submitting ? 'Publishing...' : 'Publish Listing'}
                                    </Button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {/* Listings Section */}
                <div>
                    <h2 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2">
                        <Package size={20} className="text-emerald-600" />
                        Active Listings
                    </h2>

                    {loading ? (
                        <div className="py-20 text-center">
                            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-emerald-600 mx-auto opacity-50"></div>
                        </div>
                    ) : listings.length === 0 ? (
                        <div className="text-center py-20 bg-white rounded-2xl border border-dashed border-slate-200">
                            <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 text-3xl">🥗</div>
                            <h3 className="text-slate-900 font-medium text-lg">No active listings</h3>
                            <p className="text-slate-500 mb-6 max-w-sm mx-auto">You haven't posted any food donations yet. Start observing food waste reduction today!</p>
                            <Button onClick={() => setShowForm(true)} variant="outline">
                                Create First Listing
                            </Button>
                        </div>
                    ) : (
                        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead>
                                        <tr className="bg-slate-50/50 border-b border-slate-100 text-left">
                                            <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Item Details</th>
                                            <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Stats</th>
                                            <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Timing</th>
                                            <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th>
                                            <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {listings.map(listing => (
                                            <tr key={listing.id} className="hover:bg-slate-50/80 transition-colors group">
                                                <td className="px-6 py-4">
                                                    <div>
                                                        <p className="font-semibold text-slate-900">{listing.title}</p>
                                                        <div className="flex items-center gap-2 mt-1">
                                                            <span className="text-xs bg-slate-100 px-2 py-0.5 rounded text-slate-600 border border-slate-200">
                                                                {FOOD_CATEGORIES.find(c => c.value === listing.food_category)?.label}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-1 text-slate-600">
                                                        <Leaf size={14} className="text-emerald-500" />
                                                        <span className="font-medium">{listing.quantity_kg} kg</span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="flex flex-col gap-1">
                                                        <div className="flex items-center gap-2 text-sm text-slate-700">
                                                            <Clock size={14} className="text-slate-400" />
                                                            {formatDate(listing.pickup_window_end)}
                                                        </div>
                                                        <span className="text-xs text-amber-600 font-medium">Expires {formatDate(listing.expires_at)}</span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${STATUS_DATA[listing.status].color}`}>
                                                        {STATUS_DATA[listing.status].label}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    {listing.status === 'available' && (
                                                        <Button
                                                            onClick={() => handleCancel(listing.id)}
                                                            variant="ghost"
                                                            size="sm"
                                                            className="text-slate-400 hover:text-red-600 hover:bg-red-50 h-8"
                                                        >
                                                            Cancel
                                                        </Button>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

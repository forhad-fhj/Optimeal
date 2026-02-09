'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { listingsApi, analyticsApi } from '@/lib/api';
import { FoodListing, ListingCreate, ListingStats, ImpactSummary, FoodCategory, ListingStatus } from '@/types';
import ImpactCard from '@/components/ImpactCard';
import { useToast } from '@/components/ui/toast';

// Category options for select
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

// Status badge colors
const STATUS_COLORS: Record<ListingStatus, string> = {
    available: 'bg-green-100 text-green-800',
    reserved: 'bg-yellow-100 text-yellow-800',
    assigned: 'bg-blue-100 text-blue-800',
    picked_up: 'bg-purple-100 text-purple-800',
    delivered: 'bg-emerald-100 text-emerald-800',
    expired: 'bg-gray-100 text-gray-800',
    cancelled: 'bg-red-100 text-red-800',
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

    const [formData, setFormData] = useState<Partial<ListingCreate>>({
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
    });

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
            await listingsApi.create({
                ...formData,
                donor_id: userId,
                quantity_kg: Number(formData.quantity_kg),
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
            });

            fetchData();
            toast.success('Listing created!', 'Your food listing is now available for pickup.');
        } catch (error) {
            console.error('Failed to create listing:', error);
            toast.error('Failed to create listing', 'Please try again or check your details.');
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

    const getTimeRemaining = (expiresAt: string) => {
        const diff = new Date(expiresAt).getTime() - Date.now();
        if (diff < 0) return 'Expired';
        const hours = Math.floor(diff / (1000 * 60 * 60));
        if (hours < 24) return `${hours}h remaining`;
        return `${Math.floor(hours / 24)}d remaining`;
    };

    if (!session) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-amber-50">
                <div className="text-center p-8 bg-white rounded-2xl shadow-xl">
                    <h2 className="text-2xl font-bold text-gray-800 mb-4">Welcome to OptiMeal</h2>
                    <p className="text-gray-600 mb-6">Please sign in to access your donor dashboard</p>
                    <Button className="bg-green-600 hover:bg-green-700">Sign In</Button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-green-50 to-amber-50">
            <div className="max-w-7xl mx-auto px-4 py-8">
                {/* Header */}
                <div className="flex justify-between items-center mb-8">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900">Donor Dashboard</h1>
                        <p className="text-gray-600 mt-1">Manage your food donations and track impact</p>
                    </div>
                    <Button
                        onClick={() => setShowForm(!showForm)}
                        className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-xl shadow-lg"
                    >
                        {showForm ? 'Cancel' : '+ New Listing'}
                    </Button>
                </div>

                {/* Impact Cards */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                    <ImpactCard
                        title="Meals Rescued"
                        value={impact?.total_meals_rescued ?? 0}
                        icon="🍽️"
                        colorScheme="green"
                    />
                    <ImpactCard
                        title="Food Saved"
                        value={`${(impact?.total_kg_saved ?? 0).toFixed(1)} kg`}
                        icon="📦"
                        colorScheme="amber"
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

                {/* Create Listing Form */}
                {showForm && (
                    <div className="bg-white rounded-2xl p-8 shadow-xl mb-8 border border-gray-100">
                        <h2 className="text-xl font-bold text-gray-900 mb-6">Create Food Listing</h2>
                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Food Title *
                                    </label>
                                    <Input
                                        placeholder="e.g., 20 Fresh Bagels"
                                        value={formData.title}
                                        onChange={e => setFormData({ ...formData, title: e.target.value })}
                                        required
                                        className="rounded-xl"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Category *
                                    </label>
                                    <select
                                        value={formData.food_category}
                                        onChange={e => setFormData({ ...formData, food_category: e.target.value as FoodCategory })}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent"
                                        required
                                    >
                                        {FOOD_CATEGORIES.map(cat => (
                                            <option key={cat.value} value={cat.value}>{cat.label}</option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Quantity (kg) *
                                    </label>
                                    <Input
                                        type="number"
                                        step="0.1"
                                        min="0.1"
                                        placeholder="e.g., 5.0"
                                        value={formData.quantity_kg ?? ''}
                                        onChange={e => setFormData({ ...formData, quantity_kg: parseFloat(e.target.value) })}
                                        required
                                        className="rounded-xl"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Expires At *
                                    </label>
                                    <Input
                                        type="datetime-local"
                                        value={formData.expires_at}
                                        onChange={e => setFormData({ ...formData, expires_at: e.target.value })}
                                        required
                                        className="rounded-xl"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Pickup Window Start *
                                    </label>
                                    <Input
                                        type="datetime-local"
                                        value={formData.pickup_window_start}
                                        onChange={e => setFormData({ ...formData, pickup_window_start: e.target.value })}
                                        required
                                        className="rounded-xl"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Pickup Window End *
                                    </label>
                                    <Input
                                        type="datetime-local"
                                        value={formData.pickup_window_end}
                                        onChange={e => setFormData({ ...formData, pickup_window_end: e.target.value })}
                                        required
                                        className="rounded-xl"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Description
                                </label>
                                <textarea
                                    placeholder="Additional details about the food..."
                                    value={formData.description}
                                    onChange={e => setFormData({ ...formData, description: e.target.value })}
                                    rows={3}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Pickup Address
                                </label>
                                <Input
                                    placeholder="123 Main St, City"
                                    value={formData.address}
                                    onChange={e => setFormData({ ...formData, address: e.target.value })}
                                    className="rounded-xl"
                                />
                            </div>

                            <div className="flex items-center gap-6">
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={formData.requires_refrigeration}
                                        onChange={e => setFormData({ ...formData, requires_refrigeration: e.target.checked })}
                                        className="w-4 h-4 text-green-600 rounded"
                                    />
                                    <span className="text-sm text-gray-700">Requires Refrigeration</span>
                                </label>
                            </div>

                            <div className="flex gap-4">
                                <Button
                                    type="submit"
                                    disabled={submitting}
                                    className="bg-green-600 hover:bg-green-700 text-white px-8 py-3 rounded-xl"
                                >
                                    {submitting ? 'Creating...' : 'Create Listing'}
                                </Button>
                                <Button
                                    type="button"
                                    onClick={() => setShowForm(false)}
                                    variant="outline"
                                    className="px-8 py-3 rounded-xl"
                                >
                                    Cancel
                                </Button>
                            </div>
                        </form>
                    </div>
                )}

                {/* Listings Table */}
                <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
                    <div className="p-6 border-b border-gray-100">
                        <h2 className="text-xl font-bold text-gray-900">Your Listings</h2>
                    </div>

                    {loading ? (
                        <div className="p-8 text-center">
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto"></div>
                            <p className="mt-4 text-gray-500">Loading listings...</p>
                        </div>
                    ) : listings.length === 0 ? (
                        <div className="p-12 text-center">
                            <span className="text-5xl">📦</span>
                            <h3 className="mt-4 text-lg font-medium text-gray-900">No listings yet</h3>
                            <p className="mt-2 text-gray-500">Create your first food listing to start rescuing meals!</p>
                            <Button
                                onClick={() => setShowForm(true)}
                                className="mt-6 bg-green-600 hover:bg-green-700"
                            >
                                Create Listing
                            </Button>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Food Item
                                        </th>
                                        <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Category
                                        </th>
                                        <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Quantity
                                        </th>
                                        <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Expires
                                        </th>
                                        <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Status
                                        </th>
                                        <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Actions
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {listings.map(listing => (
                                        <tr key={listing.id} className="hover:bg-gray-50">
                                            <td className="px-6 py-4">
                                                <div>
                                                    <p className="font-medium text-gray-900">{listing.title}</p>
                                                    {listing.description && (
                                                        <p className="text-sm text-gray-500 truncate max-w-xs">{listing.description}</p>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className="text-sm text-gray-600">
                                                    {FOOD_CATEGORIES.find(c => c.value === listing.food_category)?.label ?? listing.food_category}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className="font-medium">{listing.quantity_kg} kg</span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div>
                                                    <p className="text-sm text-gray-900">{formatDate(listing.expires_at)}</p>
                                                    <p className="text-xs text-gray-500">{getTimeRemaining(listing.expires_at)}</p>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`px-3 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[listing.status]}`}>
                                                    {listing.status.replace('_', ' ')}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                {listing.status === 'available' && (
                                                    <Button
                                                        onClick={() => handleCancel(listing.id)}
                                                        variant="outline"
                                                        size="sm"
                                                        className="text-red-600 hover:bg-red-50"
                                                    >
                                                        Cancel
                                                    </Button>
                                                )}
                                                {listing.status === 'delivered' && (
                                                    <span className="text-green-600 text-sm">✓ Rescued</span>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

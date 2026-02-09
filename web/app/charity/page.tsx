'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { deliveriesApi, feedbackApi, analyticsApi } from '@/lib/api';
import { Delivery, DeliveryStatus, ImpactSummary, FeedbackCreate } from '@/types';

// Status display configuration
const STATUS_CONFIG: Record<DeliveryStatus, { label: string; color: string; icon: string }> = {
    pending: { label: 'Pending', color: 'bg-gray-100 text-gray-800', icon: '⏳' },
    assigned: { label: 'Assigned', color: 'bg-blue-100 text-blue-800', icon: '📋' },
    en_route_pickup: { label: 'En Route to Pickup', color: 'bg-yellow-100 text-yellow-800', icon: '🚗' },
    picked_up: { label: 'Picked Up', color: 'bg-purple-100 text-purple-800', icon: '📦' },
    en_route_delivery: { label: 'On the Way', color: 'bg-amber-100 text-amber-800', icon: '🚚' },
    delivered: { label: 'Delivered', color: 'bg-green-100 text-green-800', icon: '✅' },
    confirmed: { label: 'Confirmed', color: 'bg-emerald-100 text-emerald-800', icon: '🎉' },
    failed: { label: 'Failed', color: 'bg-red-100 text-red-800', icon: '❌' },
    cancelled: { label: 'Cancelled', color: 'bg-gray-100 text-gray-600', icon: '🚫' },
};

export default function CharityPage() {
    const { data: session } = useSession();
    const [incomingDeliveries, setIncomingDeliveries] = useState<Delivery[]>([]);
    const [pastDeliveries, setPastDeliveries] = useState<Delivery[]>([]);
    const [impact, setImpact] = useState<ImpactSummary | null>(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'incoming' | 'history'>('incoming');
    const [feedbackModal, setFeedbackModal] = useState<{ deliveryId: string; volunteerId: string } | null>(null);
    const [feedbackData, setFeedbackData] = useState<Partial<FeedbackCreate>>({
        rating: 5,
        comment: '',
        food_quality_rating: 5,
        timeliness_rating: 5,
        communication_rating: 5,
    });
    const [submitting, setSubmitting] = useState(false);

    const userId = typeof window !== 'undefined' ? localStorage.getItem('optimeal_user_id') : null;

    const fetchData = useCallback(async () => {
        if (!userId) return;

        setLoading(true);
        try {
            const [incomingData, allDeliveries, impactData] = await Promise.all([
                deliveriesApi.getByCharity(userId, true) as Promise<Delivery[]>,
                deliveriesApi.getByCharity(userId) as Promise<Delivery[]>,
                analyticsApi.getUserImpact(userId) as Promise<ImpactSummary>,
            ]);

            setIncomingDeliveries(incomingData);

            // Filter past deliveries (completed or failed)
            const past = allDeliveries.filter(d =>
                ['delivered', 'confirmed', 'failed', 'cancelled'].includes(d.status)
            );
            setPastDeliveries(past);

            setImpact(impactData);
        } catch (error) {
            console.error('Failed to fetch data:', error);
        } finally {
            setLoading(false);
        }
    }, [userId]);

    useEffect(() => {
        fetchData();

        // Poll for updates every 30 seconds
        const interval = setInterval(fetchData, 30000);
        return () => clearInterval(interval);
    }, [fetchData]);

    const confirmDelivery = async (deliveryId: string) => {
        try {
            await deliveriesApi.confirm(deliveryId);
            fetchData();
        } catch (error) {
            console.error('Failed to confirm delivery:', error);
            alert('Failed to confirm delivery');
        }
    };

    const submitFeedback = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!feedbackModal || !userId) return;

        setSubmitting(true);
        try {
            await feedbackApi.create(userId, {
                delivery_id: feedbackModal.deliveryId,
                to_user_id: feedbackModal.volunteerId,
                ...feedbackData,
            });

            setFeedbackModal(null);
            setFeedbackData({
                rating: 5,
                comment: '',
                food_quality_rating: 5,
                timeliness_rating: 5,
                communication_rating: 5,
            });

            alert('Thank you for your feedback!');
        } catch (error) {
            console.error('Failed to submit feedback:', error);
            alert('Failed to submit feedback');
        } finally {
            setSubmitting(false);
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

    const getETA = (delivery: Delivery) => {
        if (!delivery.delivery_eta) return 'Calculating...';
        const eta = new Date(delivery.delivery_eta);
        const now = new Date();
        const diff = eta.getTime() - now.getTime();

        if (diff < 0) return 'Arriving soon';
        const mins = Math.floor(diff / 60000);
        if (mins < 60) return `~${mins} min`;
        return formatDate(delivery.delivery_eta);
    };

    if (!session) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-amber-50 to-green-50">
                <div className="text-center p-8 bg-white rounded-2xl shadow-xl">
                    <h2 className="text-2xl font-bold text-gray-800 mb-4">Charity Hub</h2>
                    <p className="text-gray-600 mb-6">Please sign in to manage your donations</p>
                    <Button className="bg-green-600 hover:bg-green-700">Sign In</Button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-amber-50 to-green-50">
            <div className="max-w-7xl mx-auto px-4 py-8">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-gray-900">Charity Hub</h1>
                    <p className="text-gray-600 mt-1">Track incoming donations and manage receipts</p>
                </div>

                {/* Impact Cards */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                    <div className="bg-white rounded-2xl p-6 shadow-lg border border-green-100">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-gray-500">Meals Received</p>
                                <p className="text-3xl font-bold text-green-600 mt-1">
                                    {impact?.total_meals_rescued ?? 0}
                                </p>
                            </div>
                            <div className="p-3 bg-green-100 rounded-xl">
                                <span className="text-2xl">🍽️</span>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-2xl p-6 shadow-lg border border-amber-100">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-gray-500">Food Received (kg)</p>
                                <p className="text-3xl font-bold text-amber-600 mt-1">
                                    {impact?.total_kg_saved?.toFixed(1) ?? 0}
                                </p>
                            </div>
                            <div className="p-3 bg-amber-100 rounded-xl">
                                <span className="text-2xl">📦</span>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-2xl p-6 shadow-lg border border-blue-100">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-gray-500">Total Deliveries</p>
                                <p className="text-3xl font-bold text-blue-600 mt-1">
                                    {impact?.total_deliveries ?? 0}
                                </p>
                            </div>
                            <div className="p-3 bg-blue-100 rounded-xl">
                                <span className="text-2xl">🚚</span>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-2xl p-6 shadow-lg border border-purple-100">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-gray-500">Incoming Now</p>
                                <p className="text-3xl font-bold text-purple-600 mt-1">
                                    {incomingDeliveries.length}
                                </p>
                            </div>
                            <div className="p-3 bg-purple-100 rounded-xl">
                                <span className="text-2xl">📍</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Tabs */}
                <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
                    <div className="border-b">
                        <div className="flex">
                            <button
                                onClick={() => setActiveTab('incoming')}
                                className={`px-6 py-4 font-medium transition-colors relative ${activeTab === 'incoming'
                                        ? 'text-green-600'
                                        : 'text-gray-500 hover:text-gray-700'
                                    }`}
                            >
                                Incoming Deliveries
                                {incomingDeliveries.length > 0 && (
                                    <span className="ml-2 px-2 py-0.5 bg-green-100 text-green-800 rounded-full text-xs">
                                        {incomingDeliveries.length}
                                    </span>
                                )}
                                {activeTab === 'incoming' && (
                                    <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-green-600" />
                                )}
                            </button>
                            <button
                                onClick={() => setActiveTab('history')}
                                className={`px-6 py-4 font-medium transition-colors relative ${activeTab === 'history'
                                        ? 'text-green-600'
                                        : 'text-gray-500 hover:text-gray-700'
                                    }`}
                            >
                                Donation History
                                {activeTab === 'history' && (
                                    <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-green-600" />
                                )}
                            </button>
                        </div>
                    </div>

                    {loading ? (
                        <div className="p-8 text-center">
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto"></div>
                            <p className="mt-4 text-gray-500">Loading deliveries...</p>
                        </div>
                    ) : activeTab === 'incoming' ? (
                        // Incoming Deliveries
                        <div className="p-6">
                            {incomingDeliveries.length === 0 ? (
                                <div className="text-center py-12">
                                    <span className="text-5xl">📦</span>
                                    <h3 className="mt-4 text-lg font-medium text-gray-900">No incoming deliveries</h3>
                                    <p className="mt-2 text-gray-500">You&apos;ll see deliveries here when they&apos;re on their way</p>
                                </div>
                            ) : (
                                <div className="grid gap-4">
                                    {incomingDeliveries.map(delivery => (
                                        <div
                                            key={delivery.id}
                                            className="border rounded-xl p-6 hover:border-green-200 transition-colors"
                                        >
                                            <div className="flex items-start justify-between">
                                                <div className="flex items-center gap-4">
                                                    <div className="text-3xl">
                                                        {STATUS_CONFIG[delivery.status]?.icon || '📦'}
                                                    </div>
                                                    <div>
                                                        <p className="font-semibold text-gray-900">
                                                            Delivery #{delivery.id.slice(0, 8)}
                                                        </p>
                                                        <p className="text-sm text-gray-500">
                                                            {delivery.listing_ids.length} item(s) • ETA: {getETA(delivery)}
                                                        </p>
                                                        {delivery.volunteer && (
                                                            <p className="text-sm text-gray-600 mt-1">
                                                                Driver: {delivery.volunteer.name}
                                                            </p>
                                                        )}
                                                    </div>
                                                </div>

                                                <div className="flex items-center gap-3">
                                                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${STATUS_CONFIG[delivery.status]?.color || 'bg-gray-100'}`}>
                                                        {STATUS_CONFIG[delivery.status]?.label || delivery.status}
                                                    </span>

                                                    {delivery.status === 'delivered' && !delivery.charity_confirmed && (
                                                        <Button
                                                            onClick={() => confirmDelivery(delivery.id)}
                                                            className="bg-green-600 hover:bg-green-700"
                                                        >
                                                            Confirm Receipt
                                                        </Button>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Progress bar for en-route deliveries */}
                                            {['en_route_pickup', 'picked_up', 'en_route_delivery'].includes(delivery.status) && (
                                                <div className="mt-4">
                                                    <div className="flex justify-between text-xs text-gray-500 mb-1">
                                                        <span>Pickup</span>
                                                        <span>On the way</span>
                                                        <span>Delivery</span>
                                                    </div>
                                                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                                                        <div
                                                            className="h-full bg-gradient-to-r from-green-500 to-amber-500 transition-all"
                                                            style={{
                                                                width: delivery.status === 'en_route_pickup' ? '33%'
                                                                    : delivery.status === 'picked_up' ? '66%'
                                                                        : '90%'
                                                            }}
                                                        />
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    ) : (
                        // History
                        <div className="overflow-x-auto">
                            {pastDeliveries.length === 0 ? (
                                <div className="text-center py-12">
                                    <span className="text-5xl">📋</span>
                                    <h3 className="mt-4 text-lg font-medium text-gray-900">No donation history</h3>
                                    <p className="mt-2 text-gray-500">Completed deliveries will appear here</p>
                                </div>
                            ) : (
                                <table className="w-full">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                                            <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase">Delivery ID</th>
                                            <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase">Items</th>
                                            <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase">Volunteer</th>
                                            <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                                            <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y">
                                        {pastDeliveries.map(delivery => (
                                            <tr key={delivery.id} className="hover:bg-gray-50">
                                                <td className="px-6 py-4 text-sm text-gray-900">
                                                    {formatDate(delivery.created_at)}
                                                </td>
                                                <td className="px-6 py-4 text-sm font-mono text-gray-600">
                                                    {delivery.id.slice(0, 8)}
                                                </td>
                                                <td className="px-6 py-4 text-sm text-gray-900">
                                                    {delivery.listing_ids.length} item(s)
                                                </td>
                                                <td className="px-6 py-4 text-sm text-gray-900">
                                                    {delivery.volunteer?.name || 'Unknown'}
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${STATUS_CONFIG[delivery.status]?.color}`}>
                                                        {STATUS_CONFIG[delivery.status]?.label}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4">
                                                    {delivery.status === 'confirmed' && delivery.volunteer_id && (
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            onClick={() => setFeedbackModal({
                                                                deliveryId: delivery.id,
                                                                volunteerId: delivery.volunteer_id,
                                                            })}
                                                        >
                                                            Rate Volunteer
                                                        </Button>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Feedback Modal */}
            {feedbackModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl p-6 max-w-md w-full">
                        <h3 className="text-xl font-bold text-gray-900 mb-4">Rate Your Experience</h3>
                        <form onSubmit={submitFeedback} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Overall Rating</label>
                                <div className="flex gap-2">
                                    {[1, 2, 3, 4, 5].map(star => (
                                        <button
                                            key={star}
                                            type="button"
                                            onClick={() => setFeedbackData({ ...feedbackData, rating: star })}
                                            className={`text-2xl ${(feedbackData.rating ?? 0) >= star ? 'text-yellow-400' : 'text-gray-300'}`}
                                        >
                                            ★
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Food Quality</label>
                                <div className="flex gap-2">
                                    {[1, 2, 3, 4, 5].map(star => (
                                        <button
                                            key={star}
                                            type="button"
                                            onClick={() => setFeedbackData({ ...feedbackData, food_quality_rating: star })}
                                            className={`text-xl ${(feedbackData.food_quality_rating ?? 0) >= star ? 'text-green-500' : 'text-gray-300'}`}
                                        >
                                            ★
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Timeliness</label>
                                <div className="flex gap-2">
                                    {[1, 2, 3, 4, 5].map(star => (
                                        <button
                                            key={star}
                                            type="button"
                                            onClick={() => setFeedbackData({ ...feedbackData, timeliness_rating: star })}
                                            className={`text-xl ${(feedbackData.timeliness_rating ?? 0) >= star ? 'text-blue-500' : 'text-gray-300'}`}
                                        >
                                            ★
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Comment (optional)</label>
                                <textarea
                                    value={feedbackData.comment}
                                    onChange={e => setFeedbackData({ ...feedbackData, comment: e.target.value })}
                                    rows={3}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500"
                                    placeholder="Share your experience..."
                                />
                            </div>

                            <div className="flex gap-3 pt-4">
                                <Button
                                    type="submit"
                                    disabled={submitting}
                                    className="flex-1 bg-green-600 hover:bg-green-700"
                                >
                                    {submitting ? 'Submitting...' : 'Submit Feedback'}
                                </Button>
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => setFeedbackModal(null)}
                                >
                                    Cancel
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

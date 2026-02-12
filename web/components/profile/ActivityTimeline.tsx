'use client';

import { useEffect, useState } from 'react';
import { deliveriesApi } from '@/lib/api';
import { Delivery } from '@/types';
import { Truck, CheckCircle, XCircle, Clock } from 'lucide-react';

interface ActivityTimelineProps {
    userId: string;
    role: string;
}

export default function ActivityTimeline({ userId, role }: ActivityTimelineProps) {
    const [activities, setActivities] = useState<Delivery[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchHistory = async () => {
            try {
                // Fetch recent history
                // In a real app we might have a dedicated /activities endpoint that combines multiple types
                // For now, we'll use deliveries history
                const data = await deliveriesApi.getByVolunteer(userId, true);
                // We're reusing getByVolunteer but ensuring we pass history=true
                // Ideally this should support donor/charity too, but focusing on volunteer mostly for now
                setActivities((data as Delivery[]).slice(0, 5)); // Just top 5
            } catch (error) {
                console.error('Failed to load activity', error);
            } finally {
                setLoading(false);
            }
        };

        if (userId) fetchHistory();
    }, [userId, role]);

    if (loading) return <div className="p-4 text-center text-slate-400 text-sm">Loading activity...</div>;
    if (activities.length === 0) return <div className="p-4 text-center text-slate-400 text-sm">No recent activity</div>;

    return (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                <Clock className="text-emerald-600" size={20} />
                Recent Activity
            </h3>

            <div className="relative pl-4 border-l-2 border-slate-100 space-y-6">
                {activities.map((activity, index) => (
                    <div key={activity.id} className="relative">
                        <div className={`absolute -left-[21px] top-0 w-3 h-3 rounded-full border-2 border-white ring-2 ${activity.status === 'delivered' ? 'bg-emerald-500 ring-emerald-100' :
                                activity.status === 'cancelled' ? 'bg-red-500 ring-red-100' : 'bg-blue-500 ring-blue-100'
                            }`} />

                        <div className="flex justify-between items-start">
                            <div>
                                <p className="font-medium text-slate-900 text-sm">
                                    {activity.status === 'delivered' ? 'Completed delivery' :
                                        activity.status === 'cancelled' ? 'Cancelled delivery' : 'Delivery update'}
                                </p>
                                <p className="text-xs text-slate-500 mt-0.5">
                                    {activity.listing_ids.length} items • {(activity.total_distance_km || 0).toFixed(1)} km
                                </p>
                            </div>
                            <span className="text-[10px] font-medium text-slate-400">
                                {new Date(activity.created_at).toLocaleDateString()}
                            </span>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

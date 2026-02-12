'use client';

import { useState, useEffect } from 'react';
import { deliveriesApi } from '@/lib/api';
import { Delivery } from '@/types';
import { Search, MapPin, CheckCircle2, Truck, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function DeliveriesManager() {
    const [deliveries, setDeliveries] = useState<Delivery[]>([]);
    const [loading, setLoading] = useState(true);
    const [statusFilter, setStatusFilter] = useState<string>('all');

    const fetchDeliveries = async () => {
        setLoading(true);
        try {
            const data = await deliveriesApi.getAll();
            setDeliveries(Array.isArray(data) ? data : []);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchDeliveries();
    }, []);

    const filtered = deliveries.filter(d => statusFilter === 'all' || d.status === statusFilter);

    const getStatusColor = (status: string) => {
        if (['delivered', 'confirmed'].includes(status)) return 'bg-emerald-100 text-emerald-800';
        if (['picked_up', 'en_route_delivery', 'en_route_pickup'].includes(status)) return 'bg-purple-100 text-purple-800';
        if (['pending', 'assigned'].includes(status)) return 'bg-amber-100 text-amber-800';
        return 'bg-slate-100 text-slate-800';
    };

    return (
        <div className="space-y-6">
            {/* Toolbar */}
            <div className="flex gap-2 overflow-x-auto pb-2">
                {['all', 'pending', 'picked_up', 'delivered', 'cancelled'].map(s => (
                    <button
                        key={s}
                        onClick={() => setStatusFilter(s)}
                        className={`px-3 py-1.5 rounded-full text-xs font-bold uppercase transition-colors whitespace-nowrap ${statusFilter === s
                            ? 'bg-blue-600 text-white shadow-blue-200 shadow-md'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                            }`}
                    >
                        {s.replace('_', ' ')}
                    </button>
                ))}
            </div>

            {/* Table */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-slate-50 border-b border-slate-100">
                            <tr>
                                <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">ID / Route</th>
                                <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Volunteer</th>
                                <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Charity</th>
                                <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th>
                                <th className="px-6 py-4 text-right text-xs font-bold text-slate-500 uppercase tracking-wider">Timeline</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {loading ? (
                                <tr><td colSpan={5} className="p-8 text-center text-slate-500">Loading deliveries...</td></tr>
                            ) : filtered.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="p-12 text-center">
                                        <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-3 text-2xl">🚚</div>
                                        <p className="text-slate-500 font-medium">No deliveries found</p>
                                    </td>
                                </tr>
                            ) : (
                                filtered.map(d => (
                                    <tr key={d.id} className="hover:bg-slate-50/50 transition-colors">
                                        <td className="px-6 py-4">
                                            <p className="font-mono text-xs text-slate-500">#{d.id.substring(0, 8)}</p>
                                            <div className="flex items-center gap-1 mt-1">
                                                <MapPin size={12} className="text-slate-400" />
                                                <span className="text-xs font-medium text-slate-700">
                                                    {d.listing_ids ? `${d.listing_ids.length} orders` : 'Direct'}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            {d.volunteer ? (
                                                <div className="flex items-center gap-2">
                                                    <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-bold">
                                                        {d.volunteer.name.charAt(0)}
                                                    </div>
                                                    <span className="text-sm text-slate-700">{d.volunteer.name}</span>
                                                </div>
                                            ) : (
                                                <span className="text-xs text-slate-400 italic">Unassigned</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4">
                                            <p className="text-sm font-medium text-slate-700">{d.charity?.name || 'Unknown'}</p>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wide ${getStatusColor(d.status)}`}>
                                                {d.status.replace('_', ' ')}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <p className="text-xs text-slate-500">
                                                Created: {new Date(d.created_at).toLocaleDateString()}
                                            </p>
                                            {d.completed_at && (
                                                <p className="text-xs text-emerald-600 font-medium mt-0.5">
                                                    Done: {new Date(d.completed_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </p>
                                            )}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}

'use client';

import { useState, useEffect } from 'react';
import { listingsApi } from '@/lib/api';
import { FoodListing } from '@/types';
import { Search, Trash2, ExternalLink, Filter, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/toast';

export default function ListingsManager() {
    const [listings, setListings] = useState<FoodListing[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState<string>('all');
    const [deleteId, setDeleteId] = useState<string | null>(null); // State for delete modal
    const { success, error } = useToast();

    const fetchListings = async () => {
        setLoading(true);
        try {
            // Fetch listings based on the selected filter
            // If filter is 'all', we pass undefined to get everything (assuming API supports it or returns default)
            // If API defaults to 'available', we might need to handle 'all' differently if we want everything
            // But usually APIs either return all or default to available. 
            // Let's try passing the status if it's not 'all'.
            const params: any = { page_size: 100 };
            if (statusFilter !== 'all') {
                params.status = statusFilter;
            }

            const data = await listingsApi.getAll(params) as any;
            // Handle pagination response or array
            setListings(Array.isArray(data) ? data : data.items || []);
        } catch (err) {
            console.error(err);
            error('Load Failed', 'Could not load listings.');
        } finally {
            setLoading(false);
        }
    };

    // Refetch when filter changes
    useEffect(() => {
        fetchListings();
    }, [statusFilter]);

    const confirmDelete = (id: string) => {
        setDeleteId(id);
    };

    const handleDelete = async () => {
        if (!deleteId) return;
        try {
            await listingsApi.delete(deleteId);
            success('Listing Deleted', 'The listing has been removed.');
            fetchListings();
        } catch (err) {
            error('Delete Failed', 'Could not delete listing.');
        } finally {
            setDeleteId(null);
        }
    };

    // Client-side search filtering only (status is handled by API now)
    const filtered = listings.filter(l => {
        const matchesSearch = l.title.toLowerCase().includes(search.toLowerCase()) ||
            (l.address || '').toLowerCase().includes(search.toLowerCase());
        return matchesSearch;
    });

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'available': return 'bg-emerald-100 text-emerald-800';
            case 'reserved': return 'bg-amber-100 text-amber-800';
            case 'picked_up': return 'bg-purple-100 text-purple-800';
            case 'delivered': return 'bg-slate-100 text-slate-800';
            case 'expired': return 'bg-red-100 text-red-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    return (
        <div className="space-y-6 relative">
            {/* Toolbar */}
            <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
                <div className="relative w-full md:w-96">
                    <Search className="absolute left-3 top-2.5 text-slate-400" size={18} />
                    <input
                        type="text"
                        placeholder="Search listings..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        className="pl-10 pr-4 py-2 w-full border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500/20 outline-none"
                    />
                </div>
                <div className="flex gap-2 w-full md:w-auto overflow-x-auto pb-2 md:pb-0">
                    {['all', 'available', 'reserved', 'delivered', 'expired'].map(s => (
                        <button
                            key={s}
                            onClick={() => setStatusFilter(s)}
                            className={`px-3 py-1.5 rounded-full text-xs font-bold uppercase transition-colors whitespace-nowrap ${statusFilter === s
                                ? 'bg-emerald-600 text-white shadow-emerald-200 shadow-md'
                                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                }`}
                        >
                            {s}
                        </button>
                    ))}
                </div>
            </div>

            {/* Table */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-slate-50 border-b border-slate-100">
                            <tr>
                                <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Item</th>
                                <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Donor</th>
                                <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Stats</th>
                                <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th>
                                <th className="px-6 py-4 text-right text-xs font-bold text-slate-500 uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {loading ? (
                                <tr><td colSpan={5} className="p-8 text-center text-slate-500">Loading listings...</td></tr>
                            ) : filtered.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="p-12 text-center">
                                        <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-3 text-2xl">
                                            {statusFilter === 'all' || statusFilter === 'available' ? '📦' : statusFilter === 'expired' ? '⚠️' : '📭'}
                                        </div>
                                        <p className="text-slate-500 font-medium">No {statusFilter !== 'all' ? statusFilter : ''} listings found</p>
                                    </td>
                                </tr>
                            ) : (
                                filtered.map(l => (
                                    <tr key={l.id} className="hover:bg-slate-50/50 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center text-lg">
                                                    {{
                                                        prepared: '🍲', bakery: '🥖', produce: '🥬',
                                                        dairy: '🧀', meat: '🥩', perishable: '❄️',
                                                        non_perishable: '📦', mixed: '📋'
                                                    }[l.food_category] || '🍱'}
                                                </div>
                                                <div>
                                                    <p className="font-bold text-slate-900 text-sm">{l.title}</p>
                                                    <p className="text-xs text-slate-500 truncate max-w-[150px]">{l.address}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <p className="text-sm font-medium text-slate-700">{l.donor_id?.substring(0, 8)}...</p>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="text-sm font-medium text-slate-700">{l.quantity_kg} kg</span>
                                            <p className="text-[10px] text-slate-400">
                                                Expires {new Date(l.expires_at).toLocaleDateString()}
                                            </p>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wide ${getStatusColor(l.status)}`}>
                                                {l.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex justify-end gap-2">
                                                <button
                                                    onClick={() => confirmDelete(l.id)}
                                                    className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                    title="Delete Listing"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Delete Confirmation Modal */}
            {deleteId && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-sm overflow-hidden p-6 text-center">
                        <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4 text-red-600">
                            <AlertCircle size={24} />
                        </div>
                        <h3 className="text-lg font-bold text-slate-900 mb-2">Delete Listing?</h3>
                        <p className="text-slate-500 text-sm mb-6">
                            Are you sure you want to delete this listing? This action cannot be undone.
                        </p>
                        <div className="flex gap-3 justify-center">
                            <Button variant="outline" onClick={() => setDeleteId(null)}>
                                Cancel
                            </Button>
                            <Button className="bg-red-600 hover:bg-red-700 text-white" onClick={handleDelete}>
                                Delete Listing
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

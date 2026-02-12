'use client';

import { useState, useEffect, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { useSession } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { analyticsApi, usersApi } from '@/lib/api';
import ImpactCard from '@/components/ImpactCard';
import { useToast } from '@/components/ui/toast';
import { User, UserRole, PlatformStats, ImpactSummary, LeaderboardEntry } from '@/types';

const OverviewCharts = dynamic(() => import('@/components/admin/OverviewCharts'), { ssr: false });
const ListingsManager = dynamic(() => import('@/components/admin/ListingsManager'), { ssr: false });
const DeliveriesManager = dynamic(() => import('@/components/admin/DeliveriesManager'), { ssr: false });

// Tab component
function Tab({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
    return (
        <button
            onClick={onClick}
            className={`px-6 py-3 font-medium transition-colors relative ${active ? 'text-green-600' : 'text-gray-500 hover:text-gray-700'
                }`}
        >
            {children}
            {active && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-green-600" />}
        </button>
    );
}

export default function AdminPage() {
    const { data: session } = useSession();
    const toast = useToast();

    const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'listings' | 'deliveries'>('overview');
    const [loading, setLoading] = useState(true);

    // Overview data
    const [platformStats, setPlatformStats] = useState<PlatformStats | null>(null);
    const [impact, setImpact] = useState<ImpactSummary | null>(null);
    const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);

    // Users data
    const [users, setUsers] = useState<User[]>([]);
    const [userFilter, setUserFilter] = useState<'all' | UserRole>('all');
    const [userSearch, setUserSearch] = useState('');

    const fetchOverviewData = useCallback(async () => {
        try {
            const [statsData, impactData, leaderData] = await Promise.all([
                analyticsApi.getPlatform() as Promise<PlatformStats>,
                analyticsApi.getImpact() as Promise<ImpactSummary>,
                analyticsApi.getVolunteerLeaderboard(10) as Promise<LeaderboardEntry[]>,
            ]);
            setPlatformStats(statsData);
            setImpact(impactData);
            setLeaderboard(leaderData.slice(0, 10));
        } catch (error) {
            console.error('Failed to fetch overview data:', error);
            toast.error('Failed to load analytics');
        }
    }, [toast]);

    const fetchUsers = useCallback(async () => {
        try {
            let usersData: User[];
            if (userFilter === 'charity') {
                usersData = await usersApi.getCharities() as User[];
            } else if (userFilter === 'volunteer') {
                usersData = await usersApi.getAvailableVolunteers() as User[];
            } else {
                // Fetch all - combine charities and volunteers
                const [charities, volunteers] = await Promise.all([
                    usersApi.getCharities() as Promise<User[]>,
                    usersApi.getAvailableVolunteers() as Promise<User[]>,
                ]);
                usersData = [...charities, ...volunteers];
            }
            setUsers(usersData);
        } catch (error) {
            console.error('Failed to fetch users:', error);
        }
    }, [userFilter]);

    useEffect(() => {
        setLoading(true);
        if (activeTab === 'overview') {
            fetchOverviewData().finally(() => setLoading(false));
        } else if (activeTab === 'users') {
            fetchUsers().finally(() => setLoading(false));
        } else {
            setLoading(false);
        }
    }, [activeTab, fetchOverviewData, fetchUsers]);

    const filteredUsers = users.filter(user =>
        userSearch === '' ||
        user.name.toLowerCase().includes(userSearch.toLowerCase()) ||
        (user.email && user.email.toLowerCase().includes(userSearch.toLowerCase()))
    );

    // Role badge colors
    const getRoleBadge = (role: UserRole) => {
        const colors = {
            donor: 'bg-green-100 text-green-800',
            volunteer: 'bg-blue-100 text-blue-800',
            charity: 'bg-purple-100 text-purple-800',
            admin: 'bg-red-100 text-red-800',
        };
        return colors[role] || 'bg-gray-100 text-gray-800';
    };

    if (!session || session.user.role !== 'admin') {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-gray-100">
                <div className="text-center p-8 bg-white rounded-2xl shadow-xl">
                    <h2 className="text-2xl font-bold text-gray-800 mb-4">Admin Access Required</h2>
                    <p className="text-gray-600 mb-6">You must be an administrator to view this page.</p>
                    <div className="flex flex-col gap-3">
                        {!session ? (
                            <Button className="bg-emerald-600 hover:bg-emerald-700">Sign In</Button>
                        ) : (
                            <p className="text-sm text-red-500 bg-red-50 py-2 px-4 rounded-lg">
                                Current role: {session.user.role || 'user'}
                            </p>
                        )}
                        <Button variant="outline" onClick={() => window.location.href = '/'}>
                            Return Home
                        </Button>
                    </div>
                </div>
            </div>
        );
    }

    // Dynamic imports for performance
    const OverviewCharts = dynamic(() => import('@/components/admin/OverviewCharts'), { ssr: false });
    const ListingsManager = dynamic(() => import('@/components/admin/ListingsManager'), { ssr: false });
    const DeliveriesManager = dynamic(() => import('@/components/admin/DeliveriesManager'), { ssr: false });

    // ... existing imports ...

    return (
        <div className="min-h-screen bg-slate-50/50 pb-20">
            <div className="max-w-7xl mx-auto px-4 py-8">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Admin Dashboard</h1>
                    <p className="text-slate-500 mt-1">Platform management and analytics overview.</p>
                </div>

                {/* Tabs */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 mb-8 overflow-hidden">
                    <div className="border-b border-slate-100 flex overflow-x-auto">
                        <Tab active={activeTab === 'overview'} onClick={() => setActiveTab('overview')}>
                            Overview
                        </Tab>
                        <Tab active={activeTab === 'users'} onClick={() => setActiveTab('users')}>
                            Users
                        </Tab>
                        <Tab active={activeTab === 'listings'} onClick={() => setActiveTab('listings')}>
                            Listings
                        </Tab>
                        <Tab active={activeTab === 'deliveries'} onClick={() => setActiveTab('deliveries')}>
                            Deliveries
                        </Tab>
                    </div>

                    {/* Tab Content */}
                    <div className="p-6 bg-slate-50/30 min-h-[500px]">
                        {loading ? (
                            <div className="flex items-center justify-center py-20">
                                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-emerald-600 opacity-50" />
                            </div>
                        ) : activeTab === 'overview' ? (
                            <div className="space-y-8 animate-in fade-in duration-500">
                                {/* Platform Stats */}
                                <div>
                                    <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-4">Live Statistics</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                        <ImpactCard title="Total Users" value={platformStats?.total_users ?? 0} icon="👥" colorScheme="blue" />
                                        <ImpactCard title="Active Listings" value={platformStats?.active_listings ?? 0} icon="📦" colorScheme="green" />
                                        <ImpactCard title="Pending Deliveries" value={platformStats?.pending_deliveries ?? 0} icon="🚚" colorScheme="amber" />
                                        <ImpactCard title="Completed Today" value={platformStats?.completed_today ?? 0} icon="✅" colorScheme="purple" />
                                    </div>
                                </div>

                                {/* Charts */}
                                <div>
                                    <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-4">Analytics & Trends</h3>
                                    <OverviewCharts />
                                </div>

                                {/* Impact Metrics */}
                                <div>
                                    <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-4">Environmental Impact</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        <ImpactCard title="Meals Rescued" value={impact?.total_meals_rescued ?? 0} icon="🍽️" colorScheme="green" size="lg" />
                                        <ImpactCard title="Food Saved" value={`${(impact?.total_kg_saved ?? 0).toFixed(0)} kg`} icon="📦" colorScheme="amber" size="lg" />
                                        <ImpactCard title="CO₂ Reduced" value={`${(impact?.total_co2_reduced_kg ?? 0).toFixed(0)} kg`} icon="🌱" colorScheme="blue" size="lg" />
                                    </div>
                                </div>

                                {/* Leaderboard */}
                                <div>
                                    <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-4">Top Volunteers</h3>
                                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                                        <table className="w-full">
                                            <thead className="bg-slate-50 border-b border-slate-100">
                                                <tr>
                                                    <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Rank</th>
                                                    <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Volunteer</th>
                                                    <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Deliveries</th>
                                                    <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Meals</th>
                                                    <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Reliability</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-100">
                                                {leaderboard.map((entry, index) => (
                                                    <tr key={index} className="hover:bg-slate-50/50">
                                                        <td className="px-6 py-4">
                                                            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${index === 0 ? 'bg-amber-100 text-amber-700' :
                                                                index === 1 ? 'bg-slate-200 text-slate-700' :
                                                                    index === 2 ? 'bg-orange-100 text-orange-800' : 'bg-slate-100 text-slate-500'
                                                                }`}>
                                                                {index + 1}
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-4 font-medium text-slate-900">{entry.user_name}</td>
                                                        <td className="px-6 py-4 text-slate-600">{entry.total_deliveries}</td>
                                                        <td className="px-6 py-4 text-slate-600">{entry.total_meals_rescued}</td>
                                                        <td className="px-6 py-4">
                                                            <span className="text-emerald-600 font-bold">{entry.reliability_score}%</span>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </div>
                        ) : activeTab === 'users' ? (
                            <div className="space-y-6 animate-in fade-in duration-300">
                                {/* Filters */}
                                <div className="flex flex-wrap gap-4 items-center justify-between">
                                    <div className="flex gap-2 p-1 bg-slate-100 rounded-lg">
                                        {(['all', 'volunteer', 'charity', 'donor'] as const).map(role => (
                                            <button
                                                key={role}
                                                onClick={() => setUserFilter(role)}
                                                className={`px-4 py-2 rounded-md text-xs font-bold uppercase transition-all ${userFilter === role
                                                    ? 'bg-white text-emerald-600 shadow-sm'
                                                    : 'text-slate-500 hover:text-slate-700'
                                                    }`}
                                            >
                                                {role}s
                                            </button>
                                        ))}
                                    </div>
                                    <input
                                        type="text"
                                        placeholder="Search users..."
                                        value={userSearch}
                                        onChange={(e) => setUserSearch(e.target.value)}
                                        className="px-4 py-2 border border-slate-200 rounded-lg text-sm w-full md:w-64 focus:ring-2 focus:ring-emerald-500/20 outline-none"
                                    />
                                </div>

                                {/* Users Table */}
                                <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                                    <table className="w-full">
                                        <thead className="bg-slate-50 border-b border-slate-100">
                                            <tr>
                                                <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">User</th>
                                                <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Role</th>
                                                <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th>
                                                <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Score</th>
                                                <th className="px-6 py-4 text-right text-xs font-bold text-slate-500 uppercase tracking-wider">Action</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {filteredUsers.map(user => (
                                                <tr key={user.id} className="hover:bg-slate-50/50">
                                                    <td className="px-6 py-4">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-xs font-bold text-slate-600 overflow-hidden">
                                                                {user.image_url ? <img src={user.image_url} alt="" /> : user.name.charAt(0)}
                                                            </div>
                                                            <div>
                                                                <p className="font-bold text-slate-900 text-sm">{user.name}</p>
                                                                <p className="text-xs text-slate-500">{user.email}</p>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold uppercase ${getRoleBadge(user.role)}`}>
                                                            {user.role}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <span className={`flex items-center gap-1.5 text-xs font-medium ${user.is_available ? 'text-emerald-600' : 'text-slate-400'}`}>
                                                            <div className={`w-1.5 h-1.5 rounded-full ${user.is_available ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                                                            {user.is_available ? 'Online' : 'Offline'}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <span className="text-sm font-bold text-slate-700">{user.reliability_score?.toFixed(0) || '-'}%</span>
                                                    </td>
                                                    <td className="px-6 py-4 text-right">
                                                        <Button variant="ghost" size="sm" className="h-8 text-slate-400 hover:text-emerald-600">Edit</Button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        ) : activeTab === 'listings' ? (
                            <ListingsManager />
                        ) : (
                            <DeliveriesManager />
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

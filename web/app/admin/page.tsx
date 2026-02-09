'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { analyticsApi, usersApi } from '@/lib/api';
import ImpactCard from '@/components/ImpactCard';
import { useToast } from '@/components/ui/toast';
import { User, UserRole, PlatformStats, ImpactSummary, LeaderboardEntry } from '@/types';

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

    if (!session) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-gray-100">
                <div className="text-center p-8 bg-white rounded-2xl shadow-xl">
                    <h2 className="text-2xl font-bold text-gray-800 mb-4">Admin Access Required</h2>
                    <p className="text-gray-600 mb-6">Please sign in with an admin account</p>
                    <Button className="bg-red-600 hover:bg-red-700">Sign In</Button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-gray-100">
            <div className="max-w-7xl mx-auto px-4 py-8">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
                    <p className="text-gray-600 mt-1">Platform management and analytics</p>
                </div>

                {/* Tabs */}
                <div className="bg-white rounded-2xl shadow-lg mb-8">
                    <div className="border-b flex">
                        <Tab active={activeTab === 'overview'} onClick={() => setActiveTab('overview')}>
                            📊 Overview
                        </Tab>
                        <Tab active={activeTab === 'users'} onClick={() => setActiveTab('users')}>
                            👥 Users
                        </Tab>
                        <Tab active={activeTab === 'listings'} onClick={() => setActiveTab('listings')}>
                            📦 Listings
                        </Tab>
                        <Tab active={activeTab === 'deliveries'} onClick={() => setActiveTab('deliveries')}>
                            🚚 Deliveries
                        </Tab>
                    </div>

                    {/* Tab Content */}
                    <div className="p-6">
                        {loading ? (
                            <div className="flex items-center justify-center py-12">
                                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600" />
                            </div>
                        ) : activeTab === 'overview' ? (
                            <div className="space-y-8">
                                {/* Platform Stats */}
                                <div>
                                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Platform Statistics</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                        <ImpactCard
                                            title="Total Users"
                                            value={platformStats?.total_users ?? 0}
                                            icon="👥"
                                            colorScheme="blue"
                                        />
                                        <ImpactCard
                                            title="Active Listings"
                                            value={platformStats?.active_listings ?? 0}
                                            icon="📦"
                                            colorScheme="green"
                                        />
                                        <ImpactCard
                                            title="Pending Deliveries"
                                            value={platformStats?.pending_deliveries ?? 0}
                                            icon="🚚"
                                            colorScheme="amber"
                                        />
                                        <ImpactCard
                                            title="Completed Today"
                                            value={platformStats?.completed_today ?? 0}
                                            icon="✅"
                                            colorScheme="purple"
                                        />
                                    </div>
                                </div>

                                {/* Impact Metrics */}
                                <div>
                                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Impact Metrics</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        <ImpactCard
                                            title="Meals Rescued"
                                            value={impact?.total_meals_rescued ?? 0}
                                            icon="🍽️"
                                            colorScheme="green"
                                            size="lg"
                                        />
                                        <ImpactCard
                                            title="Food Saved"
                                            value={`${(impact?.total_kg_saved ?? 0).toFixed(0)} kg`}
                                            icon="📦"
                                            colorScheme="amber"
                                            size="lg"
                                        />
                                        <ImpactCard
                                            title="CO₂ Reduced"
                                            value={`${(impact?.total_co2_reduced_kg ?? 0).toFixed(0)} kg`}
                                            icon="🌱"
                                            colorScheme="blue"
                                            size="lg"
                                        />
                                    </div>
                                </div>

                                {/* Leaderboard */}
                                <div>
                                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Volunteers</h3>
                                    <div className="bg-gray-50 rounded-xl overflow-hidden">
                                        <table className="w-full">
                                            <thead className="bg-gray-100">
                                                <tr>
                                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Rank</th>
                                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Volunteer</th>
                                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Deliveries</th>
                                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Meals</th>
                                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Reliability</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-200">
                                                {leaderboard.length === 0 ? (
                                                    <tr>
                                                        <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                                                            No leaderboard data yet
                                                        </td>
                                                    </tr>
                                                ) : (
                                                    leaderboard.map((entry, index) => (
                                                        <tr key={entry.user_id} className="hover:bg-white">
                                                            <td className="px-4 py-3">
                                                                <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold ${index === 0 ? 'bg-yellow-100 text-yellow-800' :
                                                                    index === 1 ? 'bg-gray-200 text-gray-700' :
                                                                        index === 2 ? 'bg-amber-100 text-amber-800' :
                                                                            'bg-gray-100 text-gray-600'
                                                                    }`}>
                                                                    {index + 1}
                                                                </span>
                                                            </td>
                                                            <td className="px-4 py-3 font-medium text-gray-900">
                                                                {entry.user_name || 'Anonymous'}
                                                            </td>
                                                            <td className="px-4 py-3 text-gray-600">{entry.total_deliveries}</td>
                                                            <td className="px-4 py-3 text-gray-600">{entry.total_meals_rescued}</td>
                                                            <td className="px-4 py-3">
                                                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${(entry.reliability_score ?? 0) >= 90 ? 'bg-green-100 text-green-800' :
                                                                    (entry.reliability_score ?? 0) >= 70 ? 'bg-yellow-100 text-yellow-800' :
                                                                        'bg-red-100 text-red-800'
                                                                    }`}>
                                                                    {entry.reliability_score?.toFixed(0) ?? 'N/A'}%
                                                                </span>
                                                            </td>
                                                        </tr>
                                                    ))
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </div>
                        ) : activeTab === 'users' ? (
                            <div className="space-y-6">
                                {/* Filters */}
                                <div className="flex flex-wrap gap-4 items-center">
                                    <div className="flex gap-2">
                                        {(['all', 'volunteer', 'charity', 'donor'] as const).map(role => (
                                            <button
                                                key={role}
                                                onClick={() => setUserFilter(role)}
                                                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${userFilter === role
                                                    ? 'bg-green-600 text-white'
                                                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                                    }`}
                                            >
                                                {role === 'all' ? 'All' : role.charAt(0).toUpperCase() + role.slice(1)}s
                                            </button>
                                        ))}
                                    </div>
                                    <input
                                        type="text"
                                        placeholder="Search users..."
                                        value={userSearch}
                                        onChange={(e) => setUserSearch(e.target.value)}
                                        className="px-4 py-2 border border-gray-300 rounded-lg flex-1 max-w-xs"
                                    />
                                </div>

                                {/* Users Table */}
                                <div className="bg-gray-50 rounded-xl overflow-hidden">
                                    <table className="w-full">
                                        <thead className="bg-gray-100">
                                            <tr>
                                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Role</th>
                                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Reliability</th>
                                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-200">
                                            {filteredUsers.length === 0 ? (
                                                <tr>
                                                    <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                                                        No users found
                                                    </td>
                                                </tr>
                                            ) : (
                                                filteredUsers.map(user => (
                                                    <tr key={user.id} className="hover:bg-white">
                                                        <td className="px-4 py-3">
                                                            <div className="flex items-center gap-3">
                                                                {user.image_url ? (
                                                                    <img
                                                                        src={user.image_url}
                                                                        alt=""
                                                                        className="w-8 h-8 rounded-full"
                                                                    />
                                                                ) : (
                                                                    <div className="w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center text-gray-600 text-sm">
                                                                        {user.name.charAt(0)}
                                                                    </div>
                                                                )}
                                                                <span className="font-medium text-gray-900">{user.name}</span>
                                                            </div>
                                                        </td>
                                                        <td className="px-4 py-3 text-gray-600">{user.email}</td>
                                                        <td className="px-4 py-3">
                                                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${getRoleBadge(user.role)}`}>
                                                                {user.role}
                                                            </span>
                                                        </td>
                                                        <td className="px-4 py-3">
                                                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${user.is_available
                                                                ? 'bg-green-100 text-green-800'
                                                                : 'bg-gray-100 text-gray-600'
                                                                }`}>
                                                                {user.is_available ? 'Available' : 'Unavailable'}
                                                            </span>
                                                        </td>
                                                        <td className="px-4 py-3">
                                                            {user.reliability_score != null ? (
                                                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${user.reliability_score >= 90 ? 'bg-green-100 text-green-800' :
                                                                    user.reliability_score >= 70 ? 'bg-yellow-100 text-yellow-800' :
                                                                        'bg-red-100 text-red-800'
                                                                    }`}>
                                                                    {user.reliability_score.toFixed(0)}%
                                                                </span>
                                                            ) : (
                                                                <span className="text-gray-400">N/A</span>
                                                            )}
                                                        </td>
                                                        <td className="px-4 py-3">
                                                            <Button variant="outline" size="sm">
                                                                View
                                                            </Button>
                                                        </td>
                                                    </tr>
                                                ))
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        ) : activeTab === 'listings' ? (
                            <div className="text-center py-12 text-gray-500">
                                <span className="text-5xl">📦</span>
                                <h3 className="mt-4 text-lg font-medium text-gray-900">Listings Management</h3>
                                <p className="mt-2">View and manage all food listings across the platform</p>
                                <p className="mt-4 text-sm text-gray-400">Coming soon</p>
                            </div>
                        ) : (
                            <div className="text-center py-12 text-gray-500">
                                <span className="text-5xl">🚚</span>
                                <h3 className="mt-4 text-lg font-medium text-gray-900">Deliveries Management</h3>
                                <p className="mt-2">Track and manage all deliveries in real-time</p>
                                <p className="mt-4 text-sm text-gray-400">Coming soon</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

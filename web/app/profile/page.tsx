'use client';

import { useState, useEffect } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { fetcher, putData, postData } from '@/lib/api';
import { useToast } from '@/components/ui/toast';
import { User, Settings, Activity, LogOut, Award, MapPin, Phone as PhoneIcon, Mail } from 'lucide-react';

export default function ProfilePage() {
    const { data: session } = useSession();
    const { success, error } = useToast();
    const [activeTab, setActiveTab] = useState('overview');
    const [profile, setProfile] = useState({
        name: '',
        role: 'volunteer',
        phone: '',
        email: '',
    });
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({
        donations: 0,
        deliveries: 0,
        reliability: 100,
    });

    useEffect(() => {
        const loadProfile = async () => {
            let userId = localStorage.getItem('optimeal_user_id');

            if (!userId && session?.user?.email) {
                try {
                    const getSync = await postData<{ id: string }>('/api/auth/sync', {
                        email: session.user.email,
                        name: session.user.name || 'Unknown',
                        image_url: session.user.image,
                        provider: 'google',
                        provider_id: 'google'
                    });
                    userId = getSync.id;
                    localStorage.setItem('optimeal_user_id', userId);
                } catch (e) {
                    console.error("Sync failed", e);
                }
            }

            if (userId) {
                try {
                    const data = await fetcher<any>(`/api/users/${userId}`);
                    setProfile({
                        name: data.name || '',
                        role: data.role || 'volunteer',
                        phone: data.phone || '',
                        email: data.email || session?.user?.email || '',
                    });
                    setStats({
                        donations: data.total_donations || 0,
                        deliveries: data.total_deliveries || 0,
                        reliability: data.reliability_score || 100,
                    });
                } catch (e) {
                    console.error(e);
                }
            }
            setLoading(false);
        };

        if (session !== undefined) {
            loadProfile();
        }
    }, [session]);

    const handleUpdate = async (e: React.FormEvent) => {
        e.preventDefault();
        const userId = localStorage.getItem('optimeal_user_id');
        if (!userId) return;

        try {
            await putData(`/api/users/${userId}`, profile);
            success("Profile Updated", "Your profile information has been saved successfully.");
        } catch (err) {
            error("Update Failed", "Could not save changes. Please try again.");
        }
    };

    if (loading) return (
        <div className="min-h-screen flex items-center justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
        </div>
    );

    const renderContent = () => {
        switch (activeTab) {
            case 'overview':
                return (
                    <div className="space-y-6">
                        {/* Stats Cards */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 flex flex-col items-center">
                                <Award className="w-8 h-8 text-emerald-500 mb-2" />
                                <span className="text-3xl font-bold text-slate-800">{stats.donations}</span>
                                <span className="text-sm text-slate-500">Donations</span>
                            </div>
                            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 flex flex-col items-center">
                                <MapPin className="w-8 h-8 text-blue-500 mb-2" />
                                <span className="text-3xl font-bold text-slate-800">{stats.deliveries}</span>
                                <span className="text-sm text-slate-500">Deliveries</span>
                            </div>
                            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 flex flex-col items-center">
                                <Activity className="w-8 h-8 text-amber-500 mb-2" />
                                <span className="text-3xl font-bold text-slate-800">{Math.round(stats.reliability)}%</span>
                                <span className="text-sm text-slate-500">Reliability Score</span>
                            </div>
                        </div>

                        {/* Recent Activity Placeholder */}
                        <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
                            <h3 className="text-lg font-semibold text-slate-800 mb-4">Recent Activity</h3>
                            <div className="space-y-4">
                                <div className="flex items-center p-3 bg-slate-50 rounded-lg">
                                    <div className="w-2 h-2 bg-emerald-500 rounded-full mr-3"></div>
                                    <p className="text-sm text-slate-600">You logged in successfully.</p>
                                    <span className="ml-auto text-xs text-slate-400">Just now</span>
                                </div>
                                <div className="flex items-center p-3 bg-slate-50 rounded-lg">
                                    <div className="w-2 h-2 bg-blue-500 rounded-full mr-3"></div>
                                    <p className="text-sm text-slate-600">Profile page viewed.</p>
                                    <span className="ml-auto text-xs text-slate-400">2 mins ago</span>
                                </div>
                            </div>
                        </div>
                    </div>
                );
            case 'settings':
                return (
                    <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-8">
                        <h2 className="text-xl font-bold text-slate-800 mb-6">Profile Settings</h2>
                        <form onSubmit={handleUpdate} className="space-y-6 max-w-lg">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="text-sm font-medium text-slate-700 mb-1 block">Full Name</label>
                                    <div className="relative">
                                        <User className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                                        <Input
                                            value={profile.name}
                                            onChange={e => setProfile({ ...profile, name: e.target.value })}
                                            className="pl-10"
                                            placeholder="John Doe"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="text-sm font-medium text-slate-700 mb-1 block">Role</label>
                                    <select
                                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                                        value={profile.role}
                                        onChange={e => setProfile({ ...profile, role: e.target.value })}
                                    >
                                        <option value="donor">Donor</option>
                                        <option value="volunteer">Volunteer</option>
                                        <option value="charity">Charity</option>
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="text-sm font-medium text-slate-700 mb-1 block">Email Address</label>
                                <div className="relative">
                                    <Mail className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                                    <Input
                                        value={profile.email}
                                        disabled
                                        className="pl-10 bg-slate-50"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="text-sm font-medium text-slate-700 mb-1 block">Phone Number</label>
                                <div className="relative">
                                    <PhoneIcon className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                                    <Input
                                        value={profile.phone}
                                        onChange={e => setProfile({ ...profile, phone: e.target.value })}
                                        className="pl-10"
                                        placeholder="+1 234 567 8900"
                                    />
                                </div>
                            </div>

                            <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700 text-white w-full md:w-auto">
                                Save Changes
                            </Button>
                        </form>
                    </div>
                );
            default:
                return null;
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 py-8">
            <div className="container mx-auto px-4 max-w-6xl">
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                    {/* Sidebar */}
                    <div className="lg:col-span-1 space-y-6">
                        {/* User Card */}
                        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 text-center">
                            <div className="w-24 h-24 mx-auto bg-emerald-100 rounded-full flex items-center justify-center text-3xl font-bold text-emerald-600 mb-4 overflow-hidden">
                                {session?.user?.image ? (
                                    <img src={session.user.image} alt="Profile" className="w-full h-full object-cover" />
                                ) : (
                                    profile.name.charAt(0) || 'U'
                                )}
                            </div>
                            <h2 className="text-xl font-bold text-slate-800">{profile.name}</h2>
                            <p className="text-sm text-slate-500 capitalize">{profile.role}</p>
                        </div>

                        {/* Navigation */}
                        <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
                            <nav className="flex flex-col">
                                <button
                                    onClick={() => setActiveTab('overview')}
                                    className={`flex items-center px-6 py-4 text-sm font-medium transition-colors ${activeTab === 'overview'
                                        ? 'bg-emerald-50 text-emerald-600 border-l-4 border-emerald-600'
                                        : 'text-slate-600 hover:bg-slate-50'
                                        }`}
                                >
                                    <Activity className="w-4 h-4 mr-3" />
                                    Overview
                                </button>
                                <button
                                    onClick={() => setActiveTab('settings')}
                                    className={`flex items-center px-6 py-4 text-sm font-medium transition-colors ${activeTab === 'settings'
                                        ? 'bg-emerald-50 text-emerald-600 border-l-4 border-emerald-600'
                                        : 'text-slate-600 hover:bg-slate-50'
                                        }`}
                                >
                                    <Settings className="w-4 h-4 mr-3" />
                                    Settings
                                </button>
                                <button
                                    onClick={() => {
                                        localStorage.removeItem('optimeal_user_id');
                                        signOut({ callbackUrl: '/' });
                                    }}
                                    className="flex items-center px-6 py-4 text-sm font-medium text-red-600 hover:bg-red-50 transition-colors border-t border-slate-100"
                                >
                                    <LogOut className="w-4 h-4 mr-3" />
                                    Sign Out
                                </button>
                            </nav>
                        </div>
                    </div>

                    {/* Main Content */}
                    <div className="lg:col-span-3">
                        <div className="mb-8">
                            <h1 className="text-2xl font-bold text-slate-800">
                                {activeTab === 'overview' ? 'Dashboard Overview' : 'Account Settings'}
                            </h1>
                            <p className="text-slate-500">
                                {activeTab === 'overview'
                                    ? 'Track your impact and recent activity.'
                                    : 'Manage your profile details and preferences.'}
                            </p>
                        </div>
                        {renderContent()}
                    </div>
                </div>
            </div>
        </div>
    );
}

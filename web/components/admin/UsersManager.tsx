'use client';

import { useState, useEffect, useCallback } from 'react';
import { usersApi } from '@/lib/api';
import { User, UserRole } from '@/types';
import { Search, Edit2, X, Check, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/toast';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function UsersManager() {
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [userFilter, setUserFilter] = useState<'all' | UserRole>('all');
    const [userSearch, setUserSearch] = useState('');
    const { success, error } = useToast();

    // Edit State
    const [editingUser, setEditingUser] = useState<User | null>(null);
    const [isSaving, setIsSaving] = useState(false);

    const fetchUsers = useCallback(async () => {
        setLoading(true);
        try {
            let usersData: User[];
            if (userFilter === 'charity') {
                usersData = await usersApi.getCharities() as User[];
            } else if (userFilter === 'volunteer') {
                usersData = await usersApi.getAvailableVolunteers() as User[];
            } else {
                // Fetch all - simple approximation by combining common roles or using a dedicated admin endpoint if available
                // Since we don't have a specific getAllUsers, we'll combine known lists or check if the API supports it
                // For now, let's stick to the previous logic of combining charities + volunteers
                // In a real scenario, we'd want a dedicated /api/users endpoint for admins
                const [charities, volunteers] = await Promise.all([
                    usersApi.getCharities() as Promise<User[]>,
                    usersApi.getAvailableVolunteers() as Promise<User[]>,
                ]);
                // De-duplicate by ID just in case
                const map = new Map();
                charities.forEach(u => map.set(u.id, u));
                volunteers.forEach(u => map.set(u.id, u));
                usersData = Array.from(map.values());
            }
            setUsers(usersData);
        } catch (err) {
            console.error('Failed to fetch users:', err);
            error('Load Failed', 'Could not load users list.');
        } finally {
            setLoading(false);
        }
    }, [userFilter, error]);

    useEffect(() => {
        fetchUsers();
    }, [fetchUsers]);

    const handleEditSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingUser) return;
        setIsSaving(true);
        try {
            // Update user role and availability
            // We use the generic usersApi.update
            await usersApi.update(editingUser.id, {
                name: editingUser.name,
                role: editingUser.role,
                phone: editingUser.phone,
                // availability is usually a separate toggle but we can try updating it here if backend supports
            });

            // Also update availability if changed via specific endpoint (optional, but robust)
            // await usersApi.toggleAvailability(editingUser.id, editingUser.is_available);

            success('User Updated', `${editingUser.name}'s profile has been updated.`);
            setEditingUser(null);
            fetchUsers();
        } catch (err) {
            error('Update Failed', 'Could not update user.');
        } finally {
            setIsSaving(false);
        }
    };

    const filteredUsers = users.filter(user =>
        userSearch === '' ||
        user.name.toLowerCase().includes(userSearch.toLowerCase()) ||
        (user.email && user.email.toLowerCase().includes(userSearch.toLowerCase()))
    );

    const getRoleBadge = (role: UserRole) => {
        const colors = {
            donor: 'bg-green-100 text-green-800',
            volunteer: 'bg-blue-100 text-blue-800',
            charity: 'bg-purple-100 text-purple-800',
            admin: 'bg-red-100 text-red-800',
        };
        return colors[role] || 'bg-gray-100 text-gray-800';
    };

    return (
        <div className="space-y-6 relative">
            {/* Toolbar */}
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
                <div className="relative w-full md:w-64">
                    <Search className="absolute left-3 top-2.5 text-slate-400" size={18} />
                    <input
                        type="text"
                        placeholder="Search users..."
                        value={userSearch}
                        onChange={(e) => setUserSearch(e.target.value)}
                        className="pl-10 pr-4 py-2 border border-slate-200 rounded-lg text-sm w-full focus:ring-2 focus:ring-emerald-500/20 outline-none"
                    />
                </div>
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
                        {loading ? (
                            <tr><td colSpan={5} className="p-8 text-center text-slate-500">Loading users...</td></tr>
                        ) : filteredUsers.length === 0 ? (
                            <tr><td colSpan={5} className="p-8 text-center text-slate-500">No users found.</td></tr>
                        ) : filteredUsers.map(user => (
                            <tr key={user.id} className="hover:bg-slate-50/50">
                                <td className="px-6 py-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-xs font-bold text-slate-600 overflow-hidden">
                                            {user.image_url ? <img src={user.image_url} alt="" className="w-full h-full object-cover" /> : user.name.charAt(0)}
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
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-8 text-slate-400 hover:text-emerald-600"
                                        onClick={() => setEditingUser(user)}
                                    >
                                        Edit
                                    </Button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Edit Modal Overlay */}
            {editingUser && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
                        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                            <h3 className="font-bold text-lg text-slate-800">Edit User</h3>
                            <button onClick={() => setEditingUser(null)} className="text-slate-400 hover:text-slate-600">
                                <X size={20} />
                            </button>
                        </div>

                        <form onSubmit={handleEditSave} className="p-6 space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="name">Full Name</Label>
                                <Input
                                    id="name"
                                    value={editingUser.name}
                                    onChange={e => setEditingUser({ ...editingUser, name: e.target.value })}
                                    required
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="role">Role</Label>
                                <select
                                    id="role"
                                    value={editingUser.role}
                                    onChange={e => setEditingUser({ ...editingUser, role: e.target.value as UserRole })}
                                    className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm ring-offset-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2"
                                >
                                    <option value="donor">Donor</option>
                                    <option value="volunteer">Volunteer</option>
                                    <option value="charity">Charity</option>
                                    <option value="admin">Admin</option>
                                </select>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="phone">Phone Number</Label>
                                <Input
                                    id="phone"
                                    value={editingUser.phone || ''}
                                    onChange={e => setEditingUser({ ...editingUser, phone: e.target.value })}
                                    placeholder="+1 234 567 890"
                                />
                            </div>

                            <div className="flex justify-end gap-3 pt-4">
                                <Button type="button" variant="ghost" onClick={() => setEditingUser(null)}>
                                    Cancel
                                </Button>
                                <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700 text-white" disabled={isSaving}>
                                    {isSaving ? (
                                        <>
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            Saving...
                                        </>
                                    ) : (
                                        'Save Changes'
                                    )}
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

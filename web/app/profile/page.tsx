'use client';

import { useState, useEffect } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { fetcher, putData, postData } from '@/lib/api';

export default function ProfilePage() {
    const { data: session } = useSession();
    const [profile, setProfile] = useState({
        name: '',
        role: 'volunteer',
        phone: '',
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadProfile = async () => {
            let userId = localStorage.getItem('optimeal_user_id');

            // If no ID but session exists (sync race condition), try to sync manually or wait
            if (!userId && session?.user?.email) {
                try {
                    const getSync = await fetcher('/api/auth/sync', {
                        method: 'POST',
                        body: JSON.stringify({
                            email: session.user.email,
                            name: session.user.name || 'Unknown',
                            image_url: session.user.image,
                            provider: 'google',
                            provider_id: 'google'
                        })
                    }); // Helper to just trigger sync endpoint
                    userId = getSync.id;
                    localStorage.setItem('optimeal_user_id', userId!);
                } catch (e) {
                    console.error("Sync failed on profile load", e);
                }
            }

            if (userId) {
                try {
                    const data = await fetcher(`/api/users/${userId}`);
                    setProfile({
                        name: data.name || '',
                        role: data.role || 'volunteer',
                        phone: data.phone || '',
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
            alert("Profile Updated!");
            // Optionally force session update or reload
        } catch (err) {
            alert("Update failed");
        }
    };

    if (loading) return <div>Loading...</div>;

    return (
        <div className="max-w-md mx-auto py-10">
            <div className="flex items-center gap-4 mb-6">
                {session?.user?.image && (
                    <img src={session.user.image} alt="Profile" className="w-16 h-16 rounded-full" />
                )}
                <h1 className="text-2xl font-bold">Edit Profile</h1>
            </div>

            <form onSubmit={handleUpdate} className="space-y-4">
                <div>
                    <label className="text-sm font-medium">Name</label>
                    <Input
                        value={profile.name}
                        onChange={e => setProfile({ ...profile, name: e.target.value })}
                    />
                </div>
                <div>
                    <label className="text-sm font-medium">Role</label>
                    <select
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                        value={profile.role}
                        onChange={e => setProfile({ ...profile, role: e.target.value })}
                    >
                        <option value="donor">Donor</option>
                        <option value="volunteer">Volunteer</option>
                        <option value="charity">Charity</option>
                    </select>
                </div>
                <div>
                    <label className="text-sm font-medium">Phone</label>
                    <Input
                        value={profile.phone}
                        onChange={e => setProfile({ ...profile, phone: e.target.value })}
                        placeholder="+1 234 567 8900"
                    />
                </div>

                <Button type="submit">Save Changes</Button>
            </form >

            <div className="mt-8 pt-8 border-t">
                <Button variant="destructive" onClick={() => {
                    localStorage.removeItem('optimeal_user_id');
                    signOut({ callbackUrl: '/' });
                }}>
                    Sign Out
                </Button>
            </div>
        </div >
    );
}

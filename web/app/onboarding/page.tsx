'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { usersApi, authApi } from '@/lib/api';
import { UserRole } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, CheckCircle2 } from 'lucide-react';

export default function OnboardingPage() {
    const router = useRouter();
    const { data: session, update: updateSession } = useSession();

    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        role: 'volunteer' as UserRole,
        phone: '',
        address: '',
    });

    useEffect(() => {
        if (session?.user?.role) {
            setFormData(prev => ({ ...prev, role: session.user.role }));
        }
    }, [session]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            if (!session?.user?.email) return;

            // 1. Get current user ID (sync to be sure)
            const user = await authApi.getMe(session.user.email) as any;

            // 2. Update user
            await usersApi.update(user.id, {
                role: formData.role,
                phone: formData.phone,
                address: formData.address,
            });

            // 3. Update session to reflect new role if changed
            await updateSession({
                ...session,
                user: { ...session.user, role: formData.role }
            });

            // 4. Redirect based on role
            const rolePaths: Record<string, string> = {
                donor: '/donor',
                volunteer: '/volunteer',
                charity: '/charity',
                admin: '/admin',
            };

            router.push(rolePaths[formData.role] || '/');

        } catch (error) {
            console.error('Onboarding failed:', error);
            alert('Failed to save profile. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
            <div className="bg-white max-w-md w-full rounded-2xl shadow-xl overflow-hidden">
                <div className="bg-emerald-600 p-8 text-center">
                    <div className="inline-flex items-center justify-center w-16 h-16 bg-white/20 rounded-full mb-4 text-white">
                        <CheckCircle2 size={32} />
                    </div>
                    <h1 className="text-2xl font-bold text-white">Welcome to OptiMeal!</h1>
                    <p className="text-emerald-100 mt-2">Let's set up your profile to get started.</p>
                </div>

                <form onSubmit={handleSubmit} className="p-8 space-y-6">
                    <div className="space-y-2">
                        <Label htmlFor="role">I want to join as a...</Label>
                        <select
                            id="role"
                            value={formData.role}
                            onChange={(e) => setFormData({ ...formData, role: e.target.value as UserRole })}
                            className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                        >
                            <option value="volunteer">Volunteer (I want to deliver food)</option>
                            <option value="donor">Donor (I have food to donate)</option>
                            <option value="charity">Charity (I need food)</option>
                        </select>
                        <p className="text-xs text-slate-500">
                            {formData.role === 'volunteer' && "Help rescue food and deliver it to those in need."}
                            {formData.role === 'donor' && "Post available food listings for pickup."}
                            {formData.role === 'charity' && "Receive food donations for your organization."}
                        </p>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="phone">Phone Number <span className="text-red-500">*</span></Label>
                        <Input
                            id="phone"
                            type="tel"
                            placeholder="+1 (555) 000-0000"
                            required
                            value={formData.phone}
                            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        />
                        <p className="text-xs text-slate-500">Required for coordination during pickups/deliveries.</p>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="address">Default Address <span className="text-red-500">*</span></Label>
                        <Input
                            id="address"
                            placeholder="123 Green St, City, State"
                            required
                            value={formData.address}
                            onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                        />
                        <p className="text-xs text-slate-500">Your primary location for finding nearby matches.</p>
                    </div>

                    <Button
                        type="submit"
                        className="w-full bg-emerald-600 hover:bg-emerald-700 text-lg py-6"
                        disabled={loading}
                    >
                        {loading ? (
                            <>
                                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                                Setting up...
                            </>
                        ) : (
                            'Complete Setup'
                        )}
                    </Button>
                </form>
            </div>
        </div>
    );
}

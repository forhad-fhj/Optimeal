'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { postData } from '@/lib/api';
import { useSession } from 'next-auth/react';

export default function DonorPage() {
    const { data: session } = useSession();
    const [formData, setFormData] = useState({
        title: '',
        quantity_kg: '',
        expires_at: '',
        pickup_window_start: '',
        pickup_window_end: '',
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            // Need user ID. In production, this comes from synced DB or session.
            // For now, assume sync stored it in localStorage or we fetch it.
            const userId = localStorage.getItem('optimeal_user_id');
            if (!userId) {
                alert("Please login first to sync your account.");
                return;
            }

            await postData('/api/listings/', {
                ...formData,
                quantity_kg: parseFloat(formData.quantity_kg),
                donor_id: userId // Use real ID
            });
            alert('Listing Created!');
        } catch (err) {
            alert('Failed to create listing');
        }
    };

    return (
        <div className="max-w-md mx-auto py-10">
            <h1 className="text-2xl font-bold mb-6">Create Food Listing</h1>
            <form onSubmit={handleSubmit} className="space-y-4">
                <Input
                    placeholder="Food Title (e.g. 20 Bagels)"
                    value={formData.title}
                    onChange={e => setFormData({ ...formData, title: e.target.value })}
                    required
                />
                <Input
                    type="number"
                    placeholder="Quantity (kg)"
                    value={formData.quantity_kg}
                    onChange={e => setFormData({ ...formData, quantity_kg: e.target.value })}
                    required
                />
                <div>
                    <label className="text-sm">Expires At</label>
                    <Input
                        type="datetime-local"
                        value={formData.expires_at}
                        onChange={e => setFormData({ ...formData, expires_at: e.target.value })}
                        required
                    />
                </div>
                <div>
                    <label className="text-sm">Pickup Start</label>
                    <Input
                        type="datetime-local"
                        value={formData.pickup_window_start}
                        onChange={e => setFormData({ ...formData, pickup_window_start: e.target.value })}
                        required
                    />
                </div>
                <div>
                    <label className="text-sm">Pickup End</label>
                    <Input
                        type="datetime-local"
                        value={formData.pickup_window_end}
                        onChange={e => setFormData({ ...formData, pickup_window_end: e.target.value })}
                        required
                    />
                </div>
                <Button type="submit" className="w-full">Post Listing</Button>
            </form>
        </div>
    );
}

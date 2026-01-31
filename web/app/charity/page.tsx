'use client';

import { useState, useEffect } from 'react';
import { fetcher, putData } from '@/lib/api';
import { Delivery } from '@/types';
import { Button } from '@/components/ui/button';

export default function CharityPage() {
    const [deliveries, setDeliveries] = useState<Delivery[]>([]);

    useEffect(() => {
        // Fetch deliveries for "me" (Need real ID)
        // const userId = localStorage.getItem('optimeal_user_id');
        // For demo, we might need to list all or mock
        // We implemented /api/deliveries/charity/{id}
        // Let's assume user is logged in as Charity
    }, []);

    const confirmDelivery = async (id: string) => {
        try {
            await putData(`/api/deliveries/${id}/confirm`);
            alert("Confirmed!");
            // refresh
        } catch (err) {
            alert("Error confirming");
        }
    };

    return (
        <div className="container py-10">
            <h1 className="text-2xl font-bold mb-6">Incoming Deliveries</h1>
            <div className="grid gap-4">
                {deliveries.length === 0 ? (
                    <p className="text-gray-500">No active deliveries.</p>
                ) : (
                    deliveries.map(d => (
                        <div key={d.id} className="p-4 border rounded flex justify-between">
                            <div>
                                <span className="font-bold">Delivery #{d.id.slice(0, 8)}</span>
                                <span className="ml-4 px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs">{d.status}</span>
                            </div>
                            <Button onClick={() => confirmDelivery(d.id)}>Confirm Receipt</Button>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}

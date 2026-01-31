'use client';

import dynamic from 'next/dynamic';
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { fetcher, postData } from '@/lib/api';
import { FoodListing, RoutePoint } from '@/types';

// Dynamic import for Map to avoid SSR issues
const Map = dynamic(() => import('@/components/Map'), { ssr: false });

export default function VolunteerPage() {
    const [position, setPosition] = useState<[number, number] | undefined>(undefined);
    const [listings, setListings] = useState<FoodListing[]>([]);
    const [selectedListings, setSelectedListings] = useState<string[]>([]);
    const [route, setRoute] = useState<RoutePoint[]>([]);

    useEffect(() => {
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                const { latitude, longitude } = pos.coords;
                setPosition([latitude, longitude]);
                fetchListings(latitude, longitude);
            },
            (err) => console.error(err)
        );
    }, []);

    const fetchListings = async (lat: number, lng: number) => {
        try {
            const data = await fetcher(`/api/listings/nearby?lat=${lat}&lng=${lng}&radius_meters=5000`);
            setListings(data);
        } catch (err) {
            console.error(err);
        }
    };

    const toggleListing = (id: string) => {
        setSelectedListings(prev =>
            prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
        );
    };

    const calculateRoute = async () => {
        if (!position || selectedListings.length === 0) return;
        try {
            // Need Charity ID (Mock for now or select)
            const demoCharityId = "00000000-0000-0000-0000-000000000000"; // Replace with real one or selector

            const data = await postData('/api/routes/calculate', {
                volunteer_lat: position[0],
                volunteer_lng: position[1],
                charity_id: demoCharityId, // TODO: Add Charity Selector
                listing_ids: selectedListings
            });
            setRoute(data.stops);
        } catch (err) {
            alert("Failed to calculate route");
        }
    };

    const claimDelivery = async () => {
        if (route.length === 0) return;
        try {
            const userId = localStorage.getItem('optimeal_user_id');
            if (!userId) { alert("Login required"); return; }

            await postData('/api/deliveries/claim', {
                volunteer_id: userId,
                charity_id: "00000000-0000-0000-0000-000000000000", // TODO
                listing_ids: selectedListings,
                optimized_route_data: route
            });
            alert("Delivery Claimed!");
        } catch (err) {
            alert("Failed to claim");
        }
    };

    return (
        <div className="h-[calc(100vh-64px)] flex flex-col">
            <div className="p-4 bg-white border-b flex justify-between items-center shadow-sm z-10">
                <div>
                    <h2 className="font-bold">Volunteer Dashboard</h2>
                    <p className="text-sm text-gray-500">{listings.length} listings nearby</p>
                </div>
                <div className="flex gap-2">
                    <Button onClick={calculateRoute} disabled={selectedListings.length === 0}>
                        Calculate Route ({selectedListings.length})
                    </Button>
                    <Button onClick={claimDelivery} disabled={route.length === 0} variant="default" className="bg-green-600 hover:bg-green-700">
                        Claim Delivery
                    </Button>
                </div>
            </div>
            <div className="flex-grow relative">
                <Map
                    volunteerLocation={position}
                    listings={listings}
                    route={route}
                    onSelectListing={toggleListing}
                    selectedListings={selectedListings}
                />
            </div>
        </div>
    );
}

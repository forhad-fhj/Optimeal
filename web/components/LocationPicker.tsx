'use client';

import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { useState, useEffect } from 'react';
import { MapPin, Search, Crosshair } from 'lucide-react';

const pinIcon = L.icon({
    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/markers-default/red.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41],
});

function ClickHandler({ onMapClick }: { onMapClick: (lat: number, lng: number) => void }) {
    useMapEvents({
        click(e) {
            onMapClick(e.latlng.lat, e.latlng.lng);
        },
    });
    return null;
}

function FlyToCenter({ center }: { center: [number, number] }) {
    const map = useMap();
    useEffect(() => {
        map.flyTo(center, 15, { duration: 1 });
    }, [center, map]);
    return null;
}

interface LocationPickerProps {
    address: string;
    lat?: number;
    lng?: number;
    onLocationChange: (data: { address: string; lat: number; lng: number }) => void;
}

export default function LocationPicker({ address, lat, lng, onLocationChange }: LocationPickerProps) {
    const [pinPosition, setPinPosition] = useState<[number, number] | null>(
        lat && lng ? [lat, lng] : null
    );
    const [flyTo, setFlyTo] = useState<[number, number] | null>(null);
    const [searchQuery, setSearchQuery] = useState(address || '');
    const [searching, setSearching] = useState(false);
    const [defaultCenter] = useState<[number, number]>([24.9, 91.87]); // Sylhet area

    // Reverse geocode: coords → address
    const reverseGeocode = async (lat: number, lng: number) => {
        try {
            const res = await fetch(
                `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&addressdetails=1`,
                { headers: { 'Accept-Language': 'en' } }
            );
            const data = await res.json();
            return data.display_name || `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
        } catch {
            return `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
        }
    };

    // Forward geocode: address → coords
    const forwardGeocode = async (query: string) => {
        setSearching(true);
        try {
            const res = await fetch(
                `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1`,
                { headers: { 'Accept-Language': 'en' } }
            );
            const data = await res.json();
            if (data.length > 0) {
                const { lat, lon, display_name } = data[0];
                const newLat = parseFloat(lat);
                const newLng = parseFloat(lon);
                setPinPosition([newLat, newLng]);
                setFlyTo([newLat, newLng]);
                setSearchQuery(display_name);
                onLocationChange({ address: display_name, lat: newLat, lng: newLng });
            }
        } catch (err) {
            console.error('Geocoding failed:', err);
        } finally {
            setSearching(false);
        }
    };

    const handleMapClick = async (lat: number, lng: number) => {
        setPinPosition([lat, lng]);
        const addr = await reverseGeocode(lat, lng);
        setSearchQuery(addr);
        onLocationChange({ address: addr, lat, lng });
    };

    const handleSearchSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (searchQuery.trim()) {
            forwardGeocode(searchQuery.trim());
        }
    };

    const handleUseMyLocation = () => {
        navigator.geolocation.getCurrentPosition(
            async (pos) => {
                const { latitude, longitude } = pos.coords;
                setPinPosition([latitude, longitude]);
                setFlyTo([latitude, longitude]);
                const addr = await reverseGeocode(latitude, longitude);
                setSearchQuery(addr);
                onLocationChange({ address: addr, lat: latitude, lng: longitude });
            },
            () => {
                // Silently fail if denied
            }
        );
    };

    return (
        <div className="space-y-3">
            {/* Search bar */}
            <form onSubmit={handleSearchSubmit} className="flex gap-2">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-2.5 text-slate-400" size={16} />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search address or click on map..."
                        className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                    />
                </div>
                <button
                    type="submit"
                    disabled={searching}
                    className="px-3 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 transition-colors disabled:opacity-50"
                >
                    {searching ? '...' : 'Find'}
                </button>
                <button
                    type="button"
                    onClick={handleUseMyLocation}
                    className="p-2 border border-slate-200 rounded-lg text-slate-500 hover:bg-slate-50 hover:text-emerald-600 transition-colors"
                    title="Use my location"
                >
                    <Crosshair size={18} />
                </button>
            </form>

            {/* Map */}
            <div className="h-[220px] rounded-xl overflow-hidden border border-slate-200 shadow-sm">
                <MapContainer
                    center={pinPosition || defaultCenter}
                    zoom={pinPosition ? 15 : 12}
                    style={{ height: '100%', width: '100%' }}
                    className="z-0"
                >
                    <TileLayer
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                    />
                    <ClickHandler onMapClick={handleMapClick} />
                    {flyTo && <FlyToCenter center={flyTo} />}
                    {pinPosition && <Marker position={pinPosition} icon={pinIcon} />}
                </MapContainer>
            </div>

            {/* Coordinates display */}
            {pinPosition && (
                <div className="flex items-center gap-2 text-xs text-slate-500">
                    <MapPin size={12} className="text-emerald-500" />
                    <span>{pinPosition[0].toFixed(5)}, {pinPosition[1].toFixed(5)}</span>
                </div>
            )}
        </div>
    );
}

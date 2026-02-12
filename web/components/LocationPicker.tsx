'use client';

import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { useState, useEffect, useRef } from 'react';
import { MapPin, Search, Crosshair, Navigation } from 'lucide-react';

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
        if (center) {
            map.flyTo(center, 16, { duration: 1.5, easeLinearity: 0.25 });
        }
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
    const [autoDetecting, setAutoDetecting] = useState(false);

    // Default to a central location (e.g. New York) if no location
    const [defaultCenter] = useState<[number, number]>([40.7128, -74.0060]);

    // Auto-detect on mount if no position set
    useEffect(() => {
        if (!lat && !lng) {
            handleUseMyLocation();
        }
    }, []);

    // Reverse geocode: coords → address
    const reverseGeocode = async (lat: number, lng: number) => {
        try {
            const res = await fetch(
                `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&addressdetails=1`,
                { headers: { 'Accept-Language': 'en' } }
            );
            const data = await res.json();
            // Prefer: Road, City, Country or Display Name
            const addr = data.display_name;
            return addr || `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
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
        // Don't fly on click, let user pan freely
        setSearchQuery('Fetching address...');
        const addr = await reverseGeocode(lat, lng);
        setSearchQuery(addr);
        onLocationChange({ address: addr, lat, lng });
    };

    const handleUseMyLocation = () => {
        setAutoDetecting(true);
        if (!navigator.geolocation) {
            alert('Geolocation is not supported by your browser');
            setAutoDetecting(false);
            return;
        }

        navigator.geolocation.getCurrentPosition(
            async (pos) => {
                const { latitude, longitude } = pos.coords;
                setPinPosition([latitude, longitude]);
                setFlyTo([latitude, longitude]);
                setSearchQuery('Locating...');
                const addr = await reverseGeocode(latitude, longitude);
                setSearchQuery(addr);
                onLocationChange({ address: addr, lat: latitude, lng: longitude });
                setAutoDetecting(false);
            },
            (err) => {
                console.warn('Geolocation denied:', err);
                setAutoDetecting(false);
            },
            { enableHighAccuracy: true, timeout: 5000 }
        );
    };

    return (
        <div className="space-y-3">
            {/* Search & Actions Bar */}
            <div className="flex gap-2">
                <div className="relative flex-1 group">
                    <Search className="absolute left-3 top-2.5 text-slate-400 group-focus-within:text-emerald-500 transition-colors" size={16} />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                                e.preventDefault();
                                if (searchQuery.trim()) forwardGeocode(searchQuery.trim());
                            }
                        }}
                        placeholder="Search address or click on map..."
                        className="w-full pl-10 pr-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all shadow-sm"
                    />
                </div>
                <button
                    type="button"
                    onClick={() => { if (searchQuery.trim()) forwardGeocode(searchQuery.trim()); }}
                    disabled={searching}
                    className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 transition-all shadow-sm hover:shadow active:scale-95 disabled:opacity-50 disabled:pointer-events-none"
                    title="Find Address"
                >
                    {searching ? <div className="animate-spin rounded-full h-4 w-4 border-2 border-white/30 border-t-white" /> : 'Find'}
                </button>
                <button
                    type="button"
                    onClick={handleUseMyLocation}
                    disabled={autoDetecting}
                    className="px-3 py-2 border border-slate-200 bg-white text-slate-700 rounded-lg hover:bg-slate-50 hover:border-emerald-200 hover:text-emerald-600 transition-all shadow-sm active:scale-95 disabled:opacity-50"
                    title="Use Current Location"
                >
                    {autoDetecting ? (
                        <div className="animate-spin rounded-full h-4 w-4 border-2 border-emerald-600/30 border-t-emerald-600" />
                    ) : (
                        <Navigation size={18} className={autoDetecting ? 'animate-pulse' : ''} />
                    )}
                </button>
            </div>

            {/* Map Container */}
            <div className="h-[250px] rounded-xl overflow-hidden border border-slate-200 shadow-sm relative group">
                <MapContainer
                    center={pinPosition || defaultCenter}
                    zoom={pinPosition ? 15 : 4}
                    style={{ height: '100%', width: '100%' }}
                    className="z-0"
                >
                    <TileLayer
                        url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
                    />
                    <ClickHandler onMapClick={handleMapClick} />
                    {flyTo && <FlyToCenter center={flyTo} />}
                    {pinPosition && <Marker position={pinPosition} icon={pinIcon} />}
                </MapContainer>

                {/* Coordinates Overlay */}
                {pinPosition && (
                    <div className="absolute bottom-2 left-2 bg-white/90 backdrop-blur px-2 py-1 rounded-md text-[10px] font-mono text-slate-500 border border-slate-100 shadow-sm z-[400] flex items-center gap-1">
                        <MapPin size={10} className="text-emerald-600" />
                        {pinPosition[0].toFixed(5)}, {pinPosition[1].toFixed(5)}
                    </div>
                )}

                {!pinPosition && !address && (
                    <div className="absolute inset-0 flex items-center justify-center bg-slate-50/50 pointer-events-none z-[400]">
                        <p className="text-sm text-slate-700 bg-white/90 px-4 py-2 rounded-full shadow-sm backdrop-blur border border-slate-200">
                            📍 Click anywhere to set location
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}

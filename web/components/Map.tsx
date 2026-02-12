'use client';

import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { useEffect } from 'react';

// Fix icons
const iconUrl = 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png';
const iconRetinaUrl = 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png';
const shadowUrl = 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png';

const defaultIcon = L.icon({
  iconUrl,
  iconRetinaUrl,
  shadowUrl,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  tooltipAnchor: [16, -28],
  shadowSize: [41, 41],
});

// Custom Icons
const volunteerIcon = L.divIcon({
  className: 'pulse-marker',
  html: '<div class="ring"></div><div class="dot"></div>',
  iconSize: [20, 20],
  iconAnchor: [10, 10],
});

const foodIcon = L.icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/markers-default/green.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

const dropoffIcon = L.icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/markers-default/red.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

const selectedFoodIcon = L.icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/markers-default/orange.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

// Smart View Controller
function ChangeView({ center, zoom }: { center: [number, number], zoom: number }) {
  const map = useMap();
  useEffect(() => {
    map.flyTo(center, zoom, {
      duration: 1.5,
      easeLinearity: 0.25
    });
  }, [center, zoom, map]);
  return null;
}

// Auto-fit bounds for route
function RouteFitter({ route }: { route: any[] }) {
  const map = useMap();
  useEffect(() => {
    if (route.length > 0) {
      const bounds = L.latLngBounds(route.map(p => [p.lat, p.lng]));
      map.flyToBounds(bounds, { padding: [50, 50], duration: 1.5 });
    }
  }, [route, map]);
  return null;
}

interface MapProps {
  volunteerLocation?: [number, number];
  listings?: any[];
  route?: any[];
  onSelectListing?: (id: string) => void;
  selectedListings?: string[];
  routeInfo?: { distance: number; duration: number } | null;
}

export default function Map({ volunteerLocation, listings = [], route = [], onSelectListing, selectedListings = [], routeInfo }: MapProps) {

  return (
    <MapContainer center={volunteerLocation || [40.7128, -74.0060]} zoom={13} style={{ height: '100%', width: '100%' }}>
      {/* ... TileLayer ... */}
      <TileLayer
        url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
      />

      {routeInfo && (
        <div className="leaflet-bottom leaflet-right" style={{ marginBottom: '80px', marginRight: '10px', pointerEvents: 'none' }}>
          <div className="leaflet-control bg-white/90 backdrop-blur-md p-4 rounded-2xl shadow-xl border border-white/50 flex items-center gap-4 animate-in slide-in-from-bottom-4">
            <div className="text-center">
              <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Distance</p>
              <p className="text-xl font-bold text-emerald-600">{routeInfo.distance.toFixed(1)} <span className="text-xs text-slate-400">km</span></p>
            </div>
            <div className="w-px h-8 bg-slate-200"></div>
            <div className="text-center">
              <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Est. Time</p>
              <p className="text-xl font-bold text-slate-700">{Math.ceil(routeInfo.duration)} <span className="text-xs text-slate-400">min</span></p>
            </div>
          </div>
        </div>
      )}


      {volunteerLocation && (
        <>
          <Marker position={volunteerLocation} icon={volunteerIcon}>
            <Popup>You (Volunteer)</Popup>
          </Marker>
          {route.length === 0 && <ChangeView center={volunteerLocation} zoom={14} />}
        </>
      )}

      {/* Render Route Markers */}
      {route.map((point, index) => {
        if (!point.lat || !point.lng) return null;
        let icon = defaultIcon;
        let title = 'Waypoint';

        if (point.type === 'pickup') {
          icon = foodIcon;
          title = 'Pickup: ' + (point.name || 'Location');
        } else if (point.type === 'dropoff') {
          icon = dropoffIcon;
          title = 'Dropoff: ' + (point.name || 'Charity');
        } else if (point.type === 'start') return null;

        return (
          <Marker key={`route-${index}`} position={[point.lat, point.lng]} icon={icon}>
            <Popup>{title}</Popup>
          </Marker>
        );
      })}

      {listings.filter(l => l.location_lat && l.location_lng).map((listing) => (
        <Marker
          key={listing.id}
          position={[listing.location_lat, listing.location_lng]}
          icon={selectedListings.includes(listing.id) ? selectedFoodIcon : foodIcon}
          eventHandlers={{
            click: () => onSelectListing && onSelectListing(listing.id),
          }}
          opacity={selectedListings.includes(listing.id) ? 1 : 0.8}
        >
          <Tooltip listing={listing} />
        </Marker>
      ))}

      {route.length > 0 && (
        <>
          <Polyline
            positions={route.map((p: any) => [p.lat, p.lng])}
            color="#10b981"
            weight={5}
            opacity={0.8}
            dashArray="10, 10"
            className="animate-dash"
          />
          <RouteFitter route={route} />
        </>
      )}
    </MapContainer>
  );
}

function Tooltip({ listing }: { listing: any }) {
  return (
    <Popup>
      <div className="p-1">
        <strong className="text-emerald-700">{listing.title}</strong><br />
        <span className="text-xs text-slate-500">{listing.quantity_kg} kg • {listing.food_category}</span>
        <br />
        <span className="text-xs font-medium">{listing.address}</span>
      </div>
    </Popup>
  )
}

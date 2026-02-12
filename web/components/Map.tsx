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

const volunteerIcon = L.icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/markers-default/blue.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
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

// Update view component
function ChangeView({ center, zoom }: { center: [number, number], zoom: number }) {
  const map = useMap();
  map.setView(center, zoom);
  return null;
}

interface MapProps {
  volunteerLocation?: [number, number];
  listings?: any[];
  route?: any[];
  onSelectListing?: (id: string) => void;
  selectedListings?: string[];
}

export default function Map({ volunteerLocation, listings = [], route = [], onSelectListing, selectedListings = [] }: MapProps) {

  return (
    <MapContainer center={volunteerLocation || [40.7128, -74.0060]} zoom={13} style={{ height: '100%', width: '100%' }}>
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      />

      {volunteerLocation && (
        <>
          <Marker position={volunteerLocation} icon={volunteerIcon}>
            <Popup>You (Volunteer)</Popup>
          </Marker>
          <ChangeView center={volunteerLocation} zoom={13} />
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
        } else if (point.type === 'start') {
          return null; // Already rendered volunteer location
        }

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
          opacity={selectedListings.includes(listing.id) ? 1 : 0.7}
        >
          <Popup>
            <strong>{listing.title}</strong><br />
            {listing.quantity_kg} kg<br />
            {listing.address || 'Pickup location'}
          </Popup>
        </Marker>
      ))}

      {route.length > 0 && (
        <Polyline
          positions={route.map((p: any) => [p.lat, p.lng])}
          color="#10b981"
          weight={4}
          opacity={0.8}
          dashArray="10, 10"
        />
      )}
    </MapContainer>
  );
}

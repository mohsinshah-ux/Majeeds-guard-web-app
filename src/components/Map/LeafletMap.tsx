import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useMemo, type ReactNode } from 'react';

type LatLng = { lat: number; lng: number };

export type LeafletMarker = {
  position: LatLng;
  popup?: ReactNode;
};

export function LeafletMap({
  center,
  zoom = 14,
  markers = [],
  className,
}: {
  center: LatLng;
  zoom?: number;
  markers?: LeafletMarker[];
  className?: string;
}) {
  // Vite/webpack bundling fix for default marker icons
  const icon = useMemo(() => {
    return new L.Icon({
      iconUrl: new URL('leaflet/dist/images/marker-icon.png', import.meta.url).toString(),
      iconRetinaUrl: new URL('leaflet/dist/images/marker-icon-2x.png', import.meta.url).toString(),
      shadowUrl: new URL('leaflet/dist/images/marker-shadow.png', import.meta.url).toString(),
      iconSize: [25, 41],
      iconAnchor: [12, 41],
      popupAnchor: [1, -34],
      shadowSize: [41, 41],
    });
  }, []);

  const containerClass = className ? `${className} relative z-0` : 'relative z-0';

  return (
    <div className={containerClass}>
      <MapContainer
        center={[center.lat, center.lng]}
        zoom={zoom}
        scrollWheelZoom={false}
        className="h-full w-full z-0"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {markers.map((m, idx) => (
          <Marker key={idx} position={[m.position.lat, m.position.lng]} icon={icon}>
            {m.popup ? <Popup>{m.popup}</Popup> : null}
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}


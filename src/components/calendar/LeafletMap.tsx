import * as React from "react";
import { MapContainer, Marker, TileLayer, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";

const icon = L.icon({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIcon2x,
  shadowUrl: markerShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  shadowSize: [41, 41],
});

interface Props {
  latitude: number;
  longitude: number;
  /** Permite arrastrar el pin para ajustar la ubicación. */
  draggable?: boolean;
  onMove?: (lat: number, lng: number) => void;
  className?: string;
  zoom?: number;
}

function Recenter({ lat, lng, zoom }: { lat: number; lng: number; zoom: number }) {
  const map = useMap();
  React.useEffect(() => {
    map.setView([lat, lng], zoom);
  }, [lat, lng, zoom, map]);
  return null;
}

/** Mapa de OpenStreetMap con un pin. Solo se renderiza en el navegador. */
export default function LeafletMap({
  latitude,
  longitude,
  draggable = false,
  onMove,
  className,
  zoom = 15,
}: Props) {
  return (
    <MapContainer
      center={[latitude, longitude]}
      zoom={zoom}
      scrollWheelZoom={false}
      className={className ?? "h-40 w-full rounded-xl"}
      style={{ background: "hsl(0 0% 8%)" }}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <Recenter lat={latitude} lng={longitude} zoom={zoom} />
      <Marker
        position={[latitude, longitude]}
        icon={icon}
        draggable={draggable}
        eventHandlers={
          draggable
            ? {
                dragend: (e: any) => {
                  const p = e.target.getLatLng();
                  onMove?.(p.lat, p.lng);
                },
              }
            : undefined
        }
      />
    </MapContainer>
  );
}

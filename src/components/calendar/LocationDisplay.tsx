import * as React from "react";
import { MapPin, Navigation, Video } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LocationMap } from "./LocationMap";
import { useLocations } from "@/hooks/useLocations";

interface Props {
  clubId: string | null | undefined;
  /** Ubicación guardada del catálogo (con coordenadas). */
  locationId?: string | null;
  /** Texto libre, cuando no hay ubicación guardada. */
  text?: string | null;
  /** Muestra el mapa (si hay coordenadas). */
  showMap?: boolean;
}

function isUrl(v: string) {
  return /^https?:\/\//i.test(v.trim());
}

/** Ficha de ubicación: nombre, dirección, mini-mapa y "Cómo llegar". */
export function LocationDisplay({ clubId, locationId, text, showMap = true }: Props) {
  const locationsQ = useLocations(clubId);
  const loc = locationId ? (locationsQ.data ?? []).find((l) => l.id === locationId) : undefined;

  if (!loc) {
    const value = (text ?? "").trim();
    if (!value) return null;
    if (isUrl(value)) {
      return (
        <a
          href={value}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1.5 text-primary underline underline-offset-2"
        >
          <Video className="h-4 w-4" />
          <span className="break-all">{value}</span>
        </a>
      );
    }
    return <span className="text-foreground">{value}</span>;
  }

  const hasCoords = loc.latitude != null && loc.longitude != null;

  return (
    <div className="space-y-2">
      <div className="flex items-start gap-2">
        <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
        <div className="min-w-0">
          <p className="font-medium text-foreground">{loc.name}</p>
          {loc.address ? <p className="text-xs text-muted-foreground">{loc.address}</p> : null}
        </div>
      </div>

      {hasCoords && showMap ? (
        <>
          <LocationMap latitude={loc.latitude!} longitude={loc.longitude!} className="h-40 w-full rounded-xl" />
          <Button asChild type="button" size="sm" variant="secondary" className="w-full">
            <a
              href={`https://www.google.com/maps/search/?api=1&query=${loc.latitude},${loc.longitude}`}
              target="_blank"
              rel="noreferrer"
            >
              <Navigation className="mr-2 h-4 w-4" /> Cómo llegar
            </a>
          </Button>
        </>
      ) : null}
    </div>
  );
}

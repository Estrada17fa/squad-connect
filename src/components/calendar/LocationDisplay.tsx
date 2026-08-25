import * as React from "react";
import { ChevronDown, ChevronUp, Map as MapIcon, MapPin, Navigation, Video } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LocationMap } from "./LocationMap";
import { useLocation } from "@/hooks/useLocations";

interface Props {
  clubId: string | null | undefined;
  /** Ubicación guardada del catálogo (con coordenadas). */
  locationId?: string | null;
  /** Texto libre, cuando no hay ubicación guardada. */
  text?: string | null;
  /** Permite mostrar el mapa (si hay coordenadas). */
  showMap?: boolean;
  /** Abre el mapa desplegado desde el inicio. */
  defaultOpen?: boolean;
}

function isUrl(v: string) {
  return /^https?:\/\//i.test(v.trim());
}

export function googleMapsUrl(lat: number, lng: number) {
  return `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
}

/** Ficha de ubicación: nombre, dirección, "Ver en mapa" y "Abrir en Google Maps". */
export function LocationDisplay({ clubId, locationId, text, showMap = true, defaultOpen = false }: Props) {
  void clubId;
  const locQ = useLocation(locationId ?? null);
  const loc = locQ.data ?? undefined;
  const [openMap, setOpenMap] = React.useState(defaultOpen);

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
    return <span className="text-foreground [overflow-wrap:anywhere]">{value}</span>;
  }

  const hasCoords = loc.latitude != null && loc.longitude != null;

  return (
    <div className="space-y-2">
      {hasCoords ? (
        <a
          href={googleMapsUrl(loc.latitude!, loc.longitude!)}
          target="_blank"
          rel="noreferrer"
          className="flex items-start gap-2 rounded-lg transition-colors hover:bg-muted/50"
        >
          <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
          <div className="min-w-0">
            <p className="font-medium text-primary underline underline-offset-2 [overflow-wrap:anywhere]">
              {loc.name}
            </p>
            {loc.address ? (
              <p className="text-xs text-muted-foreground [overflow-wrap:anywhere]">{loc.address}</p>
            ) : null}
          </div>
          <Navigation className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
        </a>
      ) : (
        <div className="flex items-start gap-2">
          <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
          <div className="min-w-0">
            <p className="font-medium text-foreground [overflow-wrap:anywhere]">{loc.name}</p>
            {loc.address ? (
              <p className="text-xs text-muted-foreground [overflow-wrap:anywhere]">{loc.address}</p>
            ) : null}
          </div>
        </div>
      )}


      {!hasCoords ? (
        <p className="text-xs text-muted-foreground">
          Esta ubicación no tiene punto en el mapa. Un editor puede corregirla en Configuración del club.
        </p>
      ) : (
        <>
          {showMap ? (
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button
                type="button"
                size="sm"
                variant="secondary"
                className="flex-1"
                onClick={() => setOpenMap((v) => !v)}
              >
                <MapIcon className="mr-2 h-4 w-4" />
                {openMap ? "Ocultar mapa" : "Ver en mapa"}
                {openMap ? <ChevronUp className="ml-1 h-3.5 w-3.5" /> : <ChevronDown className="ml-1 h-3.5 w-3.5" />}
              </Button>
              <Button asChild type="button" size="sm" variant="secondary" className="flex-1">
                <a href={googleMapsUrl(loc.latitude!, loc.longitude!)} target="_blank" rel="noreferrer">
                  <Navigation className="mr-2 h-4 w-4" /> Abrir en Google Maps
                </a>
              </Button>
            </div>
          ) : null}
          {showMap && openMap ? (
            <LocationMap
              latitude={loc.latitude!}
              longitude={loc.longitude!}
              className="h-40 w-full overflow-hidden rounded-xl"
            />
          ) : null}
        </>
      )}
    </div>
  );
}

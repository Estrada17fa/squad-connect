import { MapPin, Navigation } from "lucide-react";
import { LocationMap } from "@/components/calendar/LocationMap";
import { useLocation, type LocationRow } from "@/hooks/useLocations";
import { mapsLinks } from "@/lib/juntas";
import { cn } from "@/lib/utils";

/** Tarjeta de lugar: nombre, dirección, mapa pequeño y botones Google Maps / Waze. */
export function LocationCard({ locationId, row, className }: { locationId?: string | null; row?: LocationRow | null; className?: string }) {
  const q = useLocation(row ? null : locationId);
  const loc = row ?? q.data ?? null;
  if (!loc) return null;
  const links = mapsLinks(loc);
  const coords = loc.latitude != null && loc.longitude != null;
  return (
    <div className={cn("overflow-hidden rounded-[14px] bg-card", className)}>
      <div className="flex items-start gap-2 px-3 py-2.5">
        <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-area-general" />
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">{loc.name}</p>
          {loc.address ? <p className="text-xs text-muted-foreground">{loc.address}</p> : null}
        </div>
      </div>
      {coords ? <LocationMap latitude={loc.latitude!} longitude={loc.longitude!} className="h-32 w-full" /> : null}
      <div className="grid grid-cols-2 gap-2 p-2">
        <a href={links.google} target="_blank" rel="noreferrer" className="coord-press flex min-h-10 items-center justify-center gap-1.5 rounded-xl bg-muted text-xs font-semibold">
          <MapPin className="h-3.5 w-3.5" /> Google Maps
        </a>
        <a href={links.waze} target="_blank" rel="noreferrer" className="coord-press flex min-h-10 items-center justify-center gap-1.5 rounded-xl bg-muted text-xs font-semibold">
          <Navigation className="h-3.5 w-3.5" /> Waze
        </a>
      </div>
    </div>
  );
}

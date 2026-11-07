import * as React from "react";
import { Drawer as D } from "vaul";
import { MapPin, Navigation, Pencil } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { LocationMap } from "@/components/calendar/LocationMap";
import { useLocation } from "@/hooks/useLocations";
import { mapsLinks } from "@/lib/juntas";
import { cn } from "@/lib/utils";

/** Hoja de detalle: agarradera, altura según contenido (máx. 90%), se cierra deslizando o tocando fuera. */
export function EventSheet({ open, onOpenChange, title, onEdit, actions, children }: {
  open: boolean; onOpenChange: (v: boolean) => void; title: string; onEdit?: (() => void) | null; actions?: React.ReactNode; children: React.ReactNode;
}) {
  return (
    <D.Root open={open} onOpenChange={onOpenChange}>
      <D.Portal>
        <D.Overlay className="fixed inset-0 z-50 bg-background/70 backdrop-blur-[2px]" />
        <D.Content aria-describedby={undefined} className="fixed inset-x-0 bottom-0 z-50 mx-auto flex max-h-[90dvh] max-w-lg flex-col rounded-t-[20px] bg-background outline-none">
          <D.Title className="sr-only">{title}</D.Title>
          <div className="relative flex shrink-0 justify-center pb-1 pt-2.5">
            <span className="h-1.5 w-10 rounded-full bg-muted-foreground/30" />
            {onEdit ? (
              <button type="button" aria-label="Editar" onClick={onEdit} className="absolute right-3 top-2 flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground hover:bg-muted">
                <Pencil className="h-4 w-4" />
              </button>
            ) : null}
          </div>
          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 pb-4 pt-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">{children}</div>
          {actions ? <div className="flex shrink-0 gap-2 border-t border-border/40 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3">{actions}</div> : null}
        </D.Content>
      </D.Portal>
    </D.Root>
  );
}

export function SheetRows({ children }: { children: React.ReactNode }) {
  return <div className="divide-y divide-border/40 overflow-hidden rounded-[16px] bg-card">{children}</div>;
}

export function SheetRow({ icon: Icon, main, sub, children }: { icon: typeof MapPin; main: React.ReactNode; sub?: React.ReactNode; children?: React.ReactNode }) {
  return (
    <div className="flex gap-3 px-3.5 py-3">
      <Icon className="mt-0.5 h-[18px] w-[18px] shrink-0 text-muted-foreground" />
      <div className="min-w-0 flex-1">
        <div className="whitespace-pre-line text-sm font-medium">{main}</div>
        {sub ? <div className="mt-0.5 text-xs text-muted-foreground">{sub}</div> : null}
        {children}
      </div>
    </div>
  );
}

export function PersonalBlock({ label, main, sub, status, muted }: { label: string; main?: React.ReactNode; sub?: React.ReactNode; status?: React.ReactNode; muted?: boolean }) {
  return (
    <div className={`flex items-center justify-between gap-3 rounded-[16px] ${muted ? "bg-muted" : "bg-primary/10"} px-4 py-3`}>
      <div className="min-w-0">
        <p className={`text-[11px] font-semibold uppercase tracking-[0.1em] ${muted ? "text-muted-foreground" : "text-primary"}`}>{label}</p>
        {main ? <p className="mt-0.5 text-sm font-semibold">{main}</p> : null}
        {sub ? <p className="text-xs text-muted-foreground">{sub}</p> : null}
      </div>
      {status ? <span className={`shrink-0 text-sm font-semibold ${muted ? "text-muted-foreground" : "text-primary"}`}>{status}</span> : null}
    </div>
  );
}

const btn = "flex h-12 flex-1 items-center justify-center gap-2 rounded-2xl text-sm font-semibold active:opacity-80 disabled:opacity-50";
export const primaryBtn = cn(btn, "bg-primary text-primary-foreground");
export const secondaryBtn = cn(btn, "bg-muted text-foreground");

/** Lugar: catálogo (nombre, dirección y mapa) o texto libre. */
export function useSheetPlace(locationId: string | null | undefined, text: string | null | undefined) {
  const q = useLocation(locationId);
  const loc = q.data ?? null;
  const name = loc?.name ?? text ?? null;
  if (!name) return null;
  const links = loc ? mapsLinks(loc) : { google: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(name)}`, waze: null as string | null };
  const coords = loc && loc.latitude != null && loc.longitude != null ? { lat: loc.latitude, lng: loc.longitude } : null;
  return { name, address: loc?.address ?? null, links, coords };
}
export type SheetPlace = NonNullable<ReturnType<typeof useSheetPlace>>;

export function PlaceRow({ place, sub }: { place: SheetPlace; sub?: string | null }) {
  return (
    <SheetRow icon={MapPin} main={place.name} sub={sub ?? place.address}>
      {place.coords ? <LocationMap latitude={place.coords.lat} longitude={place.coords.lng} className="mt-2 h-28 w-full overflow-hidden rounded-xl" /> : null}
    </SheetRow>
  );
}

export function DirectionsButton({ place, primary = true }: { place: SheetPlace; primary?: boolean }) {
  const cls = primary ? primaryBtn : secondaryBtn;
  if (!place.coords || !place.links.waze) {
    return <a href={place.links.google} target="_blank" rel="noreferrer" className={cls}><Navigation className="h-4 w-4" /> Cómo llegar</a>;
  }
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button type="button" className={cls}><Navigation className="h-4 w-4" /> Cómo llegar</button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="center" side="top" className="w-48">
        <DropdownMenuItem asChild><a href={place.links.google} target="_blank" rel="noreferrer">Google Maps</a></DropdownMenuItem>
        <DropdownMenuItem asChild><a href={place.links.waze} target="_blank" rel="noreferrer">Waze</a></DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

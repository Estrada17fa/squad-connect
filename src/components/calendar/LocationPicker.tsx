import * as React from "react";
import { toast } from "sonner";
import { Bookmark, Loader2, MapPin, Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  useLocation,
  useLocations,
  usePromoteLocation,
  useResolveLocation,
  useSaveLocation,
  type LocationRow,
} from "@/hooks/useLocations";

import { useGeocodeSearch, type GeocodeResult } from "@/hooks/useGeocodeSearch";
import { LocationMap } from "./LocationMap";

interface Props {
  clubId: string;
  userId: string;
  /** Texto libre de la ubicación (nombre del lugar elegido o texto escrito). */
  value: string;
  onChange: (v: string) => void;
  /** Ubicación guardada del catálogo (null cuando es texto libre). */
  locationId: string | null;
  onLocationIdChange: (id: string | null) => void;
  canManage?: boolean;
  label?: string;
  placeholder?: string;
  id?: string;
}

/**
 * Ubicación reutilizable: busca lugares reales (OpenStreetMap/Nominatim),
 * elige del catálogo del club o escribe texto libre.
 */
export function LocationPicker({
  clubId,
  userId,
  value,
  onChange,
  locationId,
  onLocationIdChange,
  canManage = true,
  label = "Ubicación",
  placeholder = "Busca un lugar, dirección o escribe libremente…",
  id = "loc-field",
}: Props) {
  const locationsQ = useLocations(clubId);
  const save = useSaveLocation();
  const resolve = useResolveLocation();
  const promote = usePromoteLocation();
  const [managerOpen, setManagerOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const [open, setOpen] = React.useState(false);

  const geo = useGeocodeSearch(query, open);
  const locations = locationsQ.data ?? [];
  const selectedQ = useLocation(locationId);
  const selected = selectedQ.data ?? undefined;
  /** La ubicación existe con coordenadas pero aún no está en el catálogo visible. */
  const isDraft = !!selected && selected.is_catalog === false;

  const savedMatches = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return locations.slice(0, 5);
    return locations.filter((l) => `${l.name} ${l.address ?? ""}`.toLowerCase().includes(q)).slice(0, 5);
  }, [locations, query]);

  function pickSaved(loc: LocationRow) {
    onLocationIdChange(loc.id);
    onChange(loc.name);
    setQuery("");
    setOpen(false);
  }

  /** Persiste el lugar del mapa (fuera del catálogo) y lo liga de inmediato. */
  async function pickPlace(r: GeocodeResult) {
    setQuery("");
    setOpen(false);
    onChange(r.name);
    try {
      const row = await resolve.mutateAsync({
        club_id: clubId,
        name: r.name,
        address: r.address,
        latitude: r.latitude,
        longitude: r.longitude,
        place_id: r.placeId,
        created_by: userId,
      });
      onLocationIdChange(row.id);
      onChange(row.name);
    } catch (e: any) {
      onLocationIdChange(null);
      toast.error(e.message ?? "No se pudo usar esa ubicación");
    }
  }

  function clear() {
    onLocationIdChange(null);
    onChange("");
  }

  /** Ajuste manual del pin sobre la ubicación ya persistida. */
  async function movePin(lat: number, lng: number) {
    if (!selected) return;
    try {
      await save.mutateAsync({
        id: selected.id,
        club_id: clubId,
        name: selected.name,
        address: selected.address,
        notes: selected.notes,
        latitude: lat,
        longitude: lng,
        place_id: selected.place_id,
        source: selected.source ?? "osm",
        is_catalog: selected.is_catalog,
      });
    } catch (e: any) {
      toast.error(e.message ?? "No se pudo ajustar la ubicación");
    }
  }

  async function saveToCatalog() {
    try {
      if (selected) {
        await promote.mutateAsync(selected.id);
      } else {
        const created = await save.mutateAsync({
          club_id: clubId,
          name: value,
          source: "manual",
          created_by: userId,
        });
        onLocationIdChange(created.id);
        onChange(created.name);
      }
      toast.success("Ubicación guardada en el catálogo");
    } catch (e: any) {
      toast.error(e.message ?? "No se pudo guardar la ubicación");
    }
  }

  const coords =
    selected?.latitude != null && selected?.longitude != null
      ? { lat: selected.latitude, lng: selected.longitude }
      : null;


  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>


      {value && (selected || resolve.isPending) ? (
        <div className="glass flex items-start gap-2 p-3">
          <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-foreground">{value}</p>
            <p className="truncate text-xs text-muted-foreground">{selected?.address ?? ""}</p>
          </div>

          <button type="button" onClick={clear} className="p-1 text-muted-foreground" aria-label="Quitar ubicación">
            <X className="h-4 w-4" />
          </button>
        </div>
      ) : (
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            id={id}
            value={query || value}
            onChange={(e) => {
              setQuery(e.target.value);
              onChange(e.target.value);
              onLocationIdChange(null);
              setOpen(true);
            }}
            onFocus={() => setOpen(true)}
            placeholder={placeholder}
            className="pl-9"
            autoComplete="off"
          />
          {open && (savedMatches.length > 0 || query.trim().length >= 3) ? (
            <div className="absolute z-50 mt-1 max-h-72 w-full overflow-y-auto rounded-xl border border-border bg-popover p-1 shadow-xl">
              {savedMatches.length ? (
                <p className="px-2 py-1 text-[11px] uppercase tracking-wide text-muted-foreground">Guardadas</p>
              ) : null}
              {savedMatches.map((l) => (
                <button
                  key={l.id}
                  type="button"
                  onClick={() => pickSaved(l)}
                  className="flex w-full items-start gap-2 rounded-md px-2 py-2 text-left hover:bg-white/[0.06]"
                >
                  <Bookmark className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
                  <span className="min-w-0">
                    <span className="block truncate text-sm text-foreground">{l.name}</span>
                    {l.address ? (
                      <span className="block truncate text-xs text-muted-foreground">{l.address}</span>
                    ) : null}
                  </span>
                </button>
              ))}

              {query.trim().length >= 3 ? (
                <>
                  <p className="px-2 py-1 text-[11px] uppercase tracking-wide text-muted-foreground">
                    Resultados del mapa
                  </p>
                  {geo.isFetching ? (
                    <p className="flex items-center gap-2 px-2 py-2 text-sm text-muted-foreground">
                      <Loader2 className="h-3.5 w-3.5 animate-spin" /> Buscando…
                    </p>
                  ) : (geo.data ?? []).length === 0 ? (
                    <p className="px-2 py-2 text-sm text-muted-foreground">
                      Sin resultados. Puedes dejar el texto tal cual.
                    </p>
                  ) : (
                    (geo.data ?? []).map((r) => (
                      <button
                        key={r.placeId}
                        type="button"
                        onClick={() => pickPlace(r)}
                        className="flex w-full items-start gap-2 rounded-md px-2 py-2 text-left hover:bg-white/[0.06]"
                      >
                        <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                        <span className="min-w-0">
                          <span className="block truncate text-sm text-foreground">{r.name}</span>
                          <span className="block truncate text-xs text-muted-foreground">{r.address}</span>
                        </span>
                      </button>
                    ))
                  )}
                </>
              ) : null}

              <button
                type="button"
                onClick={() => setOpen(false)}
                className="w-full rounded-md px-2 py-2 text-left text-xs text-muted-foreground hover:bg-white/[0.06]"
              >
                Cerrar sugerencias
              </button>
            </div>
          ) : null}
        </div>
      )}

      {coords ? (
        <LocationMap
          latitude={coords.lat}
          longitude={coords.lng}
          draggable
          onMove={(lat, lng) => void movePin(lat, lng)}
          className="h-40 w-full rounded-xl"
        />
      ) : null}
      {coords ? (
        <p className="text-xs text-muted-foreground">Puedes arrastrar el pin para ajustar la ubicación exacta.</p>
      ) : null}

      {canManage && (isDraft || (!locationId && value.trim())) ? (
        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={saveToCatalog}
          disabled={save.isPending || promote.isPending}
          className="text-primary"
        >
          <Bookmark className="mr-1 h-3.5 w-3.5" />
          Guardar esta ubicación en el catálogo
        </Button>
      ) : null}

    </div>
  );
}

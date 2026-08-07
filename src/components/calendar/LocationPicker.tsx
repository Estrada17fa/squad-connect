import * as React from "react";
import { toast } from "sonner";
import { Bookmark, Loader2, MapPin, Search, Settings2, Trash2, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  EntitySheet,
  EntitySheetBody,
  EntitySheetDescription,
  EntitySheetFooter,
  EntitySheetHeader,
  EntitySheetTitle,
} from "@/components/squad/EntitySheet";
import { useDeleteLocation, useLocations, useSaveLocation, type LocationRow } from "@/hooks/useLocations";
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
  const [managerOpen, setManagerOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const [open, setOpen] = React.useState(false);
  /** Resultado de mapa elegido pero aún no guardado en el catálogo. */
  const [pending, setPending] = React.useState<GeocodeResult | null>(null);

  const geo = useGeocodeSearch(query, open);
  const locations = locationsQ.data ?? [];
  const selected = locationId ? locations.find((l) => l.id === locationId) : undefined;

  const savedMatches = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return locations.slice(0, 5);
    return locations.filter((l) => `${l.name} ${l.address ?? ""}`.toLowerCase().includes(q)).slice(0, 5);
  }, [locations, query]);

  function pickSaved(loc: LocationRow) {
    onLocationIdChange(loc.id);
    onChange(loc.name);
    setPending(null);
    setQuery("");
    setOpen(false);
  }

  function pickPlace(r: GeocodeResult) {
    onLocationIdChange(null);
    onChange(r.name);
    setPending(r);
    setQuery("");
    setOpen(false);
  }

  function clear() {
    onLocationIdChange(null);
    onChange("");
    setPending(null);
  }

  async function saveToCatalog() {
    try {
      const created = await save.mutateAsync({
        club_id: clubId,
        name: (pending?.name ?? value).trim(),
        address: pending?.address ?? null,
        latitude: pending?.latitude ?? null,
        longitude: pending?.longitude ?? null,
        place_id: pending?.placeId ?? null,
        source: pending ? "osm" : "manual",
        created_by: userId,
      });
      onLocationIdChange(created.id);
      onChange(created.name);
      setPending(null);
      toast.success("Ubicación guardada en el catálogo");
    } catch (e: any) {
      toast.error(e.message ?? "No se pudo guardar la ubicación");
    }
  }

  const coords = selected?.latitude != null && selected?.longitude != null
    ? { lat: selected.latitude, lng: selected.longitude }
    : pending
      ? { lat: pending.latitude, lng: pending.longitude }
      : null;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <Label htmlFor={id}>{label}</Label>
        {canManage ? (
          <Button type="button" size="sm" variant="ghost" onClick={() => setManagerOpen(true)}>
            <Settings2 className="mr-1 h-3.5 w-3.5" />
            Ubicaciones
          </Button>
        ) : null}
      </div>

      {value && (selected || pending) ? (
        <div className="glass flex items-start gap-2 p-3">
          <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-foreground">{value}</p>
            <p className="truncate text-xs text-muted-foreground">
              {selected?.address ?? pending?.address ?? ""}
            </p>
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
          draggable={!!pending}
          onMove={(lat, lng) => setPending((p) => (p ? { ...p, latitude: lat, longitude: lng } : p))}
          className="h-40 w-full rounded-xl"
        />
      ) : null}
      {pending ? (
        <p className="text-xs text-muted-foreground">Puedes arrastrar el pin para ajustar la ubicación exacta.</p>
      ) : null}

      {canManage && !locationId && value.trim() ? (
        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={saveToCatalog}
          disabled={save.isPending}
          className="text-primary"
        >
          <Bookmark className="mr-1 h-3.5 w-3.5" />
          Guardar esta ubicación en el catálogo
        </Button>
      ) : null}

      {managerOpen ? (
        <LocationsManager open={managerOpen} onOpenChange={setManagerOpen} clubId={clubId} userId={userId} />
      ) : null}
    </div>
  );
}

/** Gestor del catálogo de ubicaciones del club. */
export function LocationsManager({
  open,
  onOpenChange,
  clubId,
  userId,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  clubId: string;
  userId: string;
}) {
  const locationsQ = useLocations(clubId);
  const save = useSaveLocation();
  const del = useDeleteLocation();
  const [name, setName] = React.useState("");
  const [address, setAddress] = React.useState("");
  const [coords, setCoords] = React.useState<{ lat: number; lng: number } | null>(null);
  const [query, setQuery] = React.useState("");
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const geo = useGeocodeSearch(query, open);

  function reset() {
    setName("");
    setAddress("");
    setCoords(null);
    setQuery("");
    setEditingId(null);
  }

  async function submit() {
    if (!name.trim()) return toast.error("Escribe el nombre de la ubicación");
    try {
      await save.mutateAsync({
        id: editingId ?? undefined,
        club_id: clubId,
        name,
        address,
        latitude: coords?.lat ?? null,
        longitude: coords?.lng ?? null,
        source: coords ? "osm" : "manual",
        created_by: userId,
      });
      toast.success(editingId ? "Ubicación actualizada" : "Ubicación creada");
      reset();
    } catch (e: any) {
      toast.error(e.message ?? "No se pudo guardar");
    }
  }

  async function remove(id: string) {
    try {
      await del.mutateAsync(id);
      toast.success("Ubicación eliminada");
    } catch (e: any) {
      toast.error(e.message ?? "No se pudo eliminar");
    }
  }

  return (
    <EntitySheet open={open} onOpenChange={onOpenChange}>
      <EntitySheetHeader>
        <EntitySheetTitle>Ubicaciones del club</EntitySheetTitle>
        <EntitySheetDescription>Catálogo reutilizable de sedes, canchas y salas con mapa.</EntitySheetDescription>
      </EntitySheetHeader>

      <EntitySheetBody>
        <div className="space-y-1.5">
          <Label htmlFor="loc-search">Buscar en el mapa</Label>
          <Input
            id="loc-search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Estadio, cancha, dirección…"
          />
          {query.trim().length >= 3 ? (
            <div className="max-h-52 overflow-y-auto rounded-xl border border-border bg-popover p-1">
              {geo.isFetching ? (
                <p className="flex items-center gap-2 px-2 py-2 text-sm text-muted-foreground">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" /> Buscando…
                </p>
              ) : (
                (geo.data ?? []).map((r) => (
                  <button
                    key={r.placeId}
                    type="button"
                    onClick={() => {
                      setName(r.name);
                      setAddress(r.address);
                      setCoords({ lat: r.latitude, lng: r.longitude });
                      setQuery("");
                    }}
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
            </div>
          ) : null}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="loc-name">Nombre</Label>
          <Input id="loc-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="p.ej. Cancha 2" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="loc-addr">Dirección (opcional)</Label>
          <Input id="loc-addr" value={address} onChange={(e) => setAddress(e.target.value)} />
        </div>

        {coords ? (
          <LocationMap
            latitude={coords.lat}
            longitude={coords.lng}
            draggable
            onMove={(lat, lng) => setCoords({ lat, lng })}
            className="h-40 w-full rounded-xl"
          />
        ) : null}

        <Button type="button" onClick={submit} disabled={save.isPending} className="w-full">
          {editingId ? "Guardar cambios" : "Agregar ubicación"}
        </Button>
        {editingId ? (
          <Button type="button" variant="ghost" onClick={reset} className="w-full">
            Cancelar edición
          </Button>
        ) : null}

        <div className="mt-2 divide-y divide-border/60 rounded-lg border border-border/60">
          {(locationsQ.data ?? []).length === 0 ? (
            <div className="p-3 text-sm text-muted-foreground">Aún no hay ubicaciones guardadas.</div>
          ) : (
            (locationsQ.data ?? []).map((l) => (
              <div key={l.id} className="flex items-center gap-2 px-3 py-2 text-sm">
                <button
                  type="button"
                  className="min-w-0 flex-1 truncate text-left text-foreground"
                  onClick={() => {
                    setEditingId(l.id);
                    setName(l.name);
                    setAddress(l.address ?? "");
                    setCoords(
                      l.latitude != null && l.longitude != null ? { lat: l.latitude, lng: l.longitude } : null,
                    );
                  }}
                >
                  {l.name}
                  {l.address ? <span className="ml-2 text-xs text-muted-foreground">{l.address}</span> : null}
                </button>
                <button type="button" onClick={() => remove(l.id)} className="p-1 text-destructive">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))
          )}
        </div>
      </EntitySheetBody>

      <EntitySheetFooter>
        <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
          Cerrar
        </Button>
      </EntitySheetFooter>
    </EntitySheet>
  );
}

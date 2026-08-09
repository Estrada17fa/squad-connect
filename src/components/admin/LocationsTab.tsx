import * as React from "react";
import { toast } from "sonner";
import { Loader2, MapPin, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { LocationMap } from "@/components/calendar/LocationMap";
import { useDeleteLocation, useLocations, useSaveLocation, type LocationRow } from "@/hooks/useLocations";
import { useGeocodeSearch } from "@/hooks/useGeocodeSearch";
import { EmptyState } from "@/components/squad/EmptyState";
import { LoadingState } from "@/components/squad/LoadingState";
import { supabase } from "@/integrations/supabase/client";

const db = supabase as any;

/** Cuenta dónde se está usando una ubicación antes de permitir borrarla. */
async function locationUsage(id: string): Promise<string[]> {
  const checks: Array<{ table: string; column: string; label: string }> = [
    { table: "calendar_events", column: "location_id", label: "eventos" },
    { table: "meetings", column: "location_id", label: "juntas" },
    { table: "trip_hotels", column: "location_id", label: "hoteles de viaje" },
    { table: "trips", column: "meeting_location_id", label: "puntos de reunión de viajes" },
  ];
  const results = await Promise.all(
    checks.map(async (c) => {
      const { count } = await db.from(c.table).select("id", { count: "exact", head: true }).eq(c.column, id);
      return (count ?? 0) > 0 ? `${count} ${c.label}` : null;
    }),
  );
  return results.filter(Boolean) as string[];
}

/** Gestor del catálogo de ubicaciones del club (sedes, canchas, salas). */
export function LocationsTab({
  clubId,
  userId,
  canEdit,
}: {
  clubId: string;
  userId: string;
  canEdit: boolean;
}) {
  const locationsQ = useLocations(clubId);
  const del = useDeleteLocation();
  const [search, setSearch] = React.useState("");
  const [formOpen, setFormOpen] = React.useState(false);
  const [editRow, setEditRow] = React.useState<LocationRow | null>(null);

  const list = React.useMemo(() => {
    const q = search.trim().toLowerCase();
    const rows = locationsQ.data ?? [];
    if (!q) return rows;
    return rows.filter(
      (l) => l.name.toLowerCase().includes(q) || (l.address ?? "").toLowerCase().includes(q),
    );
  }, [locationsQ.data, search]);

  async function remove(l: LocationRow) {
    try {
      const usage = await locationUsage(l.id);
      if (usage.length > 0) {
        toast.error(`No se puede eliminar "${l.name}": está en uso en ${usage.join(", ")}.`);
        return;
      }
      if (!confirm(`¿Eliminar la ubicación "${l.name}"?`)) return;
      await del.mutateAsync(l.id);
      toast.success("Ubicación eliminada");
    } catch (e: any) {
      toast.error(e.message ?? "No se pudo eliminar");
    }
  }

  if (locationsQ.isLoading) return <LoadingState />;

  return (
    <div className="space-y-4">
      {canEdit ? (
        <Button
          onClick={() => {
            setEditRow(null);
            setFormOpen(true);
          }}
          className="w-full glow-primary"
        >
          <Plus className="mr-2 h-4 w-4" /> Nueva ubicación
        </Button>
      ) : null}

      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por nombre o dirección"
          className="pl-9"
          aria-label="Buscar ubicaciones"
        />
      </div>

      {list.length === 0 ? (
        <EmptyState
          icon={MapPin}
          title={search ? "Sin resultados" : "Sin ubicaciones guardadas"}
          message={
            search
              ? "Prueba con otro nombre o dirección."
              : canEdit
                ? "Agrega sedes, canchas o salas para reutilizarlas al crear eventos."
                : "El club aún no tiene ubicaciones en el catálogo."
          }
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {list.map((l) => (
            <div key={l.id} className="glass overflow-hidden">
              {l.latitude != null && l.longitude != null ? (
                <LocationMap latitude={l.latitude} longitude={l.longitude} className="h-28 w-full" />
              ) : (
                <div className="flex h-28 w-full items-center justify-center bg-white/[0.03] text-muted-foreground">
                  <MapPin className="h-5 w-5" />
                </div>
              )}
              <div className="flex items-start gap-2 p-3">
                <div className="min-w-0 flex-1">
                  <p className="font-display text-base font-semibold leading-tight text-foreground [overflow-wrap:anywhere]">
                    {l.name}
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground [overflow-wrap:anywhere]">
                    {l.address || "Sin dirección"}
                  </p>
                </div>
                {canEdit ? (
                  <div className="flex shrink-0 gap-1">
                    <Button
                      size="icon"
                      variant="ghost"
                      aria-label={`Editar ${l.name}`}
                      onClick={() => {
                        setEditRow(l);
                        setFormOpen(true);
                      }}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      aria-label={`Eliminar ${l.name}`}
                      onClick={() => remove(l)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      )}

      {canEdit ? (
        <LocationFormDialog
          open={formOpen}
          onOpenChange={setFormOpen}
          clubId={clubId}
          userId={userId}
          row={editRow}
        />
      ) : null}
    </div>
  );
}

function LocationFormDialog({
  open,
  onOpenChange,
  clubId,
  userId,
  row,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  clubId: string;
  userId: string;
  row: LocationRow | null;
}) {
  const save = useSaveLocation();
  const [name, setName] = React.useState("");
  const [address, setAddress] = React.useState("");
  const [coords, setCoords] = React.useState<{ lat: number; lng: number } | null>(null);
  const [query, setQuery] = React.useState("");
  const geo = useGeocodeSearch(query, open);

  React.useEffect(() => {
    if (!open) return;
    setName(row?.name ?? "");
    setAddress(row?.address ?? "");
    setCoords(
      row && row.latitude != null && row.longitude != null
        ? { lat: row.latitude, lng: row.longitude }
        : null,
    );
    setQuery("");
  }, [open, row]);

  async function submit() {
    if (!name.trim()) return toast.error("Escribe el nombre de la ubicación");
    try {
      await save.mutateAsync({
        id: row?.id ?? undefined,
        club_id: clubId,
        name,
        address,
        latitude: coords?.lat ?? null,
        longitude: coords?.lng ?? null,
        source: coords ? "osm" : "manual",
        created_by: userId,
      });
      toast.success(row ? "Ubicación actualizada" : "Ubicación creada");
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e.message ?? "No se pudo guardar");
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{row ? "Editar ubicación" : "Nueva ubicación"}</DialogTitle>
          <DialogDescription>
            Busca el lugar en el mapa o captura los datos manualmente.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="admin-loc-search">Buscar en el mapa</Label>
            <Input
              id="admin-loc-search"
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
            <Label htmlFor="admin-loc-name">Nombre</Label>
            <Input
              id="admin-loc-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="p.ej. Cancha 2"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="admin-loc-addr">Dirección (opcional)</Label>
            <Input id="admin-loc-addr" value={address} onChange={(e) => setAddress(e.target.value)} />
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
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={submit} disabled={save.isPending} className="glow-primary">
            {row ? "Guardar cambios" : "Agregar ubicación"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

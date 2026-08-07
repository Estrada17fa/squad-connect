import * as React from "react";
import { toast } from "sonner";
import { Loader2, MapPin, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { LocationMap } from "@/components/calendar/LocationMap";
import { useDeleteLocation, useLocations, useSaveLocation } from "@/hooks/useLocations";
import { useGeocodeSearch } from "@/hooks/useGeocodeSearch";
import { EmptyState } from "@/components/squad/EmptyState";

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
  const save = useSaveLocation();
  const del = useDeleteLocation();
  const [name, setName] = React.useState("");
  const [address, setAddress] = React.useState("");
  const [coords, setCoords] = React.useState<{ lat: number; lng: number } | null>(null);
  const [query, setQuery] = React.useState("");
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const geo = useGeocodeSearch(query, canEdit);

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
      if (editingId === id) reset();
    } catch (e: any) {
      toast.error(e.message ?? "No se pudo eliminar");
    }
  }

  const list = locationsQ.data ?? [];

  return (
    <div className="space-y-4">
      {canEdit ? (
        <div className="glass space-y-3 p-4">
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

          <Button type="button" onClick={submit} disabled={save.isPending} className="w-full glow-primary">
            {editingId ? "Guardar cambios" : "Agregar ubicación"}
          </Button>
          {editingId ? (
            <Button type="button" variant="ghost" onClick={reset} className="w-full">
              Cancelar edición
            </Button>
          ) : null}
        </div>
      ) : null}

      {list.length === 0 ? (
        <EmptyState
          icon={MapPin}
          title="Sin ubicaciones guardadas"
          message={
            canEdit
              ? "Agrega sedes, canchas o salas para reutilizarlas al crear eventos."
              : "El club aún no tiene ubicaciones en el catálogo."
          }
        />
      ) : (
        <div className="divide-y divide-border/60 rounded-lg border border-border/60">
          {list.map((l) => (
            <div key={l.id} className="flex items-center gap-2 px-3 py-2 text-sm">
              {canEdit ? (
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
              ) : (
                <span className="min-w-0 flex-1 truncate text-foreground">
                  {l.name}
                  {l.address ? <span className="ml-2 text-xs text-muted-foreground">{l.address}</span> : null}
                </span>
              )}
              {canEdit ? (
                <button
                  type="button"
                  onClick={() => remove(l.id)}
                  className="p-1 text-destructive"
                  aria-label={`Eliminar ${l.name}`}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              ) : null}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

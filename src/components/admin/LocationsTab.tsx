import * as React from "react";
import { toast } from "sonner";
import { Filter, Loader2, MapPin, Plus, Search, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LocationMap } from "@/components/calendar/LocationMap";
import { useDeleteLocation, useLocations, useSaveLocation, type LocationRow } from "@/hooks/useLocations";
import { useGeocodeSearch } from "@/hooks/useGeocodeSearch";
import { EmptyState } from "@/components/squad/EmptyState";
import { LoadingState } from "@/components/squad/LoadingState";
import { StatusBadge } from "@/components/squad/StatusBadge";
import { ConfirmDialog } from "@/components/squad/ConfirmDialog";
import {
  DetailField,
  DetailGrid,
  DetailSection,
  DetailSheet,
  DetailValue,
} from "@/components/squad/DetailSheet";
import { EntitySheetBody, EntitySheetFooter } from "@/components/squad/EntitySheet";
import { supabase } from "@/integrations/supabase/client";

const db = supabase as any;
const ALL = "__all__";

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
  const [mapFilter, setMapFilter] = React.useState<string>(ALL);
  const [formOpen, setFormOpen] = React.useState(false);
  const [editRow, setEditRow] = React.useState<LocationRow | null>(null);
  const [detail, setDetail] = React.useState<LocationRow | null>(null);
  const [toDelete, setToDelete] = React.useState<LocationRow | null>(null);
  const [deleting, setDeleting] = React.useState(false);

  const list = React.useMemo(() => {
    const q = search.trim().toLowerCase();
    let rows = locationsQ.data ?? [];
    if (q) {
      rows = rows.filter(
        (l) => l.name.toLowerCase().includes(q) || (l.address ?? "").toLowerCase().includes(q),
      );
    }
    if (mapFilter === "con") rows = rows.filter((l) => l.latitude != null && l.longitude != null);
    if (mapFilter === "sin") rows = rows.filter((l) => l.latitude == null || l.longitude == null);
    return rows;
  }, [locationsQ.data, search, mapFilter]);

  const activeFilters = mapFilter === ALL ? 0 : 1;

  async function confirmDelete() {
    if (!toDelete) return;
    setDeleting(true);
    try {
      const usage = await locationUsage(toDelete.id);
      if (usage.length > 0) {
        toast.error(`No se puede eliminar "${toDelete.name}": está en uso en ${usage.join(", ")}.`, {
          duration: 8000,
        });
        return;
      }
      await del.mutateAsync(toDelete.id);
      toast.success("Ubicación eliminada");
      setToDelete(null);
      setDetail(null);
    } catch (e: any) {
      toast.error(e.message ?? "No se pudo eliminar");
    } finally {
      setDeleting(false);
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

      <div className="space-y-2">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar ubicación"
              className="pl-9"
              aria-label="Buscar ubicaciones"
            />
          </div>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="secondary" className="shrink-0">
                <Filter className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">Filtrar</span>
                {activeFilters > 0 ? (
                  <span className="ml-2 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-primary/20 px-1.5 text-[11px] font-semibold text-primary">
                    {activeFilters}
                  </span>
                ) : null}
              </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-64 space-y-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Mapa</Label>
                <Select value={mapFilter} onValueChange={setMapFilter}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={ALL}>Todas</SelectItem>
                    <SelectItem value="con">Con ubicación en mapa</SelectItem>
                    <SelectItem value="sin">Sin ubicación en mapa</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {activeFilters > 0 ? (
                <Button variant="ghost" className="w-full" onClick={() => setMapFilter(ALL)}>
                  Limpiar filtros
                </Button>
              ) : null}
            </PopoverContent>
          </Popover>
        </div>
        <p className="text-xs text-muted-foreground">
          {list.length} {list.length === 1 ? "ubicación" : "ubicaciones"}
        </p>
      </div>

      {list.length === 0 ? (
        <EmptyState
          icon={MapPin}
          title={search || activeFilters ? "Sin resultados" : "Sin ubicaciones guardadas"}
          message={
            search || activeFilters
              ? "Prueba con otro nombre, dirección o filtro."
              : canEdit
                ? "Agrega sedes, canchas o salas para reutilizarlas al crear eventos."
                : "El club aún no tiene ubicaciones en el catálogo."
          }
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {list.map((l) => (
            <button
              key={l.id}
              type="button"
              onClick={() => setDetail(l)}
              className="glass overflow-hidden text-left transition-colors hover:bg-white/[0.06]"
            >
              {l.latitude != null && l.longitude != null ? (
                <LocationMap latitude={l.latitude} longitude={l.longitude} className="h-28 w-full" />
              ) : (
                <div className="flex h-28 w-full items-center justify-center bg-white/[0.03] text-muted-foreground">
                  <MapPin className="h-5 w-5" />
                </div>
              )}
              <div className="space-y-1.5 p-3">
                <p className="font-display text-base font-semibold leading-tight text-foreground [overflow-wrap:anywhere]">
                  {l.name}
                </p>
                <p className="text-sm text-muted-foreground [overflow-wrap:anywhere]">
                  {l.address || "Sin dirección"}
                </p>
                <StatusBadge variant={l.latitude != null ? "approved" : "pending"}>
                  {l.latitude != null ? "Con mapa" : "Sin mapa"}
                </StatusBadge>
              </div>
            </button>
          ))}
        </div>
      )}

      <DetailSheet
        open={!!detail}
        onOpenChange={(o) => !o && setDetail(null)}
        title={detail?.name ?? ""}
        description="Ubicación del catálogo del club"
        canEdit={canEdit}
        renderEdit={
          detail && canEdit
            ? ({ done }) => (
                <LocationForm
                  clubId={clubId}
                  userId={userId}
                  row={detail}
                  onDone={(saved) => {
                    if (saved) setDetail(saved);
                    done();
                  }}
                  onCancel={done}
                />
              )
            : undefined
        }
        headerActions={
          canEdit && detail ? (
            <Button size="sm" variant="ghost" onClick={() => setToDelete(detail)}>
              <Trash2 className="mr-2 h-3.5 w-3.5 text-destructive" /> Eliminar
            </Button>
          ) : null
        }
      >
        {detail ? (
          <div className="space-y-5">
            {detail.latitude != null && detail.longitude != null ? (
              <LocationMap
                latitude={detail.latitude}
                longitude={detail.longitude}
                className="h-40 w-full rounded-xl"
              />
            ) : null}
            <DetailSection title="Información">
              <DetailGrid>
                <DetailField label="Nombre">
                  <DetailValue value={detail.name} />
                </DetailField>
                <DetailField label="Dirección" full>
                  <DetailValue value={detail.address ?? ""} />
                </DetailField>
                <DetailField label="Coordenadas">
                  <DetailValue
                    value={
                      detail.latitude != null && detail.longitude != null
                        ? `${detail.latitude.toFixed(5)}, ${detail.longitude.toFixed(5)}`
                        : ""
                    }
                  />
                </DetailField>
                <DetailField label="Origen">
                  <DetailValue value={detail.source === "osm" ? "Buscada en mapa" : "Manual"} />
                </DetailField>
              </DetailGrid>
            </DetailSection>
          </div>
        ) : null}
      </DetailSheet>

      {canEdit && formOpen ? (
        <DetailSheet
          open={formOpen}
          onOpenChange={setFormOpen}
          title={editRow ? "Editar ubicación" : "Nueva ubicación"}
          description="Busca el lugar en el mapa o captura los datos manualmente."
          footer={null}
        >
          <LocationForm
            clubId={clubId}
            userId={userId}
            row={editRow}
            embedded
            onDone={() => setFormOpen(false)}
            onCancel={() => setFormOpen(false)}
          />
        </DetailSheet>
      ) : null}

      <ConfirmDialog
        open={!!toDelete}
        onOpenChange={(o) => !o && setToDelete(null)}
        title={`¿Eliminar "${toDelete?.name ?? ""}"?`}
        description="Se quitará del catálogo del club. Esta acción no se puede deshacer."
        loading={deleting}
        onConfirm={confirmDelete}
      />
    </div>
  );
}

function LocationForm({
  clubId,
  userId,
  row,
  onDone,
  onCancel,
  embedded,
}: {
  clubId: string;
  userId: string;
  row: LocationRow | null;
  onDone: (saved?: LocationRow) => void;
  onCancel: () => void;
  embedded?: boolean;
}) {
  const save = useSaveLocation();
  const [name, setName] = React.useState(row?.name ?? "");
  const [address, setAddress] = React.useState(row?.address ?? "");
  const [coords, setCoords] = React.useState<{ lat: number; lng: number } | null>(
    row && row.latitude != null && row.longitude != null
      ? { lat: row.latitude, lng: row.longitude }
      : null,
  );
  const [query, setQuery] = React.useState("");
  const geo = useGeocodeSearch(query, true);

  async function submit() {
    if (!name.trim()) return toast.error("Escribe el nombre de la ubicación");
    try {
      const saved = await save.mutateAsync({
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
      onDone(saved as LocationRow | undefined);
    } catch (e: any) {
      toast.error(e.message ?? "No se pudo guardar");
    }
  }

  const body = (
    <div className="space-y-4">
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
  );

  const footer = (
    <>
      <Button variant="ghost" onClick={onCancel} disabled={save.isPending}>
        Cancelar
      </Button>
      <Button onClick={submit} disabled={save.isPending} className="glow-primary">
        {save.isPending ? "Guardando…" : row ? "Guardar cambios" : "Agregar ubicación"}
      </Button>
    </>
  );

  if (embedded) {
    return (
      <div className="space-y-4">
        {body}
        <div className="flex flex-col-reverse gap-2 border-t border-white/10 pt-4 sm:flex-row sm:justify-end">
          {footer}
        </div>
      </div>
    );
  }

  return (
    <>
      <EntitySheetBody>{body}</EntitySheetBody>
      <EntitySheetFooter>{footer}</EntitySheetFooter>
    </>
  );
}

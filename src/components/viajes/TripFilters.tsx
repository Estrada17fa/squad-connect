import * as React from "react";
import { Filter, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TRIP_STATUS_LABEL, TRIP_STATUS_ORDER, type TripStatus, type TripRow } from "@/hooks/useTrips";

const ALL = "__all__";

export interface TripFilterState {
  search: string;
  status: TripStatus | null;
  from: string;
  to: string;
}

export const EMPTY_TRIP_FILTERS: TripFilterState = { search: "", status: null, from: "", to: "" };

/** Filtro compacto (mismo patrón que Usuarios y Solicitudes). */
export function TripFilters({
  value,
  onChange,
  count,
}: {
  value: TripFilterState;
  onChange: (v: TripFilterState) => void;
  count: number;
}) {
  const set = (patch: Partial<TripFilterState>) => onChange({ ...value, ...patch });
  const activeCount = (value.status ? 1 : 0) + (value.from ? 1 : 0) + (value.to ? 1 : 0);

  return (
    <div className="flex items-center gap-2">
      <div className="relative flex-1">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={value.search}
          onChange={(e) => set({ search: e.target.value })}
          placeholder="Buscar viaje o destino…"
          className="pl-9"
          aria-label="Buscar viajes"
        />
      </div>

      <Popover>
        <PopoverTrigger asChild>
          <Button type="button" variant="outline" size="icon" aria-label="Filtrar viajes" className="relative shrink-0">
            <Filter className="h-4 w-4" />
            {activeCount > 0 ? (
              <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] font-semibold text-primary-foreground">
                {activeCount}
              </span>
            ) : null}
          </Button>
        </PopoverTrigger>
        <PopoverContent align="end" className="w-72 space-y-3">
          <div className="space-y-1.5">
            <Label>Estado</Label>
            <Select
              value={value.status ?? ALL}
              onValueChange={(v) => set({ status: v === ALL ? null : (v as TripStatus) })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>Cualquiera</SelectItem>
                {TRIP_STATUS_ORDER.map((s) => (
                  <SelectItem key={s} value={s}>
                    {TRIP_STATUS_LABEL[s]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1.5">
              <Label htmlFor="trip-from">Desde</Label>
              <Input id="trip-from" type="date" value={value.from} onChange={(e) => set({ from: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="trip-to">Hasta</Label>
              <Input id="trip-to" type="date" value={value.to} onChange={(e) => set({ to: e.target.value })} />
            </div>
          </div>

          <div className="flex items-center justify-between pt-1">
            <span className="text-xs text-muted-foreground">{count} viaje{count === 1 ? "" : "s"}</span>
            <Button type="button" size="sm" variant="ghost" onClick={() => onChange(EMPTY_TRIP_FILTERS)}>
              Limpiar
            </Button>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}

/** Aplica los filtros a la lista de viajes. */
export function applyTripFilters(trips: TripRow[], f: TripFilterState): TripRow[] {
  const q = f.search.trim().toLowerCase();
  return trips.filter((t) => {
    if (q && !`${t.title} ${t.destination ?? ""}`.toLowerCase().includes(q)) return false;
    if (f.status && t.status !== f.status) return false;
    if (f.from && t.departure_at < new Date(`${f.from}T00:00:00`).toISOString()) return false;
    if (f.to && t.departure_at > new Date(`${f.to}T23:59:59`).toISOString()) return false;
    return true;
  });
}

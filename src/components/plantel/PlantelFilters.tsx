import * as React from "react";
import { Filter, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { POSITION_GROUP_LABEL, POSITION_GROUP_ORDER, type PositionGroup } from "@/lib/plantel";

export interface PlantelFilterState {
  search: string;
  teamId: string | null;
  position: PositionGroup | null;
  kind: "jugador" | "staff" | null;
}

export const EMPTY_PLANTEL_FILTERS: PlantelFilterState = {
  search: "",
  teamId: null,
  position: null,
  kind: null,
};

const ALL = "__all__";

/** Buscador + panel "Filtrar", mismo patrón compacto que Usuarios. */
export function PlantelFilters({
  value,
  onChange,
  teams,
  count,
}: {
  value: PlantelFilterState;
  onChange: (v: PlantelFilterState) => void;
  teams: { id: string; name: string }[];
  count: number;
}) {
  const activeCount = (value.teamId ? 1 : 0) + (value.position ? 1 : 0) + (value.kind ? 1 : 0);
  const set = (patch: Partial<PlantelFilterState>) => onChange({ ...value, ...patch });

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={value.search}
            onChange={(e) => set({ search: e.target.value })}
            placeholder="Buscar persona"
            className="pl-9"
          />
        </div>
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="secondary" className="shrink-0">
              <Filter className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Filtrar</span>
              {activeCount > 0 ? (
                <span className="ml-2 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-primary/20 px-1.5 text-[11px] font-semibold text-primary">
                  {activeCount}
                </span>
              ) : null}
            </Button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-72 space-y-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Categoría</Label>
              <Select
                value={value.teamId ?? ALL}
                onValueChange={(v) => set({ teamId: v === ALL ? null : v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL}>Todas las categorías</SelectItem>
                  {teams.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Posición</Label>
              <Select
                value={value.position ?? ALL}
                onValueChange={(v) => set({ position: v === ALL ? null : (v as PositionGroup) })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL}>Todas las posiciones</SelectItem>
                  {POSITION_GROUP_ORDER.map((g) => (
                    <SelectItem key={g} value={g}>
                      {POSITION_GROUP_LABEL[g]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Tipo</Label>
              <Select
                value={value.kind ?? ALL}
                onValueChange={(v) => set({ kind: v === ALL ? null : (v as "jugador" | "staff") })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL}>Todas las personas</SelectItem>
                  <SelectItem value="jugador">Jugadores</SelectItem>
                  <SelectItem value="staff">Cuerpo técnico y staff</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {activeCount > 0 ? (
              <Button
                variant="ghost"
                className="w-full"
                onClick={() => onChange({ ...EMPTY_PLANTEL_FILTERS, search: value.search })}
              >
                Limpiar filtros
              </Button>
            ) : null}
          </PopoverContent>
        </Popover>
      </div>
      <p className="text-xs text-muted-foreground">
        {count} {count === 1 ? "persona" : "personas"}
      </p>
    </div>
  );
}

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

export type NutricionSeguimiento = "con_plan" | "sin_plan" | "sin_estudio";

export interface NutricionFilterState {
  search: string;
  teamId: string | null;
  seguimiento: NutricionSeguimiento | null;
}

export const EMPTY_NUTRICION_FILTERS: NutricionFilterState = {
  search: "",
  teamId: null,
  seguimiento: null,
};

const ALL = "__all__";

const SEGUIMIENTO_LABEL: Record<NutricionSeguimiento, string> = {
  con_plan: "Con plan de la semana",
  sin_plan: "Sin plan de la semana",
  sin_estudio: "Sin estudio antropométrico",
};

/** Buscador + panel "Filtrar", mismo patrón compacto que Usuarios, Plantel y Salud. */
export function NutricionFilters({
  value,
  onChange,
  teams,
  count,
}: {
  value: NutricionFilterState;
  onChange: (v: NutricionFilterState) => void;
  teams: { id: string; name: string }[];
  count: number;
}) {
  const activeCount = (value.teamId ? 1 : 0) + (value.seguimiento ? 1 : 0);
  const set = (patch: Partial<NutricionFilterState>) => onChange({ ...value, ...patch });

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={value.search}
            onChange={(e) => set({ search: e.target.value })}
            placeholder="Buscar jugador"
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
              <Label className="text-xs">Seguimiento</Label>
              <Select
                value={value.seguimiento ?? ALL}
                onValueChange={(v) =>
                  set({ seguimiento: v === ALL ? null : (v as NutricionSeguimiento) })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL}>Todos</SelectItem>
                  {(Object.keys(SEGUIMIENTO_LABEL) as NutricionSeguimiento[]).map((s) => (
                    <SelectItem key={s} value={s}>
                      {SEGUIMIENTO_LABEL[s]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {activeCount > 0 ? (
              <Button
                variant="ghost"
                className="w-full"
                onClick={() => onChange({ ...EMPTY_NUTRICION_FILTERS, search: value.search })}
              >
                Limpiar filtros
              </Button>
            ) : null}
          </PopoverContent>
        </Popover>
      </div>
      <p className="text-xs text-muted-foreground">
        {count} {count === 1 ? "jugador" : "jugadores"}
      </p>
    </div>
  );
}

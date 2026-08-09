import * as React from "react";
import { Filter, Search, X } from "lucide-react";
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
import { cn } from "@/lib/utils";

export interface MembersFilterState {
  search: string;
  status: "activo" | "baja";
  roleId: string | null;
  teamId: string | null;
  jobTitle: string | null;
}

export const EMPTY_FILTERS: MembersFilterState = {
  search: "",
  status: "activo",
  roleId: null,
  teamId: null,
  jobTitle: null,
};

const ALL = "__all__";

/**
 * Filtro compacto: buscador + segmentos de estado + panel "Filtrar" con los
 * filtros secundarios agrupados. Sin chips sueltos ni listas largas.
 */
export function MembersFilters({
  value,
  onChange,
  roles,
  teams,
  jobTitles,
  count,
}: {
  value: MembersFilterState;
  onChange: (v: MembersFilterState) => void;
  roles: { id: string; name: string }[];
  teams: { id: string; name: string }[];
  jobTitles: string[];
  count: number;
}) {
  const activeCount =
    (value.roleId ? 1 : 0) + (value.teamId ? 1 : 0) + (value.jobTitle ? 1 : 0);

  const set = (patch: Partial<MembersFilterState>) => onChange({ ...value, ...patch });

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
              <Label className="text-xs">Rol</Label>
              <Select
                value={value.roleId ?? ALL}
                onValueChange={(v) => set({ roleId: v === ALL ? null : v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL}>Todos los roles</SelectItem>
                  {roles.map((r) => (
                    <SelectItem key={r.id} value={r.id}>
                      {r.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

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
                  <SelectItem value="__club__">Todo el club</SelectItem>
                  {teams.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Puesto</Label>
              <Select
                value={value.jobTitle ?? ALL}
                onValueChange={(v) => set({ jobTitle: v === ALL ? null : v })}
                disabled={jobTitles.length === 0}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sin puestos registrados" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL}>Todos los puestos</SelectItem>
                  {jobTitles.map((j) => (
                    <SelectItem key={j} value={j}>
                      {j}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button
              variant="ghost"
              size="sm"
              className="w-full"
              disabled={activeCount === 0}
              onClick={() => set({ roleId: null, teamId: null, jobTitle: null })}
            >
              <X className="mr-2 h-3.5 w-3.5" /> Limpiar filtros
            </Button>
          </PopoverContent>
        </Popover>
      </div>

      <div className="flex items-center gap-2">
        <div className="flex flex-1 gap-1 rounded-lg border border-border/60 p-1">
          {(["activo", "baja"] as const).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => set({ status: s })}
              className={cn(
                "flex-1 rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
                value.status === s
                  ? "bg-primary/15 text-primary"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {s === "activo" ? "Activos" : "Bajas"}
            </button>
          ))}
        </div>
        <span className="shrink-0 text-xs text-muted-foreground">
          {count} {count === 1 ? "persona" : "personas"}
        </span>
      </div>
    </div>
  );
}

import * as React from "react";
import { Filter, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  REQUEST_TYPES,
  STATUS_LABEL,
  STATUS_ORDER,
  type RequestStatus,
  type RequestType,
} from "@/lib/requestTypes";
import { cn } from "@/lib/utils";

const ALL = "__all__";
const CLUB = "__club__";

export interface RequestFilterState {
  search: string;
  /** true = solo mis solicitudes */
  mine: boolean;
  type: RequestType | null;
  status: RequestStatus | null;
  /** id de equipo, "__club__" para "Todo el club", null = cualquiera */
  teamId: string | "__club__" | null;
}

export const EMPTY_REQUEST_FILTERS: RequestFilterState = {
  search: "",
  mine: true,
  type: null,
  status: null,
  teamId: null,
};

/** Filtro compacto (mismo patrón que Usuarios y Coordinación). */
export function RequestFilters({
  value,
  onChange,
  teams,
  count,
  showScope = true,
}: {
  value: RequestFilterState;
  onChange: (v: RequestFilterState) => void;
  teams: { id: string; name: string }[];
  count: number;
  showScope?: boolean;
}) {
  const set = (patch: Partial<RequestFilterState>) => onChange({ ...value, ...patch });
  const activeCount = (value.type ? 1 : 0) + (value.status ? 1 : 0) + (value.teamId ? 1 : 0);

  return (
    <div className="space-y-2">
      {showScope ? (
        <div className="inline-flex w-full rounded-xl border border-border/60 bg-white/[0.03] p-1">
          {[
            { key: true, label: "Mis solicitudes" },
            { key: false, label: "Todas" },
          ].map((o) => (
            <button
              key={String(o.key)}
              type="button"
              onClick={() => set({ mine: o.key })}
              className={cn(
                "flex-1 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
                value.mine === o.key
                  ? "bg-primary/15 text-primary"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {o.label}
            </button>
          ))}
        </div>
      ) : null}

      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={value.search}
            onChange={(e) => set({ search: e.target.value })}
            placeholder="Buscar solicitud o persona"
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
              <Label className="text-xs uppercase tracking-wide text-muted-foreground">Tipo</Label>
              <Select
                value={value.type ?? ALL}
                onValueChange={(v) => set({ type: v === ALL ? null : (v as RequestType) })}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL}>Todos los tipos</SelectItem>
                  {REQUEST_TYPES.map((t) => (
                    <SelectItem key={t.key} value={t.key}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs uppercase tracking-wide text-muted-foreground">Estatus</Label>
              <Select
                value={value.status ?? ALL}
                onValueChange={(v) => set({ status: v === ALL ? null : (v as RequestStatus) })}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL}>Todos los estatus</SelectItem>
                  {STATUS_ORDER.map((s) => (
                    <SelectItem key={s} value={s}>{STATUS_LABEL[s]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs uppercase tracking-wide text-muted-foreground">Categoría</Label>
              <Select
                value={value.teamId ?? ALL}
                onValueChange={(v) => set({ teamId: v === ALL ? null : (v as string) })}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL}>Todas las categorías</SelectItem>
                  <SelectItem value={CLUB}>Todo el club</SelectItem>
                  {teams.map((t) => (
                    <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {activeCount > 0 ? (
              <Button
                type="button"
                variant="ghost"
                className="w-full"
                onClick={() => set({ type: null, status: null, teamId: null })}
              >
                Limpiar filtros
              </Button>
            ) : null}
          </PopoverContent>
        </Popover>
      </div>

      <p className="text-xs text-muted-foreground">
        {count} {count === 1 ? "solicitud" : "solicitudes"}
      </p>
    </div>
  );
}

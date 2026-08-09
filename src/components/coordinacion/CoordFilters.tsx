import * as React from "react";
import { Filter, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PRIORITY_LABEL, PRIORITY_ORDER } from "@/lib/coordinacion";
import type { TaskPriority } from "@/hooks/useCoordinacion";
import { cn } from "@/lib/utils";

const ALL = "__all__";
const CLUB = "__club__";

export interface CoordFilterState {
  search: string;
  /** "mias" | "todas" */
  mine: boolean;
  priority: TaskPriority | null;
  teamId: string | null | "__club__";
  assigneeId: string | null;
}

export const EMPTY_COORD_FILTERS: CoordFilterState = {
  search: "",
  mine: false,
  priority: null,
  teamId: null,
  assigneeId: null,
};

/** Filtro compacto (mismo patrón que Usuarios): buscador + segmentos + panel. */
export function CoordFilters({
  value,
  onChange,
  teams,
  people,
  count,
  showPriority = true,
  searchPlaceholder = "Buscar",
  mineLabel = "Mías",
}: {
  value: CoordFilterState;
  onChange: (v: CoordFilterState) => void;
  teams: { id: string; name: string }[];
  people: { id: string; full_name: string | null; email: string | null }[];
  count: number;
  showPriority?: boolean;
  searchPlaceholder?: string;
  mineLabel?: string;
}) {
  const set = (patch: Partial<CoordFilterState>) => onChange({ ...value, ...patch });
  const activeCount =
    (value.priority ? 1 : 0) + (value.teamId ? 1 : 0) + (value.assigneeId ? 1 : 0);

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={value.search}
            onChange={(e) => set({ search: e.target.value })}
            placeholder={searchPlaceholder}
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
            {showPriority ? (
              <div className="space-y-1.5">
                <Label className="text-xs">Prioridad</Label>
                <Select
                  value={value.priority ?? ALL}
                  onValueChange={(v) => set({ priority: v === ALL ? null : (v as TaskPriority) })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={ALL}>Todas las prioridades</SelectItem>
                    {PRIORITY_ORDER.map((p) => (
                      <SelectItem key={p} value={p}>
                        {PRIORITY_LABEL[p]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : null}

            <div className="space-y-1.5">
              <Label className="text-xs">Categoría</Label>
              <Select
                value={value.teamId ?? ALL}
                onValueChange={(v) => set({ teamId: v === ALL ? null : (v as string) })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL}>Todas</SelectItem>
                  <SelectItem value={CLUB}>Todo el club</SelectItem>
                  {teams.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Persona</Label>
              <Select
                value={value.assigneeId ?? ALL}
                onValueChange={(v) => set({ assigneeId: v === ALL ? null : v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL}>Cualquiera</SelectItem>
                  {people.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.full_name ?? p.email ?? "—"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button
              variant="ghost"
              className="w-full"
              onClick={() => onChange({ ...EMPTY_COORD_FILTERS, search: value.search, mine: value.mine })}
            >
              Limpiar filtros
            </Button>
          </PopoverContent>
        </Popover>
      </div>

      <div className="flex items-center justify-between gap-2">
        <div className="flex gap-1.5">
          {[
            { key: false, label: "Todas" },
            { key: true, label: mineLabel },
          ].map((c) => (
            <button
              key={String(c.key)}
              type="button"
              onClick={() => set({ mine: c.key })}
              className={cn(
                "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                value.mine === c.key
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border/60 text-muted-foreground hover:bg-white/[0.04]",
              )}
            >
              {c.label}
            </button>
          ))}
        </div>
        <span className="text-xs text-muted-foreground">{count} resultado{count === 1 ? "" : "s"}</span>
      </div>
    </div>
  );
}

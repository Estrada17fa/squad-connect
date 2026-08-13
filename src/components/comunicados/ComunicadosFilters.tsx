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
import { PRIORITY_LABEL, type AnnouncementPriority } from "@/hooks/useAnnouncements";

const ALL = "__all__";

export interface AnnouncementFilterState {
  search: string;
  priority: AnnouncementPriority | null;
  teamId: string | null;
  readState: "leidos" | "no_leidos" | null;
}

export const EMPTY_ANNOUNCEMENT_FILTERS: AnnouncementFilterState = {
  search: "",
  priority: null,
  teamId: null,
  readState: null,
};

/** Buscador + panel "Filtrar", mismo patrón compacto que Usuarios y Salud. */
export function ComunicadosFilters({
  value,
  onChange,
  teams,
  count,
}: {
  value: AnnouncementFilterState;
  onChange: (v: AnnouncementFilterState) => void;
  teams: { id: string; name: string }[];
  count: number;
}) {
  const set = (patch: Partial<AnnouncementFilterState>) => onChange({ ...value, ...patch });
  const activeCount =
    (value.priority ? 1 : 0) + (value.teamId ? 1 : 0) + (value.readState ? 1 : 0);

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={value.search}
            onChange={(e) => set({ search: e.target.value })}
            placeholder="Buscar comunicado"
            className="pl-9"
          />
        </div>
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="secondary" className="shrink-0">
              <Filter className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Filtrar</span>
              {activeCount ? (
                <span className="ml-2 rounded-full bg-primary/15 px-1.5 text-xs text-primary">
                  {activeCount}
                </span>
              ) : null}
            </Button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-72 space-y-3">
            <div className="space-y-1.5">
              <Label>Prioridad</Label>
              <Select
                value={value.priority ?? ALL}
                onValueChange={(v) =>
                  set({ priority: v === ALL ? null : (v as AnnouncementPriority) })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Todas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL}>Todas</SelectItem>
                  {(["urgente", "importante", "normal"] as AnnouncementPriority[]).map((p) => (
                    <SelectItem key={p} value={p}>
                      {PRIORITY_LABEL[p]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Categoría</Label>
              <Select
                value={value.teamId ?? ALL}
                onValueChange={(v) => set({ teamId: v === ALL ? null : v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Todas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL}>Todas</SelectItem>
                  {teams.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Lectura</Label>
              <Select
                value={value.readState ?? ALL}
                onValueChange={(v) =>
                  set({ readState: v === ALL ? null : (v as "leidos" | "no_leidos") })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL}>Todos</SelectItem>
                  <SelectItem value="no_leidos">No leídos</SelectItem>
                  <SelectItem value="leidos">Leídos</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button
              variant="ghost"
              className="w-full"
              onClick={() => onChange(EMPTY_ANNOUNCEMENT_FILTERS)}
            >
              Limpiar filtros
            </Button>
          </PopoverContent>
        </Popover>
      </div>
      <p className="text-xs text-muted-foreground">
        {count} {count === 1 ? "comunicado" : "comunicados"}
      </p>
    </div>
  );
}

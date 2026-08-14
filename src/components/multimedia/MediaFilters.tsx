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
import { MEDIA_TYPES, MEDIA_TYPE_LABEL, type MediaPostType } from "@/lib/multimedia";

const ALL = "__all__";
const CLUB = "__club__";

export interface MediaFilterState {
  search: string;
  type: MediaPostType | null;
  teamId: string | null;
  from: string;
  to: string;
}

export const EMPTY_MEDIA_FILTERS: MediaFilterState = {
  search: "",
  type: null,
  teamId: null,
  from: "",
  to: "",
};

/** Buscador + panel "Filtrar" (tipo, categoría y rango de fechas). */
export function MediaFilters({
  value,
  onChange,
  teams,
  count,
}: {
  value: MediaFilterState;
  onChange: (v: MediaFilterState) => void;
  teams: { id: string; name: string }[];
  count: number;
}) {
  const set = (patch: Partial<MediaFilterState>) => onChange({ ...value, ...patch });
  const activeCount =
    (value.type ? 1 : 0) + (value.teamId ? 1 : 0) + (value.from ? 1 : 0) + (value.to ? 1 : 0);

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={value.search}
            onChange={(e) => set({ search: e.target.value })}
            placeholder="Buscar por título o descripción"
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
              <Label>Tipo</Label>
              <Select
                value={value.type ?? ALL}
                onValueChange={(v) => set({ type: v === ALL ? null : (v as MediaPostType) })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL}>Todos</SelectItem>
                  {MEDIA_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>
                      {MEDIA_TYPE_LABEL[t]}
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
                  <SelectItem value={CLUB}>Todo el club</SelectItem>
                  {teams.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1.5">
                <Label htmlFor="mm-from">Desde</Label>
                <Input
                  id="mm-from"
                  type="date"
                  value={value.from}
                  onChange={(e) => set({ from: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="mm-to">Hasta</Label>
                <Input
                  id="mm-to"
                  type="date"
                  value={value.to}
                  onChange={(e) => set({ to: e.target.value })}
                />
              </div>
            </div>

            <div className="flex items-center justify-between pt-1">
              <span className="text-xs text-muted-foreground">{count} publicaciones</span>
              <Button variant="ghost" size="sm" onClick={() => onChange(EMPTY_MEDIA_FILTERS)}>
                Limpiar
              </Button>
            </div>
          </PopoverContent>
        </Popover>
      </div>
    </div>
  );
}

/** Filtro aplicado en cliente (la RLS ya limitó el alcance). */
export function matchesMediaFilters(
  post: {
    title: string | null;
    description: string | null;
    type: MediaPostType;
    audience: "club" | "teams";
    published_at: string;
    teams: { team_id: string }[];
  },
  f: MediaFilterState,
): boolean {
  const q = f.search.trim().toLowerCase();
  if (q && !`${post.title ?? ""} ${post.description ?? ""}`.toLowerCase().includes(q)) return false;
  if (f.type && post.type !== f.type) return false;
  if (f.teamId === CLUB && post.audience !== "club") return false;
  if (f.teamId && f.teamId !== CLUB && !post.teams.some((t) => t.team_id === f.teamId)) return false;
  const day = post.published_at.slice(0, 10);
  if (f.from && day < f.from) return false;
  if (f.to && day > f.to) return false;
  return true;
}

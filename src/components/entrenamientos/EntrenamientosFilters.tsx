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
import { EXERCISE_CATEGORIES, type ExerciseCategory } from "@/hooks/useTraining";

const ALL = "__all__";

export interface TrainingFilterState {
  search: string;
  teamId: string | null;
  /** Biblioteca: tipo de ejercicio. */
  category: ExerciseCategory | null;
  /** Biblioteca: club / equipo. */
  scope: "club" | "team" | null;
  /** Biblioteca: solo con material o con imagen. */
  extra: "material" | "media" | null;
  /** Sesiones: con o sin plan / ligadas al calendario. */
  planned: "con" | "sin" | null;
  linked: boolean;
}

export const EMPTY_TRAINING_FILTERS: TrainingFilterState = {
  search: "",
  teamId: null,
  category: null,
  scope: null,
  extra: null,
  planned: null,
  linked: false,
};

/** Buscador + panel "Filtrar", mismo patrón compacto que Salud y Usuarios. */
export function EntrenamientosFilters({
  mode,
  value,
  onChange,
  teams,
  count,
}: {
  mode: "sesiones" | "biblioteca";
  value: TrainingFilterState;
  onChange: (v: TrainingFilterState) => void;
  teams: { id: string; name: string }[];
  count: number;
}) {
  const set = (patch: Partial<TrainingFilterState>) => onChange({ ...value, ...patch });

  const activeCount =
    (value.teamId ? 1 : 0) +
    (mode === "biblioteca"
      ? (value.category ? 1 : 0) + (value.scope ? 1 : 0) + (value.extra ? 1 : 0)
      : (value.planned ? 1 : 0) + (value.linked ? 1 : 0));

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={value.search}
            onChange={(e) => set({ search: e.target.value })}
            placeholder={mode === "sesiones" ? "Buscar sesión" : "Buscar ejercicio"}
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
              <Label>Categoría del equipo</Label>
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

            {mode === "biblioteca" ? (
              <>
                <div className="space-y-1.5">
                  <Label>Tipo de ejercicio</Label>
                  <Select
                    value={value.category ?? ALL}
                    onValueChange={(v) =>
                      set({ category: v === ALL ? null : (v as ExerciseCategory) })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Todos" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={ALL}>Todos</SelectItem>
                      {EXERCISE_CATEGORIES.map((c) => (
                        <SelectItem key={c.key} value={c.key}>
                          {c.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label>Alcance</Label>
                  <Select
                    value={value.scope ?? ALL}
                    onValueChange={(v) => set({ scope: v === ALL ? null : (v as "club" | "team") })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Todos" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={ALL}>Todos</SelectItem>
                      <SelectItem value="club">Del club</SelectItem>
                      <SelectItem value="team">De una categoría</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label>Contenido</Label>
                  <Select
                    value={value.extra ?? ALL}
                    onValueChange={(v) => set({ extra: v === ALL ? null : (v as "material" | "media") })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Todo" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={ALL}>Todo</SelectItem>
                      <SelectItem value="material">Con material</SelectItem>
                      <SelectItem value="media">Con imagen o video</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </>
            ) : (
              <>
                <div className="space-y-1.5">
                  <Label>Plan</Label>
                  <Select
                    value={value.planned ?? ALL}
                    onValueChange={(v) => set({ planned: v === ALL ? null : (v as "con" | "sin") })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Todas" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={ALL}>Todas</SelectItem>
                      <SelectItem value="con">Con ejercicios</SelectItem>
                      <SelectItem value="sin">Sin ejercicios</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label>Calendario</Label>
                  <Select
                    value={value.linked ? "linked" : ALL}
                    onValueChange={(v) => set({ linked: v === "linked" })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Todas" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={ALL}>Todas</SelectItem>
                      <SelectItem value="linked">Solo ligadas a un evento</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}

            <Button
              variant="ghost"
              className="w-full"
              onClick={() => onChange({ ...EMPTY_TRAINING_FILTERS, search: value.search })}
            >
              Limpiar filtros
            </Button>
          </PopoverContent>
        </Popover>
      </div>
      <p className="text-xs text-muted-foreground">
        {count} resultado{count === 1 ? "" : "s"}
      </p>
    </div>
  );
}

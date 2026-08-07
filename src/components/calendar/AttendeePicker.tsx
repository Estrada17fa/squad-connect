import * as React from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Users, UserMinus, SlidersHorizontal, RotateCcw } from "lucide-react";
import { useTeamMembers, type TeamMember } from "@/hooks/useTeamMembers";
import { cn } from "@/lib/utils";

/**
 * "auto"  = convocatoria completa del equipo (por defecto).
 * "custom"= selección manual.
 * "detect"= al editar: se decide solo comparando lo guardado con el equipo.
 */
export type AttendeeMode = "auto" | "custom" | "detect";

interface Props {
  clubId: string;
  teamId: string | null;
  value: Set<string>;
  onChange: (next: Set<string>) => void;
  label?: string;
  mode?: AttendeeMode;
  onModeChange?: (m: AttendeeMode) => void;
}

/**
 * Selector de convocados. Por defecto convoca automáticamente a todo el equipo;
 * personalizar es la excepción. Compartido por eventos y sesiones de entrenamiento.
 */
export function AttendeePicker({
  clubId,
  teamId,
  value,
  onChange,
  label = "Asistentes",
  mode = "auto",
  onModeChange,
}: Props) {
  const [search, setSearch] = React.useState("");
  const membersQ = useTeamMembers(teamId, clubId);
  const members = React.useMemo(() => membersQ.data ?? [], [membersQ.data]);

  const allIds = React.useMemo(() => members.map((m) => m.id), [members]);
  const isWholeTeam =
    allIds.length > 0 && value.size === allIds.length && allIds.every((id) => value.has(id));

  // Sincroniza la convocatoria automática y resuelve el modo al editar.
  React.useEffect(() => {
    if (!allIds.length) return;
    if (mode === "detect") {
      onModeChange?.(isWholeTeam ? "auto" : "custom");
      return;
    }
    if (mode === "auto" && !isWholeTeam) {
      onChange(new Set(allIds));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allIds, mode, isWholeTeam]);

  const filtered = members.filter((m: TeamMember) =>
    (m.full_name ?? m.email ?? "").toLowerCase().includes(search.toLowerCase()),
  );

  function toggle(id: string) {
    const next = new Set(value);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    onChange(next);
  }

  function selectAll() {
    const next = new Set(value);
    for (const m of filtered) next.add(m.id);
    onChange(next);
  }

  function clearAll() {
    if (!search) return onChange(new Set());
    const next = new Set(value);
    for (const m of filtered) next.delete(m.id);
    onChange(next);
  }

  if (mode !== "custom") {
    return (
      <div className="space-y-1.5">
        <Label>{label}</Label>
        <div className="glass flex items-center justify-between gap-3 p-3">
          <div className="flex min-w-0 items-center gap-2">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary">
              <Users className="h-4 w-4" />
            </span>
            <div className="min-w-0">
              <p className="text-sm font-medium text-foreground">
                {membersQ.isLoading ? "Cargando equipo…" : `Todo el equipo (${allIds.length})`}
              </p>
              <p className="text-xs text-muted-foreground">Convocatoria automática</p>
            </div>
          </div>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={() => onModeChange?.("custom")}
            disabled={!allIds.length}
          >
            <SlidersHorizontal className="mr-1 h-3.5 w-3.5" />
            Personalizar
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-2">
        <Label>
          {label} ({value.size} de {allIds.length})
        </Label>
        <div className="flex items-center gap-1">
          <Button type="button" size="sm" variant="ghost" onClick={selectAll} disabled={!filtered.length}>
            <Users className="mr-1 h-3.5 w-3.5" />
            {search ? "Seleccionar resultados" : "Todos"}
          </Button>
          <Button type="button" size="sm" variant="ghost" onClick={clearAll} disabled={!value.size}>
            <UserMinus className="mr-1 h-3.5 w-3.5" />
            Quitar
          </Button>
        </div>
      </div>

      <Input placeholder="Buscar…" value={search} onChange={(e) => setSearch(e.target.value)} />

      <div className="max-h-48 overflow-y-auto rounded-lg border border-border/60">
        {membersQ.isLoading ? (
          <div className="p-3 text-sm text-muted-foreground">Cargando…</div>
        ) : filtered.length === 0 ? (
          <div className="p-3 text-sm text-muted-foreground">Sin miembros</div>
        ) : (
          filtered.map((m) => {
            const selected = value.has(m.id);
            return (
              <button
                type="button"
                key={m.id}
                onClick={() => toggle(m.id)}
                className={cn(
                  "flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm hover:bg-white/[0.04]",
                  selected && "bg-white/[0.06]",
                )}
              >
                <span className="truncate">
                  <span className="text-foreground">{m.full_name ?? m.email ?? "—"}</span>
                  {m.role_name ? <span className="ml-2 text-xs text-muted-foreground">{m.role_name}</span> : null}
                </span>
                <span
                  className={cn(
                    "h-4 w-4 shrink-0 rounded border",
                    selected ? "border-primary bg-primary" : "border-border",
                  )}
                />
              </button>
            );
          })
        )}
      </div>

      <button
        type="button"
        onClick={() => {
          onChange(new Set(allIds));
          onModeChange?.("auto");
        }}
        className="flex items-center gap-1 text-xs text-muted-foreground underline underline-offset-2"
      >
        <RotateCcw className="h-3 w-3" />
        Volver a todo el equipo
      </button>
    </div>
  );
}

import * as React from "react";
import { RotateCcw, SlidersHorizontal, UserMinus, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { PlayerRow } from "@/hooks/usePlayers";
import { cn } from "@/lib/utils";

export type CallupMode = "auto" | "custom";

interface Props {
  players: PlayerRow[];
  loading?: boolean;
  value: Set<string>;
  onChange: (next: Set<string>) => void;
  mode: CallupMode;
  onModeChange: (m: CallupMode) => void;
}

/**
 * Convocatoria del partido: por defecto todo el plantel de la categoría,
 * personalizar es la excepción (mismo patrón que eventos y entrenamientos).
 */
export function CallupPicker({ players, loading, value, onChange, mode, onModeChange }: Props) {
  const [search, setSearch] = React.useState("");
  const allIds = React.useMemo(() => players.map((p) => p.user_id), [players]);
  const isWholeTeam = allIds.length > 0 && allIds.every((id) => value.has(id)) && value.size === allIds.length;

  React.useEffect(() => {
    if (mode === "auto" && allIds.length && !isWholeTeam) onChange(new Set(allIds));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, allIds, isWholeTeam]);

  const filtered = players.filter((p) =>
    (p.profile?.full_name ?? "").toLowerCase().includes(search.toLowerCase()),
  );

  function toggle(id: string) {
    const next = new Set(value);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    onChange(next);
  }

  if (mode === "auto") {
    return (
      <div className="space-y-1.5">
        <Label>Convocatoria</Label>
        <div className="glass flex items-center justify-between gap-3 p-3">
          <div className="flex min-w-0 items-center gap-2">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary">
              <Users className="h-4 w-4" />
            </span>
            <div className="min-w-0">
              <p className="text-sm font-medium text-foreground">
                {loading ? "Cargando plantel…" : `Todo el plantel (${allIds.length})`}
              </p>
              <p className="text-xs text-muted-foreground">Convocatoria automática</p>
            </div>
          </div>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={() => onModeChange("custom")}
            disabled={!allIds.length}
          >
            <SlidersHorizontal className="mr-1 h-3.5 w-3.5" /> Personalizar
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-2">
        <Label>
          Convocatoria ({value.size} de {allIds.length})
        </Label>
        <div className="flex items-center gap-1">
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={() => onChange(new Set([...value, ...filtered.map((p) => p.user_id)]))}
            disabled={!filtered.length}
          >
            <Users className="mr-1 h-3.5 w-3.5" /> Todos
          </Button>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={() => {
              const next = new Set(value);
              for (const p of filtered) next.delete(p.user_id);
              onChange(next);
            }}
            disabled={!value.size}
          >
            <UserMinus className="mr-1 h-3.5 w-3.5" /> Quitar
          </Button>
        </div>
      </div>

      <Input placeholder="Buscar jugador…" value={search} onChange={(e) => setSearch(e.target.value)} />

      <div className="max-h-56 overflow-y-auto rounded-lg border border-border/60">
        {loading ? (
          <div className="p-3 text-sm text-muted-foreground">Cargando…</div>
        ) : filtered.length === 0 ? (
          <div className="p-3 text-sm text-muted-foreground">Sin jugadores en esta categoría</div>
        ) : (
          filtered.map((p) => {
            const selected = value.has(p.user_id);
            return (
              <button
                type="button"
                key={p.id}
                onClick={() => toggle(p.user_id)}
                className={cn(
                  "flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm hover:bg-white/[0.04]",
                  selected && "bg-white/[0.06]",
                )}
              >
                <span className="truncate">
                  {p.jersey_number != null ? (
                    <span className="mr-2 tabular-nums text-muted-foreground">{p.jersey_number}</span>
                  ) : null}
                  <span className="text-foreground">{p.profile?.full_name ?? "—"}</span>
                  {p.position ? <span className="ml-2 text-xs text-muted-foreground">{p.position}</span> : null}
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
          onModeChange("auto");
        }}
        className="flex items-center gap-1 text-xs text-muted-foreground underline underline-offset-2"
      >
        <RotateCcw className="h-3 w-3" /> Volver a todo el plantel
      </button>
    </div>
  );
}

import * as React from "react";
import { Search, User, X } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

export interface PickerPlayer {
  playerId?: string;
  userId: string;
  teamId: string;
  teamName?: string | null;
  fullName?: string | null;
  avatarUrl?: string | null;
  jerseyNumber?: number | null;
  position?: string | null;
}

interface Props {
  id?: string;
  label?: string;
  players: PickerPlayer[];
  value: string;
  onChange: (userId: string) => void;
  disabled?: boolean;
  /** Mensaje cuando no hay ningún jugador disponible. */
  emptyMessage?: string;
}

function initials(name?: string | null) {
  if (!name) return "?";
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

function normalize(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

/**
 * Selector de persona en dos pasos: primero la categoría y después el jugador,
 * con buscador por nombre. La lista que recibe ya viene filtrada por permisos,
 * así que las categorías mostradas son solo las que el usuario puede gestionar.
 */
export function PlayerPicker({
  id = "player-picker",
  label = "Jugador",
  players,
  value,
  onChange,
  disabled,
  emptyMessage = "No tienes categorías donde puedas registrar información.",
}: Props) {
  const selected = players.find((p) => p.userId === value) ?? null;

  const teams = React.useMemo(() => {
    const map = new Map<string, string>();
    for (const p of players) if (!map.has(p.teamId)) map.set(p.teamId, p.teamName ?? "Sin categoría");
    return Array.from(map, ([teamId, name]) => ({ teamId, name })).sort((a, b) =>
      a.name.localeCompare(b.name),
    );
  }, [players]);

  const [teamId, setTeamId] = React.useState<string>("");
  const [search, setSearch] = React.useState("");

  React.useEffect(() => {
    if (selected) {
      setTeamId(selected.teamId);
      return;
    }
    setTeamId((prev) => {
      if (prev && teams.some((t) => t.teamId === prev)) return prev;
      return teams.length === 1 ? teams[0]!.teamId : "";
    });
  }, [selected, teams]);

  const filtered = React.useMemo(() => {
    if (!teamId) return [];
    const q = normalize(search);
    return players
      .filter((p) => p.teamId === teamId)
      .filter((p) => (q ? normalize(p.fullName ?? "").includes(q) : true))
      .sort((a, b) => (a.fullName ?? "").localeCompare(b.fullName ?? ""));
  }, [players, teamId, search]);

  if (players.length === 0) {
    return (
      <div className="space-y-1.5">
        <Label>{label}</Label>
        <p className="text-xs text-amber-400">{emptyMessage}</p>
      </div>
    );
  }

  /* Jugador ya elegido: se muestra el resumen con opción de cambiar. */
  if (selected) {
    return (
      <div className="space-y-1.5">
        <Label>{label}</Label>
        <div className="flex items-center gap-3 rounded-md border border-border bg-card/60 px-3 py-2">
          <Avatar className="h-9 w-9">
            {selected.avatarUrl ? <AvatarImage src={selected.avatarUrl} alt="" /> : null}
            <AvatarFallback className="text-xs">{initials(selected.fullName)}</AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{selected.fullName ?? "Sin nombre"}</p>
            <p className="truncate text-xs text-muted-foreground">
              {[selected.teamName, selected.position, selected.jerseyNumber ? `#${selected.jerseyNumber}` : null]
                .filter(Boolean)
                .join(" · ")}
            </p>
          </div>
          {!disabled ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                onChange("");
                setSearch("");
              }}
            >
              <X className="mr-1 h-3.5 w-3.5" />
              Cambiar
            </Button>
          ) : null}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="space-y-1.5">
        <Label htmlFor={`${id}-team`}>Categoría</Label>
        <select
          id={`${id}-team`}
          value={teamId}
          onChange={(e) => {
            setTeamId(e.target.value);
            setSearch("");
          }}
          disabled={disabled || teams.length === 1}
          className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm disabled:opacity-60"
        >
          <option value="">Selecciona una categoría…</option>
          {teams.map((t) => (
            <option key={t.teamId} value={t.teamId}>
              {t.name}
            </option>
          ))}
        </select>
      </div>

      {teamId ? (
        <div className="space-y-1.5">
          <Label htmlFor={`${id}-search`}>{label}</Label>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id={`${id}-search`}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar jugador…"
              className="pl-9"
              disabled={disabled}
              autoComplete="off"
            />
          </div>

          <div className="max-h-56 space-y-1 overflow-y-auto rounded-md border border-border p-1">
            {filtered.length === 0 ? (
              <p className="px-2 py-3 text-xs text-muted-foreground">Ningún jugador coincide.</p>
            ) : (
              filtered.map((p) => (
                <button
                  key={p.playerId ?? p.userId}
                  type="button"
                  disabled={disabled}
                  onClick={() => onChange(p.userId)}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-md px-2 py-1.5 text-left transition-colors",
                    "hover:bg-muted/60 disabled:opacity-60",
                  )}
                >
                  <Avatar className="h-8 w-8">
                    {p.avatarUrl ? <AvatarImage src={p.avatarUrl} alt="" /> : null}
                    <AvatarFallback className="text-[10px]">
                      {p.fullName ? initials(p.fullName) : <User className="h-3.5 w-3.5" />}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm">{p.fullName ?? "Sin nombre"}</p>
                    {p.position || p.jerseyNumber ? (
                      <p className="truncate text-xs text-muted-foreground">
                        {[p.position, p.jerseyNumber ? `#${p.jerseyNumber}` : null].filter(Boolean).join(" · ")}
                      </p>
                    ) : null}
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}

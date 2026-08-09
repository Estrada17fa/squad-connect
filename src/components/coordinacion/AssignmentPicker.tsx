import * as React from "react";
import { Building2, Layers, Search, UserRound } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useTeamMembers } from "@/hooks/useTeamMembers";
import { initialsOf } from "@/lib/coordinacion";
import { cn } from "@/lib/utils";

export type AssignScope = "personas" | "categoria" | "club";

export interface AssignmentValue {
  scope: AssignScope;
  /** Categoría de la tarea/junta. null = todo el club. */
  teamId: string | null;
  /** Personas resueltas que quedan asignadas/convocadas. */
  userIds: string[];
}

const SCOPES: { key: AssignScope; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { key: "personas", label: "Personas", icon: UserRound },
  { key: "categoria", label: "Categoría", icon: Layers },
  { key: "club", label: "Todo el club", icon: Building2 },
];

/**
 * Control compartido de asignación / convocatoria.
 * Personas = selección manual · Categoría = todos sus miembros · Club = todos.
 */
export function AssignmentPicker({
  clubId,
  teams,
  value,
  onChange,
  label = "Asignar a",
}: {
  clubId: string;
  teams: { id: string | null; name: string }[];
  value: AssignmentValue;
  onChange: (v: AssignmentValue) => void;
  label?: string;
}) {
  const [search, setSearch] = React.useState("");
  const realTeams = teams.filter((t) => !!t.id) as { id: string; name: string }[];

  // Personas disponibles según el alcance elegido.
  const scopeTeamId = value.scope === "categoria" ? value.teamId : null;
  const membersQ = useTeamMembers(scopeTeamId, clubId);
  const members = React.useMemo(() => membersQ.data ?? [], [membersQ.data]);
  const allIds = React.useMemo(() => members.map((m) => m.id), [members]);

  // En categoría/club la selección se resuelve automáticamente.
  const auto = value.scope !== "personas";
  React.useEffect(() => {
    if (!auto || allIds.length === 0) return;
    const same =
      value.userIds.length === allIds.length && allIds.every((id) => value.userIds.includes(id));
    if (!same) onChange({ ...value, userIds: allIds });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auto, allIds, value.scope, value.teamId]);

  function setScope(scope: AssignScope) {
    if (scope === value.scope) return;
    if (scope === "club") onChange({ scope, teamId: null, userIds: [] });
    else if (scope === "categoria") onChange({ scope, teamId: value.teamId ?? realTeams[0]?.id ?? null, userIds: [] });
    else onChange({ scope, teamId: null, userIds: value.userIds });
  }

  function toggle(id: string) {
    const next = value.userIds.includes(id)
      ? value.userIds.filter((x) => x !== id)
      : [...value.userIds, id];
    onChange({ ...value, userIds: next });
  }

  const filtered = members.filter((m) =>
    (m.full_name ?? m.email ?? "").toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="space-y-2">
      <Label>{label}</Label>

      <div className="flex gap-1.5">
        {SCOPES.map((s) => {
          const Icon = s.icon;
          const active = value.scope === s.key;
          return (
            <button
              key={s.key}
              type="button"
              onClick={() => setScope(s.key)}
              className={cn(
                "flex flex-1 items-center justify-center gap-1.5 rounded-lg border px-2 py-2 text-xs font-medium transition-colors",
                active
                  ? "border-primary bg-primary/15 text-primary"
                  : "border-border/60 text-muted-foreground hover:bg-white/[0.04]",
              )}
            >
              <Icon className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">{s.label}</span>
            </button>
          );
        })}
      </div>

      {value.scope === "categoria" ? (
        <Select
          value={value.teamId ?? ""}
          onValueChange={(v) => onChange({ ...value, teamId: v, userIds: [] })}
        >
          <SelectTrigger>
            <SelectValue placeholder="Elige la categoría" />
          </SelectTrigger>
          <SelectContent>
            {realTeams.map((t) => (
              <SelectItem key={t.id} value={t.id}>
                {t.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ) : null}

      {value.scope === "personas" ? (
        <>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar persona"
              className="pl-9"
            />
          </div>
          <div className="max-h-52 overflow-y-auto rounded-lg border border-border/60">
            {filtered.length === 0 ? (
              <div className="p-3 text-sm text-muted-foreground">Sin miembros</div>
            ) : (
              filtered.map((m) => {
                const selected = value.userIds.includes(m.id);
                return (
                  <button
                    type="button"
                    key={m.id}
                    onClick={() => toggle(m.id)}
                    className={cn(
                      "flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-white/[0.04]",
                      selected && "bg-white/[0.06]",
                    )}
                  >
                    <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center overflow-hidden rounded-full bg-white/10 text-[10px] font-semibold">
                      {m.avatar_url ? (
                        <img src={m.avatar_url} alt="" className="h-full w-full object-cover" />
                      ) : (
                        initialsOf(m.full_name, m.email)
                      )}
                    </span>
                    <span className="min-w-0 flex-1 truncate">
                      <span className="text-foreground">{m.full_name ?? m.email ?? "—"}</span>
                      {m.role_name ? (
                        <span className="ml-2 text-xs text-muted-foreground">{m.role_name}</span>
                      ) : null}
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
        </>
      ) : (
        <p className="text-xs text-muted-foreground">
          {value.scope === "club"
            ? `Se asigna a todo el club (${allIds.length} personas).`
            : value.teamId
              ? `Se asigna a los ${allIds.length} miembros de la categoría.`
              : "Elige una categoría."}
        </p>
      )}

      <p className="text-xs text-muted-foreground">Seleccionadas: {value.userIds.length}</p>
    </div>
  );
}

/** Deduce el alcance a partir de lo guardado (al editar). */
export function detectScope(teamId: string | null, userIds: string[]): AssignmentValue {
  if (teamId) return { scope: "categoria", teamId, userIds };
  return { scope: "personas", teamId: null, userIds };
}

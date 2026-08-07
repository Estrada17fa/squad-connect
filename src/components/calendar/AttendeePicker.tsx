import * as React from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Users, UserMinus } from "lucide-react";
import { useTeamMembers, type TeamMember } from "@/hooks/useTeamMembers";
import { cn } from "@/lib/utils";

interface Props {
  clubId: string;
  teamId: string | null;
  value: Set<string>;
  onChange: (next: Set<string>) => void;
  label?: string;
}

/**
 * Selector de convocados: búsqueda, selección individual y selección masiva
 * ("Convocar a todo el equipo" / "Quitar todos"). Compartido por el formulario de
 * eventos y el de sesiones de entrenamiento.
 */
export function AttendeePicker({ clubId, teamId, value, onChange, label = "Asistentes" }: Props) {
  const [search, setSearch] = React.useState("");
  const membersQ = useTeamMembers(teamId, clubId);
  const members = membersQ.data ?? [];

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

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-2">
        <Label>
          {label} ({value.size})
        </Label>
        <div className="flex items-center gap-1">
          <Button type="button" size="sm" variant="ghost" onClick={selectAll} disabled={!filtered.length}>
            <Users className="mr-1 h-3.5 w-3.5" />
            {search ? "Seleccionar resultados" : "Todo el equipo"}
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
    </div>
  );
}

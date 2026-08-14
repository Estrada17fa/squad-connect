import * as React from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useRoster } from "@/hooks/useRoster";
import { useTournamentGoals } from "@/hooks/useTournamentMatches";
import type { TournamentTeamRow } from "@/hooks/useTournaments";

interface Props {
  tournamentId: string;
  clubId: string;
  teamId: string | null;
  teams: TournamentTeamRow[];
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

/** Tabla de goleo del torneo, de mayor a menor. */
export function ScorersTable({ tournamentId, clubId, teamId, teams }: Props) {
  const goalsQ = useTournamentGoals(tournamentId);
  const rosterQ = useRoster(clubId, teamId);

  const rows = React.useMemo(() => {
    const map = new Map<
      string,
      { key: string; name: string; teamName: string; avatar: string | null; goals: number }
    >();
    for (const g of goalsQ.data ?? []) {
      const team = teams.find((t) => t.id === g.team_id);
      const member = g.player_user_id
        ? (rosterQ.data ?? []).find((m) => m.userId === g.player_user_id)
        : null;
      const name = member?.fullName ?? g.player_name ?? "Sin identificar";
      const key = `${g.team_id}:${g.player_user_id ?? name}`;
      const prev = map.get(key);
      if (prev) prev.goals += g.goals;
      else
        map.set(key, {
          key,
          name,
          teamName: team?.name ?? "Equipo",
          avatar: member?.avatarUrl ?? null,
          goals: g.goals,
        });
    }
    return [...map.values()].sort((a, b) => b.goals - a.goals || a.name.localeCompare(b.name, "es"));
  }, [goalsQ.data, rosterQ.data, teams]);

  if (goalsQ.isLoading) return <p className="text-sm text-muted-foreground">Cargando goleo…</p>;
  if (!rows.length) {
    return (
      <p className="text-sm text-muted-foreground">
        Aún no hay goleadores registrados. Se capturan junto con el resultado de cada partido.
      </p>
    );
  }

  return (
    <ul className="space-y-2">
      {rows.map((r, i) => (
        <li
          key={r.key}
          className="flex items-center gap-3 rounded-xl bg-white/[0.04] px-3 py-2 ring-1 ring-inset ring-white/5"
        >
          <span className="w-5 shrink-0 text-xs text-muted-foreground">{i + 1}</span>
          <Avatar className="h-8 w-8">
            {r.avatar ? <AvatarImage src={r.avatar} alt={r.name} /> : null}
            <AvatarFallback className="text-xs">{initials(r.name)}</AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{r.name}</p>
            <p className="truncate text-xs text-muted-foreground">{r.teamName}</p>
          </div>
          <span className="text-sm font-semibold">{r.goals}</span>
        </li>
      ))}
    </ul>
  );
}

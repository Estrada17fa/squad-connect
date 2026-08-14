import * as React from "react";
import { CalendarDays } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { EmptyState } from "@/components/squad/EmptyState";
import { MatchCardView } from "./MatchCardView";
import type { MatchRow } from "@/hooks/useTournamentMatches";
import type { TournamentTeamRow } from "@/hooks/useTournaments";

const ALL = "__all__";

interface Props {
  matches: MatchRow[];
  teams: TournamentTeamRow[];
  loading?: boolean;
}

/** Calendario del torneo en solo lectura: próximos destacados + jornadas. */
export function TournamentMatchesView({ matches, teams, loading }: Props) {
  const [matchday, setMatchday] = React.useState<string>(ALL);
  const [onlyOurs, setOnlyOurs] = React.useState<string>(ALL);

  const ourTeamIds = React.useMemo(
    () => new Set(teams.filter((t) => t.is_our_team).map((t) => t.id)),
    [teams],
  );

  const matchdays = React.useMemo(
    () =>
      [...new Set(matches.map((m) => m.matchday).filter((d): d is number => d != null))].sort(
        (a, b) => a - b,
      ),
    [matches],
  );

  const filtered = React.useMemo(
    () =>
      matches.filter((m) => {
        if (matchday !== ALL && String(m.matchday ?? "") !== matchday) return false;
        if (
          onlyOurs === "ours" &&
          !(ourTeamIds.has(m.home_team_id ?? "") || ourTeamIds.has(m.away_team_id ?? ""))
        )
          return false;
        return true;
      }),
    [matches, matchday, onlyOurs, ourTeamIds],
  );

  const upcoming = React.useMemo(() => {
    const now = Date.now();
    return filtered
      .filter((m) => m.status === "programado" && m.kickoff_at && new Date(m.kickoff_at).getTime() >= now)
      .sort((a, b) => (a.kickoff_at ?? "").localeCompare(b.kickoff_at ?? ""))
      .slice(0, 3);
  }, [filtered]);

  const groups = React.useMemo(() => {
    const map = new Map<string, MatchRow[]>();
    const sorted = [...filtered].sort(
      (a, b) => (a.matchday ?? 9999) - (b.matchday ?? 9999) ||
        (a.kickoff_at ?? "").localeCompare(b.kickoff_at ?? ""),
    );
    for (const m of sorted) {
      const key = m.matchday != null ? `Jornada ${m.matchday}` : "Sin jornada";
      map.set(key, [...(map.get(key) ?? []), m]);
    }
    return [...map.entries()];
  }, [filtered]);

  if (loading) return <p className="text-sm text-muted-foreground">Cargando partidos…</p>;

  if (!matches.length) {
    return (
      <EmptyState
        icon={CalendarDays}
        title="Sin partidos"
        message="Aún no hay partidos programados en este torneo."
      />
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-2">
        <Select value={matchday} onValueChange={setMatchday}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Jornada" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Todas las jornadas</SelectItem>
            {matchdays.map((d) => (
              <SelectItem key={d} value={String(d)}>
                Jornada {d}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {ourTeamIds.size ? (
          <Select value={onlyOurs} onValueChange={setOnlyOurs}>
            <SelectTrigger className="w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Todos los equipos</SelectItem>
              <SelectItem value="ours">Solo nuestro equipo</SelectItem>
            </SelectContent>
          </Select>
        ) : null}
      </div>

      {upcoming.length ? (
        <section className="space-y-2">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Próximos partidos
          </h3>
          <div className="space-y-2">
            {upcoming.map((m) => (
              <MatchCardView key={m.id} match={m} teams={teams} highlight />
            ))}
          </div>
        </section>
      ) : null}

      {groups.map(([label, rows]) => (
        <section key={label} className="space-y-2">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {label}
          </h3>
          <div className="space-y-2">
            {rows.map((m) => (
              <MatchCardView key={m.id} match={m} teams={teams} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TeamCrest } from "./TeamCrest";
import type { TournamentTeamRow } from "@/hooks/useTournaments";

export const TEAM_FILTER_ALL = "__all__";
export const TEAM_FILTER_OURS = "__ours__";

/** Filtro por cualquier equipo del torneo (no solo el nuestro). */
export function TeamFilterSelect({
  teams,
  value,
  onChange,
  className,
}: {
  teams: TournamentTeamRow[];
  value: string;
  onChange: (v: string) => void;
  className?: string;
}) {
  const hasOurs = teams.some((t) => t.is_our_team);
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className={className ?? "w-52"}>
        <SelectValue placeholder="Equipo" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={TEAM_FILTER_ALL}>Todos los equipos</SelectItem>
        {hasOurs ? <SelectItem value={TEAM_FILTER_OURS}>Nuestro equipo</SelectItem> : null}
        {teams.map((t) => (
          <SelectItem key={t.id} value={t.id}>
            <span className="flex items-center gap-2">
              <TeamCrest path={t.crest_path} name={t.name} className="h-4 w-4" />
              {t.name}
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

/** ¿El partido entra en el filtro seleccionado? */
export function matchesTeamFilter(
  filter: string,
  homeId: string | null,
  awayId: string | null,
  ourTeamIds: Set<string>,
): boolean {
  if (filter === TEAM_FILTER_ALL) return true;
  if (filter === TEAM_FILTER_OURS) {
    return ourTeamIds.has(homeId ?? "") || ourTeamIds.has(awayId ?? "");
  }
  return homeId === filter || awayId === filter;
}

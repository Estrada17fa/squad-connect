import * as React from "react";
import { CalendarDays, MapPin, Pencil, Plus, Shield, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { StatusBadge } from "@/components/squad/StatusBadge";
import { DeleteAction } from "@/components/squad/DeleteAction";
import { useDeleteMatch, type MatchRow } from "@/hooks/useTournamentMatches";
import type { TournamentTeamRow } from "@/hooks/useTournaments";
import { MATCH_STATUS_LABEL, matchPointsSummary, type MatchStatus, type PointsConfig } from "@/lib/torneo";
import { MatchFormDialog } from "./MatchFormDialog";
import { MatchdayFormDialog } from "./MatchdayFormDialog";
import { MatchResultSheet } from "./MatchResultSheet";

const ALL = "__all__";

interface Props {
  tournamentId: string;
  clubId: string;
  userId: string;
  teamId: string | null;
  config: PointsConfig;
  teams: TournamentTeamRow[];
  matches: MatchRow[];
  canEdit: boolean;
  loading?: boolean;
}

function formatKickoff(iso: string | null) {
  if (!iso) return null;
  return new Date(iso).toLocaleString("es-MX", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function MatchList({
  tournamentId,
  clubId,
  userId,
  teamId,
  config,
  teams,
  matches,
  canEdit,
  loading,
}: Props) {
  const [statusFilter, setStatusFilter] = React.useState<string>(ALL);
  const [matchdayFilter, setMatchdayFilter] = React.useState<string>(ALL);
  const [form, setForm] = React.useState<{ open: boolean; row: MatchRow | null }>({
    open: false,
    row: null,
  });
  const [dayForm, setDayForm] = React.useState(false);
  const [result, setResult] = React.useState<MatchRow | null>(null);

  const matchdays = React.useMemo(
    () =>
      [...new Set(matches.map((m) => m.matchday).filter((d): d is number => d != null))].sort(
        (a, b) => a - b,
      ),
    [matches],
  );

  const filtered = matches.filter((m) => {
    if (statusFilter !== ALL && m.status !== statusFilter) return false;
    if (matchdayFilter !== ALL && String(m.matchday ?? "") !== matchdayFilter) return false;
    return true;
  });

  const groups = React.useMemo(() => {
    const map = new Map<string, MatchRow[]>();
    for (const m of filtered) {
      const key = m.matchday != null ? `Jornada ${m.matchday}` : "Sin jornada";
      map.set(key, [...(map.get(key) ?? []), m]);
    }
    return [...map.entries()];
  }, [filtered]);

  // Mantiene sincronizado el partido abierto en la hoja de resultado.
  const resultRow = result ? matches.find((m) => m.id === result.id) ?? result : null;

  return (
    <div className="space-y-4">
      {canEdit ? (
        <div className="flex flex-wrap gap-2">
          <Button size="sm" onClick={() => setForm({ open: true, row: null })}>
            <Plus className="mr-2 h-3.5 w-3.5" /> Nuevo partido
          </Button>
          <Button size="sm" variant="secondary" onClick={() => setDayForm(true)}>
            <Plus className="mr-2 h-3.5 w-3.5" /> Jornada completa
          </Button>
        </div>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <Select value={matchdayFilter} onValueChange={setMatchdayFilter}>
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
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Estado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Todos los estados</SelectItem>
            {(Object.keys(MATCH_STATUS_LABEL) as MatchStatus[]).map((s) => (
              <SelectItem key={s} value={s}>
                {MATCH_STATUS_LABEL[s]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Cargando partidos…</p>
      ) : groups.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          {canEdit
            ? "Programa la primera jornada para empezar a capturar resultados."
            : "Aún no hay partidos programados."}
        </p>
      ) : (
        <div className="space-y-4">
          {groups.map(([label, rows]) => (
            <div key={label} className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {label}
              </p>
              {rows.map((m) => (
                <MatchCard
                  key={m.id}
                  match={m}
                  teams={teams}
                  config={config}
                  canEdit={canEdit}
                  onEdit={() => setForm({ open: true, row: m })}
                  onResult={() => setResult(m)}
                />
              ))}
            </div>
          ))}
        </div>
      )}

      <MatchFormDialog
        open={form.open}
        onOpenChange={(v) => setForm((s) => ({ ...s, open: v }))}
        clubId={clubId}
        userId={userId}
        tournamentId={tournamentId}
        teams={teams}
        match={form.row}
      />
      <MatchdayFormDialog
        open={dayForm}
        onOpenChange={setDayForm}
        clubId={clubId}
        userId={userId}
        tournamentId={tournamentId}
        teams={teams}
        defaultMatchday={(matchdays[matchdays.length - 1] ?? 0) + 1}
      />
      <MatchResultSheet
        open={!!resultRow}
        onOpenChange={(v) => {
          if (!v) setResult(null);
        }}
        match={resultRow}
        teams={teams}
        config={config}
        clubId={clubId}
        userId={userId}
        teamId={teamId}
      />
    </div>
  );
}

function MatchCard({
  match,
  teams,
  config,
  canEdit,
  onEdit,
  onResult,
}: {
  match: MatchRow;
  teams: TournamentTeamRow[];
  config: PointsConfig;
  canEdit: boolean;
  onEdit: () => void;
  onResult: () => void;
}) {
  const del = useDeleteMatch();
  const home = teams.find((t) => t.id === match.home_team_id);
  const away = teams.find((t) => t.id === match.away_team_id);
  const played = match.status === "jugado" && match.home_goals != null;
  const summary = played
    ? matchPointsSummary(
        config,
        {
          home_team_id: match.home_team_id ?? "",
          away_team_id: match.away_team_id ?? "",
          home_goals: match.home_goals,
          away_goals: match.away_goals,
          status: match.status,
          shootout_winner_team_id: match.shootout_winner_team_id,
        },
        home?.short_name ?? home?.name ?? "Local",
        away?.short_name ?? away?.name ?? "Visitante",
      )
    : null;
  const when = formatKickoff(match.kickoff_at);

  return (
    <div className="rounded-xl bg-white/[0.04] p-3 ring-1 ring-inset ring-white/5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 text-sm">
            <Shield className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            <span className="truncate font-medium">{home?.name ?? "Por definir"}</span>
            <span className="shrink-0 font-semibold">
              {played ? `${match.home_goals} - ${match.away_goals}` : "vs"}
            </span>
            <span className="truncate font-medium">{away?.name ?? "Por definir"}</span>
          </div>
          <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
            {when ? (
              <span className="inline-flex items-center gap-1">
                <CalendarDays className="h-3 w-3" /> {when}
              </span>
            ) : null}
            {match.venue ? (
              <span className="inline-flex items-center gap-1">
                <MapPin className="h-3 w-3" /> {match.venue}
              </span>
            ) : null}
          </div>
          {summary ? <p className="mt-1.5 text-xs text-muted-foreground">{summary}</p> : null}
        </div>
        <StatusBadge
          variant={
            match.status === "jugado" ? "approved" : match.status === "suspendido" ? "rejected" : "neutral"
          }
        >
          {MATCH_STATUS_LABEL[match.status]}
        </StatusBadge>
      </div>

      {canEdit ? (
        <div className="mt-2 flex flex-wrap gap-1.5">
          <Button size="sm" variant="secondary" onClick={onResult}>
            <Trophy className="mr-1.5 h-3.5 w-3.5" />
            {played ? "Editar resultado" : "Registrar resultado"}
          </Button>
          <Button size="sm" variant="ghost" onClick={onEdit}>
            <Pencil className="mr-1.5 h-3.5 w-3.5" /> Editar
          </Button>
          <DeleteAction
            label="Eliminar"
            title="Eliminar partido"
            description="Se eliminarán también los goleadores registrados."
            successMessage="Partido eliminado"
            loading={del.isPending}
            onDelete={() => del.mutateAsync(match)}
          />
        </div>
      ) : null}
    </div>
  );
}

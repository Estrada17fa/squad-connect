import * as React from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Settings2, Trophy } from "lucide-react";
import { PageHeader } from "@/components/squad/PageHeader";
import { ModuleTabs } from "@/components/squad/ModuleTabs";
import { EmptyState } from "@/components/squad/EmptyState";
import { StatusBadge } from "@/components/squad/StatusBadge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useApp } from "@/components/squad/AppLayout";
import { useTeamAccess } from "@/hooks/useTeamAccess";
import { useTournaments, useTournamentTeams } from "@/hooks/useTournaments";
import { useTournamentMatches } from "@/hooks/useTournamentMatches";
import { TournamentMatchesView } from "@/components/torneo/TournamentMatchesView";
import { BracketView } from "@/components/torneo/BracketView";
import { TournamentLogo } from "@/components/torneo/TournamentLogo";
import { useTournamentTies } from "@/hooks/useTournamentPlayoffs";
import { StandingsTable } from "@/components/admin/StandingsTable";
import { ScorersTable } from "@/components/admin/ScorersTable";
import {
  buildStandings,
  groupLabels,
  TOURNAMENT_STATUS_LABEL,
  TOURNAMENT_TYPE_LABEL,
} from "@/lib/torneo";


export const Route = createFileRoute("/_authenticated/m/torneo")({
  head: () => ({
    meta: [
      { title: "Squad — Torneo" },
      {
        name: "description",
        content: "Calendario, tabla de posiciones y goleo del torneo de tu categoría.",
      },
      { property: "og:title", content: "Squad — Torneo" },
      {
        property: "og:description",
        content: "Calendario, tabla de posiciones y goleo del torneo de tu categoría.",
      },
    ],
  }),
  component: TorneoPage,
});

function TorneoPage() {
  const { profile, user, isSuperAdmin } = useApp();
  const clubId = profile?.club_id ?? null;
  const userId = user?.id ?? "";
  const { canReadTeam, canEditTeam } = useTeamAccess("torneo");

  const tournamentsQ = useTournaments(clubId);
  const visible = React.useMemo(
    () => (tournamentsQ.data ?? []).filter((t) => canReadTeam(t.team_id)),
    [tournamentsQ.data, canReadTeam],
  );

  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  const current = visible.find((t) => t.id === selectedId) ?? visible[0] ?? null;

  const teamsQ = useTournamentTeams(current?.id ?? null);
  const matchesQ = useTournamentMatches(current?.id ?? null);
  const tiesQ = useTournamentTies(current?.has_playoffs ? current.id : null);
  const teams = teamsQ.data ?? [];
  const matches = matchesQ.data ?? [];

  const groups = React.useMemo(
    () => (current?.format === "grupos" ? groupLabels(current.groups_count) : []),
    [current?.format, current?.groups_count],
  );

  const ourRow = React.useMemo(() => {
    if (!current || !teams.length) return null;
    const ourGroup = teams.find((t) => t.is_our_team)?.group_label ?? null;
    const scoped = groups.length
      ? teams.filter((t) => (t.group_label ?? null) === ourGroup)
      : teams;
    const ids = new Set(scoped.map((t) => t.id));
    const rows = buildStandings(
      current,
      scoped.map((t) => ({
        id: t.id,
        name: t.name,
        is_our_team: t.is_our_team,
        crest_path: t.crest_path,
      })),
      matches
        .filter(
          (m) => !m.tie_id && ids.has(m.home_team_id ?? "") && ids.has(m.away_team_id ?? ""),
        )
        .map((m) => ({
          home_team_id: m.home_team_id ?? "",
          away_team_id: m.away_team_id ?? "",
          home_goals: m.home_goals,
          away_goals: m.away_goals,
          status: m.status,
          shootout_winner_team_id: m.shootout_winner_team_id,
        })),
      [],
    );
    return rows.find((r) => r.is_our_team) ?? null;
  }, [current, teams, matches, groups.length]);

  const canManage = current ? canEditTeam(current.team_id) : false;


  return (
    <div className="space-y-6">
      <PageHeader hideTitle title="Torneo" subtitle="Calendario, posiciones y goleo" />
      <ModuleTabs activeKey="torneo" />

      {tournamentsQ.isLoading ? (
        <p className="text-sm text-muted-foreground">Cargando torneos…</p>
      ) : !visible.length ? (
        <EmptyState
          icon={Trophy}
          title="Sin torneos"
          message="Aún no hay torneos registrados para tus categorías."
        />
      ) : (
        <div className="space-y-4">
          {visible.length > 1 ? (
            <Select value={current?.id ?? ""} onValueChange={setSelectedId}>
              <SelectTrigger className="w-full sm:w-80">
                <SelectValue placeholder="Elige torneo" />
              </SelectTrigger>
              <SelectContent>
                {visible.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.team_name ? `${t.team_name} · ` : ""}
                    {t.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : null}

          {current ? (
            <>
              <section className="rounded-2xl bg-white/[0.04] p-4 ring-1 ring-inset ring-white/5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <TournamentLogo path={current.logo_path} name={current.name} />
                    <div className="min-w-0">
                      <h2 className="truncate text-lg font-semibold">{current.name}</h2>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {[
                          current.team_name,
                          TOURNAMENT_TYPE_LABEL[current.type],
                          current.season,
                        ]
                          .filter(Boolean)
                          .join(" · ")}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <StatusBadge variant={current.status === "finalizado" ? "neutral" : "approved"}>
                      {TOURNAMENT_STATUS_LABEL[current.status]}
                    </StatusBadge>
                    {canManage || isSuperAdmin ? (
                      <Button asChild size="sm" variant="ghost">
                        <Link to="/admin/torneo">
                          <Settings2 className="mr-1.5 h-3.5 w-3.5" /> Gestionar
                        </Link>
                      </Button>
                    ) : null}
                  </div>
                </div>

                {ourRow ? (
                  <div className="mt-3 grid grid-cols-4 gap-2 text-center">
                    <Tile value={`${ourRow.position}°`} label="Posición" />
                    <Tile value={ourRow.points} label="Puntos" />
                    <Tile value={ourRow.played} label="Jugados" />
                    <Tile
                      value={ourRow.goal_diff > 0 ? `+${ourRow.goal_diff}` : ourRow.goal_diff}
                      label="Dif. goles"
                    />
                  </div>
                ) : null}
              </section>

              <Tabs defaultValue="partidos">
                <TabsList className="w-full justify-start overflow-x-auto">
                  <TabsTrigger value="partidos">Partidos</TabsTrigger>
                  <TabsTrigger value="posiciones">Posiciones</TabsTrigger>
                  <TabsTrigger value="goleo">Goleo</TabsTrigger>
                </TabsList>

                <TabsContent value="partidos" className="pt-4">
                  <TournamentMatchesView
                    matches={matches}
                    teams={teams}
                    loading={matchesQ.isLoading}
                  />
                </TabsContent>

                <TabsContent value="posiciones" className="pt-4">
                  <StandingsTable
                    tournamentId={current.id}
                    clubId={clubId ?? ""}
                    userId={userId}
                    config={current}
                    teams={teams}
                    matches={matches}
                    canEdit={false}
                  />
                </TabsContent>

                <TabsContent value="goleo" className="pt-4">
                  <ScorersTable
                    tournamentId={current.id}
                    clubId={clubId ?? ""}
                    teamId={current.team_id}
                    teams={teams}
                  />
                </TabsContent>
              </Tabs>
            </>
          ) : null}
        </div>
      )}
    </div>
  );
}

function Tile({ value, label }: { value: React.ReactNode; label: string }) {
  return (
    <div className="rounded-xl bg-white/[0.04] px-2 py-2 ring-1 ring-inset ring-white/5">
      <p className="text-lg font-semibold tabular-nums">{value}</p>
      <p className="text-[11px] text-muted-foreground">{label}</p>
    </div>
  );
}

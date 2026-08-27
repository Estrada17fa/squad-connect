import * as React from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Volleyball } from "lucide-react";
import { PageHeader } from "@/components/squad/PageHeader";
import { ModuleTabs } from "@/components/squad/ModuleTabs";
import { EmptyState } from "@/components/squad/EmptyState";
import { CardGridSkeleton } from "@/components/squad/LoadingState";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TeamFilter } from "@/components/squad/TeamFilter";
import { useApp } from "@/components/squad/AppLayout";
import { useTeamFilter } from "@/hooks/useTeamFilter";
import { useTeamAccess } from "@/hooks/useTeamAccess";
import {
  useMatchCallups,
  useMatchLogistics,
  useOurMatches,
  type OurMatch,
} from "@/hooks/useMatchOps";
import { MatchOpsCard } from "@/components/partidos/MatchOpsCard";
import { MatchOpsSheet } from "@/components/partidos/MatchOpsSheet";

export const Route = createFileRoute("/_authenticated/m/partidos")({
  validateSearch: (search: Record<string, unknown>) => ({
    open: typeof search.open === "string" ? search.open : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Squad — Partidos" },
      {
        name: "description",
        content: "Convocatoria, citación y logística de los partidos de nuestros equipos.",
      },
      { property: "og:title", content: "Squad — Partidos" },
      {
        property: "og:description",
        content: "Gestiona convocados, hora de citación, punto de reunión y notas de cada partido.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: PartidosPage,
});

function PartidosPage() {
  const { profile, user, teamOptions, isSuperAdmin, accessibleModules } = useApp();
  const navigate = useNavigate();
  const { open: openParam } = Route.useSearch();
  const clubId = profile?.club_id ?? null;
  const userId = user?.id ?? "";
  const canAccess = isSuperAdmin || accessibleModules.includes("partidos");
  const { canEditTeam, canReadTeam, isPlayerScoped } = useTeamAccess("partidos");

  const [view, setView] = React.useState<"proximos" | "jugados">("proximos");
  const [teamId, setTeamId] = useTeamFilter();
  const [openId, setOpenId] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (openParam) setOpenId(openParam);
  }, [openParam]);

  const closeSheet = React.useCallback(() => {
    setOpenId(null);
    if (openParam) navigate({ to: "/m/partidos", search: () => ({ open: undefined }), replace: true });
  }, [openParam, navigate]);

  const matchesQ = useOurMatches(canAccess ? clubId : null);
  const allMatches = matchesQ.data ?? [];
  const matchIds = React.useMemo(() => allMatches.map((m) => m.id), [allMatches]);
  const callupsQ = useMatchCallups(matchIds);
  const logisticsQ = useMatchLogistics(matchIds);

  const callupsByMatch = React.useMemo(() => {
    const map = new Map<string, typeof callupsQ.data extends undefined ? never : NonNullable<typeof callupsQ.data>>();
    for (const c of callupsQ.data ?? []) {
      const list = map.get(c.match_id) ?? [];
      list.push(c);
      map.set(c.match_id, list);
    }
    return map;
  }, [callupsQ.data]);

  const logisticsByMatch = React.useMemo(() => {
    const map = new Map<string, NonNullable<typeof logisticsQ.data>[number]>();
    for (const l of logisticsQ.data ?? []) map.set(l.match_id, l);
    return map;
  }, [logisticsQ.data]);

  /** Visibilidad: por categoría; en vista jugador, solo donde está convocado. */
  const visible = React.useMemo(
    () =>
      allMatches.filter((m) => {
        if (!canReadTeam(m.tournament_team_id)) return false;
        if (isPlayerScoped(m.tournament_team_id)) {
          return (callupsByMatch.get(m.id) ?? []).some((c) => c.user_id === userId);
        }
        return true;
      }),
    [allMatches, canReadTeam, isPlayerScoped, callupsByMatch, userId],
  );

  const filtered = teamId ? visible.filter((m) => m.tournament_team_id === teamId) : visible;
  const now = Date.now();
  const upcoming = filtered.filter(
    (m) => m.status !== "jugado" && (!m.kickoff_at || new Date(m.kickoff_at).getTime() >= now - 3 * 3600_000),
  );
  const played = filtered
    .filter((m) => !upcoming.includes(m))
    .sort((a, b) => (b.kickoff_at ?? "").localeCompare(a.kickoff_at ?? ""));

  const open = allMatches.find((m) => m.id === openId) ?? null;
  const loading = matchesQ.isLoading || callupsQ.isLoading;

  if (!canAccess) {
    return (
      <div className="space-y-4">
        <ModuleTabs activeKey="partidos" />
        <PageHeader hideTitle title="Partidos" subtitle="Convocatoria y logística" />
        <EmptyState icon={Volleyball} title="Sin acceso" message="Tu rol actual no tiene permisos para este módulo." />
      </div>
    );
  }

  function renderList(list: OurMatch[], emptyMsg: string, highlightFirst = false) {
    if (loading) return <CardGridSkeleton />;
    if (!list.length) return <EmptyState icon={Volleyball} title="Sin partidos" message={emptyMsg} />;
    return (
      <div className="space-y-3">
        {list.map((m, i) => (
          <MatchOpsCard
            key={m.id}
            match={m}
            callupCount={(callupsByMatch.get(m.id) ?? []).length}
            highlight={highlightFirst && i === 0}
            onOpen={() => setOpenId(m.id)}
          />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <ModuleTabs activeKey="partidos" />
      <PageHeader hideTitle title="Partidos" subtitle="Nuestros partidos: convocatoria y logística" />

      <TeamFilter teams={teamOptions} value={teamId} onChange={setTeamId} />

      <Tabs value={view} onValueChange={(v) => setView(v as typeof view)}>
        <TabsList>
          <TabsTrigger value="proximos">Próximos ({upcoming.length})</TabsTrigger>
          <TabsTrigger value="jugados">Jugados ({played.length})</TabsTrigger>
        </TabsList>
        <TabsContent value="proximos" className="mt-4">
          {renderList(upcoming, "No hay partidos programados para nuestros equipos.", true)}
        </TabsContent>
        <TabsContent value="jugados" className="mt-4">
          {renderList(played, "Todavía no hay partidos jugados.")}
        </TabsContent>
      </Tabs>

      <MatchOpsSheet
        open={!!open}
        onOpenChange={(v) => {
          if (!v) closeSheet();
        }}
        match={open}
        callups={open ? callupsByMatch.get(open.id) ?? [] : []}
        logistics={open ? logisticsByMatch.get(open.id) ?? null : null}
        clubId={clubId}
        userId={userId}
        canEdit={!!open && canEditTeam(open.tournament_team_id)}
      />
    </div>
  );
}

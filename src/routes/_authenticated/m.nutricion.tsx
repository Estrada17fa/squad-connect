import * as React from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Apple, Ruler, UtensilsCrossed } from "lucide-react";
import { PageHeader } from "@/components/squad/PageHeader";
import { ModuleTabs } from "@/components/squad/ModuleTabs";
import { EmptyState } from "@/components/squad/EmptyState";
import { CardGridSkeleton } from "@/components/squad/LoadingState";
import { StatusBadge } from "@/components/squad/StatusBadge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useApp } from "@/components/squad/AppLayout";
import { useTeamAccess } from "@/hooks/useTeamAccess";
import {
  useAnthroAssessments,
  useMealPlans,
  useNutritionRoster,
  type AssessmentRow,
  type MealPlanRow,
  type NutritionRosterMember,
} from "@/hooks/useNutrition";
import { MealPlanFormDialog } from "@/components/nutricion/MealPlanFormDialog";
import { AnthropometryFormDialog } from "@/components/nutricion/AnthropometryFormDialog";
import {
  PlayerNutritionContent,
  PlayerNutritionSheet,
  type NutritionPlayer,
} from "@/components/nutricion/PlayerNutritionSheet";
import {
  EMPTY_NUTRICION_FILTERS,
  NutricionFilters,
  type NutricionFilterState,
} from "@/components/nutricion/NutricionFilters";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EquivalencesTab } from "@/components/nutricion/EquivalencesTab";
import { RecipesTab } from "@/components/nutricion/RecipesTab";
import { formatShortDay, isCurrentWeek } from "@/lib/nutricion";

export const Route = createFileRoute("/_authenticated/m/nutricion")({
  head: () => ({
    meta: [
      { title: "Squad — Nutrición" },
      {
        name: "description",
        content: "Menús semanales por jugador y estudios antropométricos ISAK del club.",
      },
      { property: "og:title", content: "Squad — Nutrición" },
      {
        property: "og:description",
        content: "Plan de alimentación individual, porciones por comida y evolución antropométrica.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: NutricionPage,
});

function NutricionPage() {
  const { profile, user, isSuperAdmin, accessibleModules, teamOptions } = useApp();
  const clubId = profile?.club_id ?? null;
  const canAccess = isSuperAdmin || accessibleModules.includes("nutricion");
  const { canEditTeam, canReadTeam, onlyOwnRows } = useTeamAccess("nutricion");

  const rosterQ = useNutritionRoster(canAccess ? clubId : null);
  const plansQ = useMealPlans(canAccess ? clubId : null);
  const assessQ = useAnthroAssessments(canAccess ? clubId : null);

  const [filters, setFilters] = React.useState<NutricionFilterState>(EMPTY_NUTRICION_FILTERS);
  const [detailPlayer, setDetailPlayer] = React.useState<NutritionPlayer | null>(null);
  const [planOpen, setPlanOpen] = React.useState(false);
  const [editingPlan, setEditingPlan] = React.useState<MealPlanRow | null>(null);
  const [duplicatePlan, setDuplicatePlan] = React.useState<MealPlanRow | null>(null);
  const [assessOpen, setAssessOpen] = React.useState(false);
  const [editingAssessment, setEditingAssessment] = React.useState<AssessmentRow | null>(null);
  const [formPlayer, setFormPlayer] = React.useState<string | null>(null);

  /** Jugadores visibles: 'vista_jugador' solo se ve a sí mismo. */
  const roster = React.useMemo(
    () =>
      (rosterQ.data ?? []).filter(
        (p) => canReadTeam(p.teamId) && (!onlyOwnRows(p.teamId) || p.userId === user.id),
      ),
    [rosterQ.data, canReadTeam, onlyOwnRows, user.id],
  );

  const editablePlayers = React.useMemo(
    () => roster.filter((p) => canEditTeam(p.teamId)),
    [roster, canEditTeam],
  );

  /** La guía y las recetas son del club: las edita cualquier editor de nutrición. */
  const canEditClub = isSuperAdmin || editablePlayers.length > 0 || canEditTeam(null);


  const myRow = roster.find((p) => p.userId === user.id) ?? null;
  const isPlayerOnlyView = roster.length > 0 && roster.every((p) => p.userId === user.id);

  const currentPlanByUser = React.useMemo(() => {
    const m = new Map<string, MealPlanRow>();
    for (const p of plansQ.data ?? []) {
      if (isCurrentWeek(p.week_start, p.week_end) && !m.has(p.player_user_id))
        m.set(p.player_user_id, p);
    }
    return m;
  }, [plansQ.data]);

  const lastAssessmentByUser = React.useMemo(() => {
    const m = new Map<string, AssessmentRow>();
    for (const a of assessQ.data ?? []) if (!m.has(a.player_user_id)) m.set(a.player_user_id, a);
    return m;
  }, [assessQ.data]);

  const teamChoices = React.useMemo(
    () => teamOptions.filter((t) => !!t.id).map((t) => ({ id: t.id as string, name: t.name })),
    [teamOptions],
  );

  const q = filters.search.trim().toLowerCase();
  const filtered = roster.filter((p) => {
    if (filters.teamId && filters.teamId !== p.teamId) return false;
    if (q && !(p.fullName ?? "").toLowerCase().includes(q)) return false;
    if (filters.seguimiento === "con_plan" && !currentPlanByUser.has(p.userId)) return false;
    if (filters.seguimiento === "sin_plan" && currentPlanByUser.has(p.userId)) return false;
    if (filters.seguimiento === "sin_estudio" && lastAssessmentByUser.has(p.userId)) return false;
    return true;
  });

  const toPlayer = (p: NutritionRosterMember): NutritionPlayer => ({
    userId: p.userId,
    teamId: p.teamId,
    fullName: p.fullName,
    avatarUrl: p.avatarUrl,
    teamName: p.teamName,
    position: p.position,
  });

  const openNewPlan = (playerUserId?: string | null) => {
    setEditingPlan(null);
    setDuplicatePlan(null);
    setFormPlayer(playerUserId ?? null);
    setPlanOpen(true);
  };

  const openNewAssessment = (playerUserId?: string | null) => {
    setEditingAssessment(null);
    setFormPlayer(playerUserId ?? null);
    setAssessOpen(true);
  };

  if (!canAccess) {
    return (
      <div className="space-y-6">
        <ModuleTabs activeKey="nutricion" />
        <PageHeader hideTitle title="Nutrición" subtitle="Planes de alimentación y antropometría" />
        <EmptyState
          icon={Apple}
          title="Sin acceso"
          message="Tu rol no tiene acceso al módulo de Nutrición."
        />
      </div>
    );
  }

  const dialogs = clubId ? (
    <>
      <MealPlanFormDialog
        open={planOpen}
        onOpenChange={(v) => {
          setPlanOpen(v);
          if (!v) {
            setEditingPlan(null);
            setDuplicatePlan(null);
          }
        }}
        clubId={clubId}
        userId={user.id}
        players={editablePlayers}
        plan={editingPlan}
        duplicateFrom={duplicatePlan}
        fixedPlayerUserId={editingPlan ? null : formPlayer}
      />
      <AnthropometryFormDialog
        open={assessOpen}
        onOpenChange={(v) => {
          setAssessOpen(v);
          if (!v) setEditingAssessment(null);
        }}
        clubId={clubId}
        userId={user.id}
        players={editablePlayers}
        assessment={editingAssessment}
        fixedPlayerUserId={editingAssessment ? null : formPlayer}
      />
    </>
  ) : null;

  /* ----------------------------- Mi Nutrición ----------------------------- */
  if (isPlayerOnlyView && myRow) {
    return (
      <div className="space-y-6">
        <ModuleTabs activeKey="nutricion" />
        <PageHeader hideTitle title="Mi Nutrición" subtitle="Tu menú de la semana y tus medidas" />
        <Tabs defaultValue="plan">
          <TabsList>
            <TabsTrigger value="plan">Mi plan</TabsTrigger>
            <TabsTrigger value="guia">Guía de porciones</TabsTrigger>
            <TabsTrigger value="recetas">Recetas</TabsTrigger>
          </TabsList>
          <TabsContent value="plan" className="mt-4">
            <PlayerNutritionContent player={toPlayer(myRow)} clubId={clubId} canEdit={false} self />
          </TabsContent>
          <TabsContent value="guia" className="mt-4">
            {clubId ? <EquivalencesTab clubId={clubId} userId={user.id} canEdit={false} /> : null}
          </TabsContent>
          <TabsContent value="recetas" className="mt-4">
            {clubId ? <RecipesTab clubId={clubId} userId={user.id} canEdit={false} /> : null}
          </TabsContent>
        </Tabs>
        {dialogs}
      </div>
    );
  }


  /* -------------------------------- Panel --------------------------------- */
  return (
    <div className="space-y-6">
      <ModuleTabs activeKey="nutricion" />
      <PageHeader hideTitle title="Nutrición" subtitle="Planes de alimentación y antropometría" />

      <Tabs defaultValue="jugadores">
        <TabsList>
          <TabsTrigger value="jugadores">Jugadores</TabsTrigger>
          <TabsTrigger value="guia">Guía de porciones</TabsTrigger>
          <TabsTrigger value="recetas">Recetas</TabsTrigger>
        </TabsList>

        <TabsContent value="jugadores" className="mt-4 space-y-4">
          {editablePlayers.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              <Button className="glow-primary" onClick={() => openNewPlan(null)}>
                Nuevo plan semanal
              </Button>
              <Button variant="secondary" onClick={() => openNewAssessment(null)}>
                Registrar estudio
              </Button>
            </div>
          ) : null}

          <NutricionFilters
            value={filters}
            onChange={setFilters}
            teams={teamChoices}
            count={filtered.length}
          />

          {rosterQ.isLoading ? (
            <CardGridSkeleton count={4} />
          ) : filtered.length === 0 ? (
            <EmptyState
              icon={Apple}
              title="Sin jugadores"
              message="No hay jugadores con esos filtros en las categorías donde tienes acceso a Nutrición."
            />
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {filtered.map((p) => {
                const plan = currentPlanByUser.get(p.userId);
                const last = lastAssessmentByUser.get(p.userId);
                return (
                  <button
                    key={p.playerId}
                    type="button"
                    onClick={() => setDetailPlayer(toPlayer(p))}
                    className="glass flex items-start gap-3 p-4 text-left transition-all hover:border-white/15 hover:bg-white/[0.06] active:scale-[0.99]"
                  >
                    <Avatar className="h-12 w-12 shrink-0">
                      <AvatarImage src={p.avatarUrl ?? undefined} alt="" />
                      <AvatarFallback>{(p.fullName ?? "?").slice(0, 1).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1 space-y-1">
                      <p className="truncate font-display font-semibold text-foreground">
                        {p.fullName ?? "—"}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {p.teamName ?? "—"}
                        {p.position ? ` · ${p.position}` : ""}
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        <StatusBadge variant={plan ? "approved" : "neutral"}>
                          {plan ? plan.week_type : "Sin plan esta semana"}
                        </StatusBadge>
                      </div>
                      <p className="flex items-center gap-1.5 truncate text-xs text-muted-foreground">
                        <Ruler className="h-3.5 w-3.5 shrink-0" />
                        {last
                          ? `${last.body_mass_kg != null ? `${Number(last.body_mass_kg)} kg · ` : ""}${formatShortDay(last.assessed_at)}`
                          : "Sin estudio antropométrico"}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="guia" className="mt-4">
          {clubId ? (
            <EquivalencesTab clubId={clubId} userId={user.id} canEdit={canEditClub} />
          ) : null}
        </TabsContent>

        <TabsContent value="recetas" className="mt-4">
          {clubId ? <RecipesTab clubId={clubId} userId={user.id} canEdit={canEditClub} /> : null}
        </TabsContent>
      </Tabs>


      {detailPlayer ? (
        <PlayerNutritionSheet
          open={!!detailPlayer}
          onOpenChange={(v) => !v && setDetailPlayer(null)}
          player={detailPlayer}
          canEdit={canEditTeam(detailPlayer.teamId)}
          onNewPlan={() => openNewPlan(detailPlayer.userId)}
          onEditPlan={(p) => {
            setDuplicatePlan(null);
            setEditingPlan(p);
            setPlanOpen(true);
          }}
          onDuplicatePlan={(p) => {
            setEditingPlan(null);
            setDuplicatePlan(p);
            setFormPlayer(p.player_user_id);
            setPlanOpen(true);
          }}
          onNewAssessment={() => openNewAssessment(detailPlayer.userId)}
          onEditAssessment={(a) => {
            setEditingAssessment(a);
            setAssessOpen(true);
          }}
        />
      ) : null}

      {dialogs}
    </div>
  );
}

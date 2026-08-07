import * as React from "react";
import { createFileRoute } from "@tanstack/react-router";
import { AlertTriangle, HeartPulse, Plus, Search, Stethoscope } from "lucide-react";
import { PageHeader } from "@/components/squad/PageHeader";
import { ModuleTabs } from "@/components/squad/ModuleTabs";
import { EmptyState } from "@/components/squad/EmptyState";
import { CardGridSkeleton } from "@/components/squad/LoadingState";
import { StandardCard } from "@/components/squad/StandardCard";
import { StatusBadge, type StatusVariant } from "@/components/squad/StatusBadge";
import { TeamFilter, TeamBadge } from "@/components/squad/TeamFilter";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useApp } from "@/components/squad/AppLayout";
import { useTeamAccess } from "@/hooks/useTeamAccess";
import { formatDateTime } from "@/lib/calendar-utils";
import {
  INJURY_STATUS_LABEL,
  SEVERITY_LABEL,
  daysToReturn,
  useCheckups,
  useInjuries,
  useMedicalRoster,
  type CheckupRow,
  type InjuryRow,
  type MedicalRosterMember,
} from "@/hooks/useHealth";
import { CheckupFormDialog } from "@/components/salud/CheckupFormDialog";
import { InjuryFormDialog } from "@/components/salud/InjuryFormDialog";
import { InjuryDetailSheet, INJURY_STATUS_VARIANT } from "@/components/salud/InjuryDetailSheet";
import { CheckupDetailSheet } from "@/components/salud/CheckupDetailSheet";
import { PlayerMedicalSheet } from "@/components/salud/PlayerMedicalSheet";
import { AVAILABILITY_META } from "./m.plantel";

export const Route = createFileRoute("/_authenticated/m/salud")({
  head: () => ({
    meta: [
      { title: "Squad — Salud" },
      { name: "description", content: "Parte médico, revisiones y lesiones del equipo." },
      { property: "og:title", content: "Squad — Salud" },
      { property: "og:description", content: "Expedientes médicos, revisiones y seguimiento de lesiones." },
    ],
  }),
  component: SaludPage,
});

type SubView = "plantel" | "revisiones" | "lesiones";

function SaludPage() {
  const { profile, user, teamOptions, isSuperAdmin, accessibleModules } = useApp();
  const clubId = profile?.club_id ?? null;
  const canAccess = isSuperAdmin || accessibleModules.includes("salud");
  const { canEditTeam, canReadTeam } = useTeamAccess("salud");

  const [view, setView] = React.useState<SubView>("plantel");
  const [teamFilter, setTeamFilter] = React.useState<string | null>(null);
  const [search, setSearch] = React.useState("");
  const [checkupOpen, setCheckupOpen] = React.useState(false);
  const [editingCheckup, setEditingCheckup] = React.useState<CheckupRow | null>(null);
  const [injuryOpen, setInjuryOpen] = React.useState(false);
  const [editingInjury, setEditingInjury] = React.useState<InjuryRow | null>(null);
  const [detailInjury, setDetailInjury] = React.useState<InjuryRow | null>(null);
  const [detailCheckup, setDetailCheckup] = React.useState<CheckupRow | null>(null);
  const [detailPlayer, setDetailPlayer] = React.useState<MedicalRosterMember | null>(null);

  const rosterQ = useMedicalRoster(canAccess ? clubId : null);
  const checkupsQ = useCheckups(canAccess ? clubId : null);
  const injuriesQ = useInjuries(canAccess ? clubId : null);

  // Solo equipos donde el usuario tiene algún nivel en 'salud'.
  const roster = React.useMemo(
    () => (rosterQ.data ?? []).filter((p) => canReadTeam(p.teamId)),
    [rosterQ.data, canReadTeam],
  );
  const editablePlayers = React.useMemo(
    () => roster.filter((p) => canEditTeam(p.teamId)),
    [roster, canEditTeam],
  );
  const canEditAny = editablePlayers.length > 0;

  const injuries = injuriesQ.data ?? [];
  const openInjuryByUser = React.useMemo(() => {
    const m = new Map<string, InjuryRow>();
    for (const i of injuries) {
      if (i.status !== "recuperada" && !m.has(i.player_user_id)) m.set(i.player_user_id, i);
    }
    return m;
  }, [injuries]);

  const matchTeam = (teamId: string) => !teamFilter || teamFilter === teamId;
  const q = search.trim().toLowerCase();

  const filteredRoster = roster.filter(
    (p) => matchTeam(p.teamId) && (!q || (p.fullName ?? "").toLowerCase().includes(q)),
  );
  const filteredCheckups = (checkupsQ.data ?? []).filter(
    (c) => matchTeam(c.team_id) && (!q || (c.player?.full_name ?? "").toLowerCase().includes(q)),
  );
  const filteredInjuries = injuries.filter(
    (i) => matchTeam(i.team_id) && (!q || (i.player?.full_name ?? "").toLowerCase().includes(q)),
  );

  const alerts = injuries.filter((i) => {
    if (i.status === "recuperada") return false;
    const d = daysToReturn(i);
    return d != null && d <= 3;
  });

  if (!canAccess) {
    return (
      <div className="space-y-6">
        <ModuleTabs activeKey="salud" />
        <PageHeader hideTitle title="Salud" subtitle="Parte médico y lesiones" />
        <EmptyState
          icon={HeartPulse}
          title="Sin acceso"
          message="Tu rol actual no tiene permisos para este módulo."
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <ModuleTabs activeKey="salud" />
      <PageHeader hideTitle title="Salud" subtitle="Parte médico y lesiones" />
      <TeamFilter teams={teamOptions} value={teamFilter} onChange={setTeamFilter} />

      <Tabs value={view} onValueChange={(v) => setView(v as SubView)} className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="plantel">Plantel médico</TabsTrigger>
          <TabsTrigger value="revisiones">Revisiones</TabsTrigger>
          <TabsTrigger value="lesiones">Lesiones</TabsTrigger>
        </TabsList>

        {canEditAny && view !== "plantel" ? (
          <Button
            className="w-full glow-primary"
            onClick={() => {
              if (view === "revisiones") {
                setEditingCheckup(null);
                setCheckupOpen(true);
              } else {
                setEditingInjury(null);
                setInjuryOpen(true);
              }
            }}
          >
            <Plus className="mr-2 h-4 w-4" />
            {view === "revisiones" ? "Registrar revisión" : "Registrar lesión"}
          </Button>
        ) : null}

        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar jugador…"
            className="pl-9"
          />
        </div>

        {alerts.length > 0 ? (
          <div className="flex items-start gap-2 rounded-lg border border-amber-400/40 bg-amber-400/10 p-3 text-xs text-amber-200">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>
              {alerts.length} lesión{alerts.length === 1 ? "" : "es"} con retorno estimado próximo o vencido.
            </span>
          </div>
        ) : null}

        <TabsContent value="plantel" className="space-y-3">
          {rosterQ.isLoading ? (
            <CardGridSkeleton count={4} />
          ) : filteredRoster.length === 0 ? (
            <EmptyState
              icon={HeartPulse}
              title="Sin jugadores"
              message="No hay jugadores en los equipos donde tienes acceso a Salud."
            />
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {filteredRoster.map((p) => {
                const meta = AVAILABILITY_META[p.availability];
                const inj = openInjuryByUser.get(p.userId);
                return (
                  <button
                    key={p.playerId}
                    type="button"
                    onClick={() => setDetailPlayer(p)}
                    className="glass flex items-center gap-3 p-4 text-left transition-all hover:border-white/15 hover:bg-white/[0.06] active:scale-[0.99]"
                  >
                    <Avatar className="h-12 w-12 shrink-0">
                      <AvatarImage src={p.avatarUrl ?? undefined} alt="" />
                      <AvatarFallback>{(p.fullName ?? "?").slice(0, 1).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-display font-semibold text-foreground">
                        {p.fullName ?? "—"}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {p.teamName ?? "—"}
                        {p.position ? ` · ${p.position}` : ""}
                      </p>
                      <div className="mt-1 flex flex-wrap items-center gap-2">
                        <StatusBadge variant={meta.variant}>{meta.label}</StatusBadge>
                        {inj ? (
                          <span className="text-[11px] text-destructive">
                            {inj.injury_type} · {inj.body_part}
                          </span>
                        ) : null}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="revisiones" className="space-y-3">
          {checkupsQ.isLoading ? (
            <CardGridSkeleton count={3} />
          ) : filteredCheckups.length === 0 ? (
            <EmptyState
              icon={Stethoscope}
              title="Sin revisiones"
              message="Aún no se ha registrado ninguna revisión médica."
            />
          ) : (
            <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
              {filteredCheckups.map((c) => (
                <StandardCard
                  key={c.id}
                  icon={Stethoscope}
                  title={c.player?.full_name ?? "Jugador"}
                  subtitle={c.reason}
                  interactive
                  onClick={() => setDetailCheckup(c)}
                  action={<TeamBadge name={c.team?.name} />}
                >
                  <div className="space-y-1">
                    <p>{formatDateTime(c.checkup_date)}</p>
                    {c.diagnosis ? <p>Diagnóstico: {c.diagnosis}</p> : null}
                  </div>
                </StandardCard>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="lesiones" className="space-y-3">
          {injuriesQ.isLoading ? (
            <CardGridSkeleton count={3} />
          ) : filteredInjuries.length === 0 ? (
            <EmptyState
              icon={HeartPulse}
              title="Sin lesiones"
              message="No hay lesiones registradas en tus equipos."
            />
          ) : (
            <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
              {filteredInjuries.map((i) => {
                const d = daysToReturn(i);
                const overdue = i.status !== "recuperada" && d != null && d < 0;
                const status: { label: string; variant: StatusVariant } = {
                  label: INJURY_STATUS_LABEL[i.status],
                  variant: INJURY_STATUS_VARIANT[i.status],
                };
                return (
                  <StandardCard
                    key={i.id}
                    icon={HeartPulse}
                    title={i.player?.full_name ?? "Jugador"}
                    subtitle={`${i.injury_type} · ${i.body_part}`}
                    status={status}
                    interactive
                    onClick={() => setDetailInjury(i)}
                    className={overdue ? "border-destructive/50" : undefined}
                  >
                    <div className="space-y-1">
                      <p>
                        {SEVERITY_LABEL[i.severity]} ·{" "}
                        {new Date(`${i.occurred_at}T12:00:00`).toLocaleDateString("es-MX", {
                          day: "2-digit",
                          month: "long",
                        })}
                      </p>
                      {i.estimated_return && i.status !== "recuperada" ? (
                        <p className={overdue ? "text-destructive" : undefined}>
                          Retorno estimado:{" "}
                          {new Date(`${i.estimated_return}T12:00:00`).toLocaleDateString("es-MX", {
                            day: "2-digit",
                            month: "long",
                          })}
                          {d != null ? (overdue ? ` · vencido ${Math.abs(d)} d` : ` · en ${d} d`) : ""}
                        </p>
                      ) : null}
                      <TeamBadge name={i.team?.name} />
                    </div>
                  </StandardCard>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {clubId ? (
        <>
          <CheckupFormDialog
            open={checkupOpen}
            onOpenChange={(v) => {
              setCheckupOpen(v);
              if (!v) setEditingCheckup(null);
            }}
            clubId={clubId}
            userId={user.id}
            players={editablePlayers}
            checkup={editingCheckup}
          />
          <InjuryFormDialog
            open={injuryOpen}
            onOpenChange={(v) => {
              setInjuryOpen(v);
              if (!v) setEditingInjury(null);
            }}
            clubId={clubId}
            userId={user.id}
            players={editablePlayers}
            injury={editingInjury}
          />
          <CheckupDetailSheet
            open={!!detailCheckup}
            onOpenChange={(v) => !v && setDetailCheckup(null)}
            checkup={detailCheckup}
            canEdit={!!detailCheckup && canEditTeam(detailCheckup.team_id)}
            onEdit={(c) => {
              setDetailCheckup(null);
              setEditingCheckup(c);
              setCheckupOpen(true);
            }}
          />
          <InjuryDetailSheet
            open={!!detailInjury}
            onOpenChange={(v) => !v && setDetailInjury(null)}
            clubId={clubId}
            userId={user.id}
            injury={detailInjury}
            canEdit={!!detailInjury && canEditTeam(detailInjury.team_id)}
            onEdit={(i) => {
              setDetailInjury(null);
              setEditingInjury(i);
              setInjuryOpen(true);
            }}
          />
          <PlayerMedicalSheet
            open={!!detailPlayer}
            onOpenChange={(v) => !v && setDetailPlayer(null)}
            clubId={clubId}
            player={
              detailPlayer
                ? {
                    userId: detailPlayer.userId,
                    teamId: detailPlayer.teamId,
                    fullName: detailPlayer.fullName,
                    avatarUrl: detailPlayer.avatarUrl,
                    teamName: detailPlayer.teamName,
                  }
                : null
            }
            canEdit={!!detailPlayer && canEditTeam(detailPlayer.teamId)}
            onOpenInjury={(i) => {
              setDetailPlayer(null);
              setDetailInjury(i);
            }}
          />
        </>
      ) : null}
    </div>
  );
}

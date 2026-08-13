import * as React from "react";
import { createFileRoute } from "@tanstack/react-router";
import { AlertTriangle, HeartPulse } from "lucide-react";
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
  daysToReturn,
  useAppointments,
  useInjuries,
  useMedicalRoster,
  type AppointmentRow,
  type CheckupRow,
  type InjuryRow,
  type MedicalRosterMember,
} from "@/hooks/useHealth";
import { CheckupFormDialog } from "@/components/salud/CheckupFormDialog";
import { InjuryFormDialog } from "@/components/salud/InjuryFormDialog";
import { InjuryDetailSheet } from "@/components/salud/InjuryDetailSheet";
import { AppointmentFormDialog } from "@/components/salud/AppointmentFormDialog";
import { AppointmentDetailSheet } from "@/components/salud/AppointmentDetailSheet";
import { CheckupDetailSheet } from "@/components/salud/CheckupDetailSheet";
import {
  PlayerHealthContent,
  PlayerHealthSheet,
  type HealthPlayer,
} from "@/components/salud/PlayerHealthSheet";
import {
  EMPTY_SALUD_FILTERS,
  SaludFilters,
  type SaludFilterState,
} from "@/components/salud/SaludFilters";
import { HEALTH_STATUS_META, HEALTH_STATUS_ORDER } from "@/lib/salud";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/m/salud")({
  head: () => ({
    meta: [
      { title: "Squad — Salud" },
      { name: "description", content: "Estado de salud, lesiones, revisiones y citas médicas del equipo." },
      { property: "og:title", content: "Squad — Salud" },
      {
        property: "og:description",
        content: "Expediente médico por jugador: estado, lesiones, tratamiento y citas.",
      },
    ],
  }),
  component: SaludPage,
});

function SaludPage() {
  const { profile, user, isSuperAdmin, accessibleModules, teamOptions } = useApp();
  const clubId = profile?.club_id ?? null;
  const canAccess = isSuperAdmin || accessibleModules.includes("salud");
  const { canEditTeam, canReadTeam, onlyOwnRows } = useTeamAccess("salud");

  const rosterQ = useMedicalRoster(canAccess ? clubId : null);
  const injuriesQ = useInjuries(canAccess ? clubId : null);
  const appointmentsQ = useAppointments(canAccess ? clubId : null);

  const [filters, setFilters] = React.useState<SaludFilterState>(EMPTY_SALUD_FILTERS);
  const [detailPlayer, setDetailPlayer] = React.useState<HealthPlayer | null>(null);
  const [detailInjury, setDetailInjury] = React.useState<InjuryRow | null>(null);
  const [editingInjury, setEditingInjury] = React.useState<InjuryRow | null>(null);
  const [injuryOpen, setInjuryOpen] = React.useState(false);
  const [editingCheckup, setEditingCheckup] = React.useState<CheckupRow | null>(null);
  const [checkupOpen, setCheckupOpen] = React.useState(false);
  const [editingAppointment, setEditingAppointment] = React.useState<AppointmentRow | null>(null);
  const [appointmentOpen, setAppointmentOpen] = React.useState(false);
  const [detailAppointment, setDetailAppointment] = React.useState<AppointmentRow | null>(null);
  const [detailCheckup, setDetailCheckup] = React.useState<CheckupRow | null>(null);
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

  /** El propio registro del usuario (si es jugador). */
  const myRow = roster.find((p) => p.userId === user.id) ?? null;
  const isPlayerOnlyView = roster.length > 0 && roster.every((p) => p.userId === user.id);

  const injuries = injuriesQ.data ?? [];
  const openInjuryByUser = React.useMemo(() => {
    const m = new Map<string, InjuryRow>();
    for (const i of injuries) {
      if (i.status !== "recuperada" && !m.has(i.player_user_id)) m.set(i.player_user_id, i);
    }
    return m;
  }, [injuries]);

  const nextApptByUser = React.useMemo(() => {
    const m = new Map<string, AppointmentRow>();
    const now = Date.now();
    for (const a of appointmentsQ.data ?? []) {
      if (a.status !== "programada" || new Date(a.scheduled_at).getTime() < now) continue;
      if (!m.has(a.player_user_id)) m.set(a.player_user_id, a);
    }
    return m;
  }, [appointmentsQ.data]);

  const teamChoices = React.useMemo(
    () =>
      teamOptions
        .filter((t) => !!t.id)
        .map((t) => ({ id: t.id as string, name: t.name })),
    [teamOptions],
  );

  const q = filters.search.trim().toLowerCase();
  const filtered = roster.filter(
    (p) =>
      (!filters.teamId || filters.teamId === p.teamId) &&
      (!filters.status || filters.status === p.availability) &&
      (!q || (p.fullName ?? "").toLowerCase().includes(q)),
  );

  const counts = React.useMemo(() => {
    const c = new Map<string, number>();
    for (const p of roster) c.set(p.availability, (c.get(p.availability) ?? 0) + 1);
    return c;
  }, [roster]);

  const alerts = injuries.filter((i) => {
    if (i.status === "recuperada") return false;
    const d = daysToReturn(i);
    return d != null && d <= 3;
  });

  const toHealthPlayer = (p: MedicalRosterMember): HealthPlayer => ({
    userId: p.userId,
    teamId: p.teamId,
    fullName: p.fullName,
    avatarUrl: p.avatarUrl,
    teamName: p.teamName,
    availability: p.availability,
  });

  if (!canAccess) {
    return (
      <div className="space-y-6">
        <ModuleTabs activeKey="salud" />
        <PageHeader hideTitle title="Salud" subtitle="Estado, lesiones y citas médicas" />
        <EmptyState
          icon={HeartPulse}
          title="Sin acceso"
          message="Tu rol actual no tiene permisos para este módulo."
        />
      </div>
    );
  }

  const dialogs = clubId ? (
    <>
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
        draft={formPlayer && !editingCheckup ? { playerUserId: formPlayer } : null}
      />
      <AppointmentFormDialog
        open={appointmentOpen}
        onOpenChange={(v) => {
          setAppointmentOpen(v);
          if (!v) setEditingAppointment(null);
        }}
        clubId={clubId}
        userId={user.id}
        players={editablePlayers}
        appointment={editingAppointment}
        fixedPlayerUserId={editingAppointment ? null : formPlayer}
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
    </>
  ) : null;

  /* ------------------------------- Mi Salud ------------------------------- */
  if (isPlayerOnlyView && myRow && clubId) {
    return (
      <div className="space-y-6">
        <ModuleTabs activeKey="salud" />
        <PageHeader hideTitle title="Mi Salud" subtitle="Tu estado, tus lesiones y tus citas" />
        <PlayerHealthContent
          clubId={clubId}
          player={toHealthPlayer(myRow)}
          canEdit={canEditTeam(myRow.teamId)}
          self
          onOpenInjury={(i) => setDetailInjury(i)}
        />
        {dialogs}
      </div>
    );
  }

  /* -------------------------------- Panel --------------------------------- */
  return (
    <div className="space-y-6">
      <ModuleTabs activeKey="salud" />
      <PageHeader hideTitle title="Salud" subtitle="Estado, lesiones y citas médicas" />

      {/* Resumen de un vistazo */}
      <div className="flex flex-wrap gap-2">
        {HEALTH_STATUS_ORDER.map((s) => {
          const n = counts.get(s) ?? 0;
          if (!n) return null;
          const meta = HEALTH_STATUS_META[s];
          return (
            <button
              key={s}
              type="button"
              onClick={() => setFilters((f) => ({ ...f, status: f.status === s ? null : s }))}
              className={cn(
                "glass inline-flex items-center gap-2 px-3 py-2 text-sm transition-colors",
                filters.status === s ? "border-primary/40 bg-primary/10" : "hover:bg-white/[0.06]",
              )}
            >
              <span className={cn("h-2.5 w-2.5 rounded-full", meta.dot)} aria-hidden />
              <span className="font-semibold text-foreground">{n}</span>
              <span className="text-muted-foreground">{meta.label.toLowerCase()}</span>
            </button>
          );
        })}
      </div>

      {alerts.length > 0 ? (
        <div className="flex items-start gap-2 rounded-lg border border-amber-400/40 bg-amber-400/10 p-3 text-xs text-amber-200">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>
            {alerts.length} lesión{alerts.length === 1 ? "" : "es"} con regreso estimado próximo o vencido.
          </span>
        </div>
      ) : null}

      {editablePlayers.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          <Button
            className="glow-primary"
            onClick={() => {
              setFormPlayer(null);
              setEditingInjury(null);
              setInjuryOpen(true);
            }}
          >
            Registrar lesión
          </Button>
          <Button
            variant="secondary"
            onClick={() => {
              setFormPlayer(null);
              setEditingCheckup(null);
              setCheckupOpen(true);
            }}
          >
            Registrar revisión
          </Button>
          <Button
            variant="secondary"
            onClick={() => {
              setFormPlayer(null);
              setEditingAppointment(null);
              setAppointmentOpen(true);
            }}
          >
            Programar cita
          </Button>
        </div>
      ) : null}

      <SaludFilters value={filters} onChange={setFilters} teams={teamChoices} count={filtered.length} />

      {rosterQ.isLoading ? (
        <CardGridSkeleton count={4} />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={HeartPulse}
          title="Sin jugadores"
          message="No hay jugadores con esos filtros en las categorías donde tienes acceso a Salud."
        />
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((p) => {
            const meta = HEALTH_STATUS_META[p.availability] ?? HEALTH_STATUS_META.apto;
            const inj = openInjuryByUser.get(p.userId);
            const appt = nextApptByUser.get(p.userId);
            const d = inj ? daysToReturn(inj) : null;
            return (
              <button
                key={p.playerId}
                type="button"
                onClick={() => setDetailPlayer(toHealthPlayer(p))}
                className="glass flex items-start gap-3 p-4 text-left transition-all hover:border-white/15 hover:bg-white/[0.06] active:scale-[0.99]"
              >
                <div className="relative shrink-0">
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={p.avatarUrl ?? undefined} alt="" />
                    <AvatarFallback>{(p.fullName ?? "?").slice(0, 1).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <span
                    className={cn(
                      "absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full ring-2 ring-background",
                      meta.dot,
                    )}
                    aria-hidden
                  />
                </div>
                <div className="min-w-0 flex-1 space-y-1">
                  <p className="truncate font-display font-semibold text-foreground">
                    {p.fullName ?? "—"}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {p.teamName ?? "—"}
                    {p.position ? ` · ${p.position}` : ""}
                  </p>
                  <StatusBadge variant={meta.variant}>{meta.label}</StatusBadge>
                  {inj ? (
                    <p className="truncate text-xs text-muted-foreground">
                      {inj.injury_type} · {inj.body_part}
                      {d != null
                        ? d < 0
                          ? ` · regreso vencido ${Math.abs(d)} d`
                          : ` · regreso ~${d} d`
                        : ""}
                    </p>
                  ) : null}
                  {appt ? (
                    <p className="truncate text-xs text-muted-foreground">
                      Próxima cita:{" "}
                      {new Date(appt.scheduled_at).toLocaleDateString("es-MX", {
                        day: "2-digit",
                        month: "short",
                      })}
                    </p>
                  ) : null}
                </div>
              </button>
            );
          })}
        </div>
      )}

      {clubId ? (
        <PlayerHealthSheet
          open={!!detailPlayer}
          onOpenChange={(v) => !v && setDetailPlayer(null)}
          clubId={clubId}
          player={detailPlayer}
          canEdit={!!detailPlayer && canEditTeam(detailPlayer.teamId)}
          onOpenInjury={(i) => {
            setDetailPlayer(null);
            setDetailInjury(i);
          }}
          onNewInjury={() => {
            setFormPlayer(detailPlayer?.userId ?? null);
            setEditingInjury(null);
            setInjuryOpen(true);
          }}
          onNewCheckup={() => {
            setFormPlayer(detailPlayer?.userId ?? null);
            setEditingCheckup(null);
            setCheckupOpen(true);
          }}
          onNewAppointment={() => {
            setFormPlayer(detailPlayer?.userId ?? null);
            setEditingAppointment(null);
            setAppointmentOpen(true);
          }}
          onOpenAppointment={(a) => {
            setEditingAppointment(a);
            setAppointmentOpen(true);
          }}
        />
      ) : null}

      {dialogs}
    </div>
  );
}

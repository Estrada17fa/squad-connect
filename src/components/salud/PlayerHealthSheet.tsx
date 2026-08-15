import * as React from "react";
import { toast } from "sonner";
import {
  Activity,
  CalendarClock,
  ClipboardList,
  Droplets,
  HeartPulse,
  Pencil,
  Phone,
  Pill,
  Plus,
  ShieldAlert,
  Stethoscope,
  StickyNote,
  TriangleAlert,
  User,
} from "lucide-react";
import {
  DetailSheet,
  DetailField,
  DetailGrid,
  DetailValue,
} from "@/components/squad/DetailSheet";
import { StatusBadge } from "@/components/squad/StatusBadge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDateTime } from "@/lib/calendar-utils";
import {
  INJURY_STATUS_LABEL,
  SEVERITY_LABEL,
  daysToReturn,
  usePlayerHealth,
  useSetAvailability,
  type AppointmentRow,
  type CheckupRow,
  type InjuryRow,
} from "@/hooks/useHealth";
import type { AvailabilityStatus } from "@/hooks/usePlayers";
import {
  APPOINTMENT_STATUS_LABEL,
  APPOINTMENT_STATUS_VARIANT,
  CHECKUP_TYPE_LABEL,
  HEALTH_STATUS_META,
  HEALTH_STATUS_ORDER,
  INJURY_STATUS_BADGE,
  SEVERITY_VARIANT,
  formatDay,
  type CheckupType,
} from "@/lib/salud";
import { MedicalProfileDialog } from "./MedicalProfileDialog";
import { HealthCard, HealthEmpty, HealthPersonHeader } from "./HealthPieces";
import { cn } from "@/lib/utils";

export interface HealthPlayer {
  userId: string;
  teamId: string;
  fullName: string | null;
  avatarUrl: string | null;
  teamName?: string | null;
  availability: AvailabilityStatus;
}

interface ContentProps {
  clubId: string;
  player: HealthPlayer;
  /** Editor de 'salud' en la categoría del jugador. */
  canEdit: boolean;
  /** Vista del propio jugador: tono personal, sin cabecera de persona. */
  self?: boolean;
  /** Oculta la barra de acciones interna (cuando ya viven en la cabecera del sheet). */
  hideActions?: boolean;
  onOpenInjury?: (i: InjuryRow) => void;
  onNewInjury?: () => void;
  onNewCheckup?: () => void;
  onNewAppointment?: () => void;
  onOpenAppointment?: (a: AppointmentRow) => void;
  onOpenCheckup?: (c: CheckupRow) => void;
}

/** Ficha médica de un jugador — misma vista para el médico y para el jugador. */
export function PlayerHealthContent({
  clubId,
  player,
  canEdit,
  self,
  hideActions,
  onOpenInjury,
  onNewInjury,
  onNewCheckup,
  onNewAppointment,
  onOpenAppointment,
  onOpenCheckup,
}: ContentProps) {
  const q = usePlayerHealth(player.userId);
  const setAvailability = useSetAvailability(clubId);
  const [profileOpen, setProfileOpen] = React.useState(false);

  const data = q.data;
  const meta = HEALTH_STATUS_META[player.availability] ?? HEALTH_STATUS_META.apto;
  const injuries = data?.injuries ?? [];
  const openInjuries = injuries.filter((i) => i.status !== "recuperada");
  const pastInjuries = injuries.filter((i) => i.status === "recuperada");
  const now = Date.now();
  const appointments = data?.appointments ?? [];
  const upcoming = appointments.filter(
    (a) => a.status === "programada" && new Date(a.scheduled_at).getTime() >= now - 3_600_000,
  );
  const checkups = data?.checkups ?? [];
  const prescriptions = data?.prescriptions ?? [];

  const changeStatus = async (status: AvailabilityStatus) => {
    try {
      await setAvailability.mutateAsync({
        player_user_id: player.userId,
        team_id: player.teamId,
        status,
      });
      toast.success("Estado de salud actualizado");
    } catch (e: any) {
      toast.error(e?.message ?? "No se pudo actualizar el estado");
    }
  };

  return (
    <div className="space-y-6">
      {!self ? (
        <HealthPersonHeader
          name={player.fullName ?? "Jugador"}
          avatarUrl={player.avatarUrl}
          subtitle={player.teamName ?? undefined}
          badges={<StatusBadge variant={meta.variant}>{meta.label}</StatusBadge>}
        />
      ) : null}

      {/* Estado — semáforo */}
      <Section icon={Activity} title="Estado de salud">
        <div className="glass space-y-3 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <span className={cn("mt-1.5 h-3 w-3 shrink-0 rounded-full", meta.dot)} aria-hidden />
            <div className="min-w-0 flex-1">
              <p className="font-display text-lg font-semibold text-foreground">{meta.label}</p>
              <p className="text-sm text-muted-foreground">{meta.description}</p>
            </div>
          </div>
          {canEdit ? (
            <div className="flex flex-wrap gap-2 border-t border-white/5 pt-3">
              {HEALTH_STATUS_ORDER.map((s) => (
                <button
                  key={s}
                  type="button"
                  disabled={setAvailability.isPending}
                  onClick={() => changeStatus(s)}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs ring-1 ring-inset transition-colors",
                    s === player.availability
                      ? "bg-primary/15 text-primary ring-primary/40"
                      : "bg-white/[0.04] text-muted-foreground ring-white/10 hover:bg-white/[0.08]",
                  )}
                >
                  <span className={cn("h-2 w-2 rounded-full", HEALTH_STATUS_META[s].dot)} aria-hidden />
                  {HEALTH_STATUS_META[s].label}
                </button>
              ))}
            </div>
          ) : null}
        </div>
      </Section>

      {canEdit && !hideActions ? (
        <div className="flex flex-wrap gap-2">
          {onNewInjury ? (
            <Button size="sm" variant="secondary" onClick={onNewInjury}>
              <Plus className="mr-1.5 h-3.5 w-3.5" /> Lesión
            </Button>
          ) : null}
          {onNewCheckup ? (
            <Button size="sm" variant="secondary" onClick={onNewCheckup}>
              <Plus className="mr-1.5 h-3.5 w-3.5" /> Revisión
            </Button>
          ) : null}
          {onNewAppointment ? (
            <Button size="sm" variant="secondary" onClick={onNewAppointment}>
              <Plus className="mr-1.5 h-3.5 w-3.5" /> Cita
            </Button>
          ) : null}
        </div>
      ) : null}

      {q.isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
        </div>
      ) : null}

      {/* Lesiones activas */}
      <Section icon={HeartPulse} title={self ? "Mis lesiones activas" : "Lesiones activas"}>
        {openInjuries.length === 0 ? (
          <HealthEmpty
            icon={HeartPulse}
            title="Sin lesiones activas"
            message={self ? "No tienes lesiones abiertas." : "Este jugador no tiene lesiones abiertas."}
          />
        ) : (
          <div className="grid gap-2">
            {openInjuries.map((i) => {
              const d = daysToReturn(i);
              const overdue = d != null && d < 0;
              return (
                <HealthCard
                  key={i.id}
                  className={overdue ? "border-destructive/40" : undefined}
                  onClick={onOpenInjury ? () => onOpenInjury(i) : undefined}
                  title={`${i.injury_type} · ${i.body_part}`}
                  badge={
                    <div className="flex flex-wrap justify-end gap-1.5">
                      <StatusBadge variant={SEVERITY_VARIANT[i.severity]}>
                        {SEVERITY_LABEL[i.severity]}
                      </StatusBadge>
                      <StatusBadge variant={INJURY_STATUS_BADGE[i.status]}>
                        {INJURY_STATUS_LABEL[i.status]}
                      </StatusBadge>
                    </div>
                  }
                  metaIcon={CalendarClock}
                  metaTone={overdue ? "danger" : "muted"}
                  meta={
                    <>
                      Desde {formatDay(i.occurred_at)}
                      {i.estimated_return
                        ? ` · regreso ${formatDay(i.estimated_return)}${
                            d != null ? (overdue ? ` (vencido ${Math.abs(d)} d)` : ` (en ${d} d)`) : ""
                          }`
                        : ""}
                    </>
                  }
                  note={i.description ?? undefined}
                />
              );
            })}
          </div>
        )}
      </Section>

      {/* Próximas citas */}
      <Section icon={CalendarClock} title={self ? "Mis próximas citas" : "Próximas citas"}>
        {upcoming.length === 0 ? (
          <HealthEmpty icon={CalendarClock} title="Sin citas programadas" message="No hay citas próximas." />
        ) : (
          <div className="grid gap-2">
            {upcoming.map((a) => (
              <HealthCard
                key={a.id}
                onClick={onOpenAppointment ? () => onOpenAppointment(a) : undefined}
                title={a.reason}
                badge={
                  <StatusBadge variant={APPOINTMENT_STATUS_VARIANT[a.status]}>
                    {APPOINTMENT_STATUS_LABEL[a.status]}
                  </StatusBadge>
                }
                metaIcon={CalendarClock}
                meta={
                  <>
                    {formatDateTime(a.scheduled_at)} ·{" "}
                    {CHECKUP_TYPE_LABEL[a.appointment_type as CheckupType]}
                    {a.place ? ` · ${a.place}` : ""}
                  </>
                }
                note={a.notes ?? undefined}
              />
            ))}
          </div>
        )}
      </Section>

      {/* Revisiones */}
      <Section icon={Stethoscope} title="Revisiones y valoraciones">
        {checkups.length === 0 ? (
          <HealthEmpty icon={Stethoscope} title="Sin revisiones" message="Aún no hay revisiones registradas." />
        ) : (
          <div className="grid gap-2">
            {checkups.map((c) => (
              <HealthCard
                key={c.id}
                onClick={onOpenCheckup ? () => onOpenCheckup(c) : undefined}
                title={c.reason}
                badge={
                  <StatusBadge variant="neutral">
                    {CHECKUP_TYPE_LABEL[(c.checkup_type ?? "valoracion") as CheckupType]}
                  </StatusBadge>
                }
                metaIcon={CalendarClock}
                meta={formatDateTime(c.checkup_date)}
              >
                {c.findings || c.diagnosis || c.notes ? (
                  <div className="space-y-1 border-t border-white/5 pt-2 text-sm text-muted-foreground">
                    {c.findings ? (
                      <p className="whitespace-pre-wrap">
                        <span className="text-xs uppercase tracking-wider">Hallazgos · </span>
                        {c.findings}
                      </p>
                    ) : null}
                    {c.diagnosis ? (
                      <p className="whitespace-pre-wrap">
                        <span className="text-xs uppercase tracking-wider">Diagnóstico · </span>
                        {c.diagnosis}
                      </p>
                    ) : null}
                    {c.notes ? <p className="whitespace-pre-wrap">{c.notes}</p> : null}
                  </div>
                ) : null}
              </HealthCard>
            ))}
          </div>
        )}
      </Section>

      {/* Recetas */}
      <Section icon={Pill} title="Recetas y tratamiento">
        {prescriptions.length === 0 ? (
          <HealthEmpty icon={Pill} title="Sin recetas" message="No hay tratamientos registrados." />
        ) : (
          <div className="grid gap-2">
            {prescriptions.map((p) => (
              <HealthCard
                key={p.id}
                title={p.medication}
                badge={
                  <StatusBadge variant="neutral">
                    {[p.dosage, p.duration].filter(Boolean).join(" · ") || "Sin dosis"}
                  </StatusBadge>
                }
                metaIcon={CalendarClock}
                meta={formatDateTime(p.prescribed_at)}
                note={p.instructions ?? undefined}
              />
            ))}
          </div>
        )}
      </Section>

      {/* Historial de lesiones */}
      {pastInjuries.length > 0 ? (
        <Section icon={ClipboardList} title="Historial de lesiones">
          <div className="grid gap-2">
            {pastInjuries.map((i) => (
              <HealthCard
                key={i.id}
                onClick={onOpenInjury ? () => onOpenInjury(i) : undefined}
                title={`${i.injury_type} · ${i.body_part}`}
                badge={
                  <StatusBadge variant={INJURY_STATUS_BADGE[i.status]}>
                    {INJURY_STATUS_LABEL[i.status]}
                  </StatusBadge>
                }
                metaIcon={CalendarClock}
                meta={`${SEVERITY_LABEL[i.severity]} · ${formatDay(i.occurred_at)}`}
              />
            ))}
          </div>
        </Section>
      ) : null}

      {/* Perfil médico base */}
      <Section
        icon={ShieldAlert}
        title="Perfil médico base"
        action={
          canEdit ? (
            <Button type="button" size="sm" variant="outline" onClick={() => setProfileOpen(true)}>
              <Pencil className="mr-1 h-3.5 w-3.5" /> Editar
            </Button>
          ) : null
        }
      >
        <div className="glass rounded-lg p-4">
          <DetailGrid>
            <DetailField label="Tipo de sangre" icon={Droplets}>
              <DetailValue value={data?.profile?.blood_type} />
            </DetailField>
            <DetailField label="Alergias" icon={TriangleAlert}>
              <DetailValue value={data?.profile?.allergies} />
            </DetailField>
            <DetailField label="Padecimientos" icon={HeartPulse} full>
              <DetailValue value={data?.profile?.chronic_conditions} />
            </DetailField>
            <DetailField label="Contacto de emergencia" icon={User}>
              <DetailValue value={data?.profile?.emergency_contact_name} />
            </DetailField>
            <DetailField label="Teléfono" icon={Phone}>
              <DetailValue value={data?.profile?.emergency_contact_phone} />
            </DetailField>
            <DetailField label="Notas" icon={StickyNote} full>
              <DetailValue value={data?.profile?.notes} />
            </DetailField>
          </DetailGrid>
        </div>
      </Section>

      <p className="flex items-start gap-2 text-xs text-muted-foreground">
        <ShieldAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        Esta información solo la ven el cuerpo médico de la categoría y el propio jugador.
      </p>

      {canEdit ? (
        <MedicalProfileDialog
          open={profileOpen}
          onOpenChange={setProfileOpen}
          clubId={clubId}
          teamId={player.teamId}
          playerUserId={player.userId}
          profile={data?.profile ?? null}
        />
      ) : null}
    </div>
  );
}

/** La misma ficha, dentro del sheet estándar (entrada del médico). */
export function PlayerHealthSheet({
  open,
  onOpenChange,
  ...rest
}: Omit<ContentProps, "player"> & {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  player: HealthPlayer | null;
}) {
  const { player, canEdit, onNewInjury, onNewCheckup, onNewAppointment } = rest;
  if (!player) return null;

  return (
    <DetailSheet
      open={open}
      onOpenChange={onOpenChange}
      size="lg"
      title={player.fullName ?? "Jugador"}
      icon={HeartPulse}
      accent="var(--event-medico)"
      description={`Expediente médico${player.teamName ? ` · ${player.teamName}` : ""}`}
      headerActions={
        canEdit ? (
          <>
            {onNewInjury ? (
              <Button size="sm" variant="secondary" onClick={onNewInjury}>
                <Plus className="mr-1.5 h-3.5 w-3.5" /> Lesión
              </Button>
            ) : null}
            {onNewCheckup ? (
              <Button size="sm" variant="ghost" onClick={onNewCheckup}>
                <Plus className="mr-1.5 h-3.5 w-3.5" /> Revisión
              </Button>
            ) : null}
            {onNewAppointment ? (
              <Button size="sm" variant="ghost" onClick={onNewAppointment}>
                <Plus className="mr-1.5 h-3.5 w-3.5" /> Cita
              </Button>
            ) : null}
          </>
        ) : undefined
      }
    >
      <PlayerHealthContent {...rest} player={player} hideActions />
    </DetailSheet>
  );
}

function Section({
  icon: Icon,
  title,
  action,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <h3 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          <Icon className="h-3.5 w-3.5" /> {title}
        </h3>
        {action}
      </div>
      {children}
    </section>
  );
}

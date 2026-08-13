import * as React from "react";
import { toast } from "sonner";
import {
  Activity,
  CalendarClock,
  ClipboardList,
  HeartPulse,
  Pencil,
  Pill,
  Plus,
  ShieldAlert,
  Stethoscope,
} from "lucide-react";
import {
  EntitySheet,
  EntitySheetBody,
  EntitySheetDescription,
  EntitySheetFooter,
  EntitySheetHeader,
  EntitySheetTitle,
} from "@/components/squad/EntitySheet";
import { StatusBadge } from "@/components/squad/StatusBadge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDateTime } from "@/lib/calendar-utils";
import {
  INJURY_STATUS_LABEL,
  SEVERITY_LABEL,
  daysToReturn,
  usePlayerHealth,
  useSetAvailability,
  type AppointmentRow,
  type InjuryRow,
} from "@/hooks/useHealth";
import type { AvailabilityStatus } from "@/hooks/usePlayers";
import {
  APPOINTMENT_STATUS_LABEL,
  APPOINTMENT_STATUS_VARIANT,
  CHECKUP_TYPE_LABEL,
  HEALTH_STATUS_META,
  HEALTH_STATUS_ORDER,
  formatDay,
  type CheckupType,
} from "@/lib/salud";
import { INJURY_STATUS_VARIANT } from "./InjuryDetailSheet";
import { MedicalProfileDialog } from "./MedicalProfileDialog";
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
  /** Vista del propio jugador: tono personal, sin acciones. */
  self?: boolean;
  onOpenInjury?: (i: InjuryRow) => void;
  onNewInjury?: () => void;
  onNewCheckup?: () => void;
  onNewAppointment?: () => void;
  onOpenAppointment?: (a: AppointmentRow) => void;
}

/** Ficha médica de un jugador — misma vista para el médico y para el jugador. */
export function PlayerHealthContent({
  clubId,
  player,
  canEdit,
  self,
  onOpenInjury,
  onNewInjury,
  onNewCheckup,
  onNewAppointment,
  onOpenAppointment,
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
      {/* Estado — semáforo */}
      <section className="glass space-y-3 p-4">
        <div className="flex items-center gap-3">
          <span className={cn("h-4 w-4 shrink-0 rounded-full", meta.dot)} aria-hidden />
          <div className="min-w-0 flex-1">
            <p className="font-display text-xl font-semibold text-foreground">{meta.label}</p>
            <p className="text-sm text-muted-foreground">{meta.description}</p>
          </div>
          {!self ? (
            <Avatar className="h-12 w-12 shrink-0">
              <AvatarImage src={player.avatarUrl ?? undefined} alt="" />
              <AvatarFallback>{(player.fullName ?? "?").slice(0, 1).toUpperCase()}</AvatarFallback>
            </Avatar>
          ) : null}
        </div>
        {canEdit ? (
          <div className="flex flex-wrap gap-2">
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
      </section>

      {canEdit ? (
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
          <Empty>Sin lesiones activas.</Empty>
        ) : (
          <ul className="space-y-2">
            {openInjuries.map((i) => {
              const d = daysToReturn(i);
              const overdue = d != null && d < 0;
              return (
                <li
                  key={i.id}
                  className={cn(
                    "glass space-y-1 p-3 text-sm",
                    overdue && "border-destructive/40",
                    onOpenInjury && "cursor-pointer hover:bg-white/[0.06]",
                  )}
                  onClick={onOpenInjury ? () => onOpenInjury(i) : undefined}
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-medium text-foreground">
                      {i.injury_type} · {i.body_part}
                    </p>
                    <StatusBadge variant={INJURY_STATUS_VARIANT[i.status]}>
                      {INJURY_STATUS_LABEL[i.status]}
                    </StatusBadge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {SEVERITY_LABEL[i.severity]} · desde {formatDay(i.occurred_at)}
                  </p>
                  {i.estimated_return ? (
                    <p className={cn("text-xs", overdue ? "text-destructive" : "text-muted-foreground")}>
                      Regreso estimado: {formatDay(i.estimated_return)}
                      {d != null ? (overdue ? ` · vencido ${Math.abs(d)} d` : ` · en ${d} d`) : ""}
                    </p>
                  ) : null}
                  {i.description ? <p className="text-muted-foreground">{i.description}</p> : null}
                </li>
              );
            })}
          </ul>
        )}
      </Section>

      {/* Próximas citas */}
      <Section icon={CalendarClock} title={self ? "Mis próximas citas" : "Próximas citas"}>
        {upcoming.length === 0 ? (
          <Empty>Sin citas programadas.</Empty>
        ) : (
          <ul className="space-y-2">
            {upcoming.map((a) => (
              <li
                key={a.id}
                className={cn(
                  "glass space-y-1 p-3 text-sm",
                  canEdit && onOpenAppointment && "cursor-pointer hover:bg-white/[0.06]",
                )}
                onClick={canEdit && onOpenAppointment ? () => onOpenAppointment(a) : undefined}
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="font-medium text-foreground">{a.reason}</p>
                  <StatusBadge variant={APPOINTMENT_STATUS_VARIANT[a.status]}>
                    {APPOINTMENT_STATUS_LABEL[a.status]}
                  </StatusBadge>
                </div>
                <p className="text-xs text-muted-foreground">
                  {formatDateTime(a.scheduled_at)} · {CHECKUP_TYPE_LABEL[a.appointment_type as CheckupType]}
                  {a.place ? ` · ${a.place}` : ""}
                </p>
                {a.notes ? <p className="text-muted-foreground">{a.notes}</p> : null}
              </li>
            ))}
          </ul>
        )}
      </Section>

      {/* Revisiones */}
      <Section icon={Stethoscope} title="Revisiones y valoraciones">
        {(data?.checkups ?? []).length === 0 ? (
          <Empty>Sin revisiones registradas.</Empty>
        ) : (
          <ul className="space-y-2">
            {(data?.checkups ?? []).map((c) => (
              <li key={c.id} className="glass space-y-1 p-3 text-sm">
                <div className="flex items-start justify-between gap-2">
                  <p className="font-medium text-foreground">{c.reason}</p>
                  <StatusBadge variant="neutral">
                    {CHECKUP_TYPE_LABEL[(c.checkup_type ?? "valoracion") as CheckupType]}
                  </StatusBadge>
                </div>
                <p className="text-xs text-muted-foreground">{formatDateTime(c.checkup_date)}</p>
                {c.findings ? <p className="text-muted-foreground">Hallazgos: {c.findings}</p> : null}
                {c.diagnosis ? <p className="text-muted-foreground">Diagnóstico: {c.diagnosis}</p> : null}
                {c.notes ? <p className="text-muted-foreground">{c.notes}</p> : null}
              </li>
            ))}
          </ul>
        )}
      </Section>

      {/* Recetas */}
      <Section icon={Pill} title="Recetas y tratamiento">
        {(data?.prescriptions ?? []).length === 0 ? (
          <Empty>Sin recetas registradas.</Empty>
        ) : (
          <ul className="space-y-2">
            {(data?.prescriptions ?? []).map((p) => (
              <li key={p.id} className="glass space-y-1 p-3 text-sm">
                <p className="font-medium text-foreground">{p.medication}</p>
                <p className="text-muted-foreground">
                  {[p.dosage, p.duration].filter(Boolean).join(" · ") || "Sin dosis especificada"}
                </p>
                {p.instructions ? <p className="text-muted-foreground">{p.instructions}</p> : null}
                <p className="text-xs text-muted-foreground">{formatDateTime(p.prescribed_at)}</p>
              </li>
            ))}
          </ul>
        )}
      </Section>

      {/* Historial de lesiones */}
      {pastInjuries.length > 0 ? (
        <Section icon={ClipboardList} title="Historial de lesiones">
          <ul className="space-y-2">
            {pastInjuries.map((i) => (
              <li
                key={i.id}
                className={cn("glass space-y-1 p-3 text-sm", onOpenInjury && "cursor-pointer hover:bg-white/[0.06]")}
                onClick={onOpenInjury ? () => onOpenInjury(i) : undefined}
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="font-medium text-foreground">
                    {i.injury_type} · {i.body_part}
                  </p>
                  <StatusBadge variant={INJURY_STATUS_VARIANT[i.status]}>
                    {INJURY_STATUS_LABEL[i.status]}
                  </StatusBadge>
                </div>
                <p className="text-xs text-muted-foreground">
                  {SEVERITY_LABEL[i.severity]} · {formatDay(i.occurred_at)}
                </p>
              </li>
            ))}
          </ul>
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
        <dl className="glass grid grid-cols-2 gap-x-4 gap-y-1.5 p-4 text-sm">
          <Row label="Tipo de sangre" value={data?.profile?.blood_type} />
          <Row label="Alergias" value={data?.profile?.allergies} />
          <Row label="Padecimientos" value={data?.profile?.chronic_conditions} />
          <Row label="Contacto de emergencia" value={data?.profile?.emergency_contact_name} />
          <Row label="Teléfono" value={data?.profile?.emergency_contact_phone} />
          <Row label="Notas" value={data?.profile?.notes} />
        </dl>
      </Section>

      <p className="flex items-start gap-2 text-xs text-muted-foreground">
        <Activity className="mt-0.5 h-3.5 w-3.5 shrink-0" />
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
  const { player } = rest;
  if (!player) return null;
  return (
    <EntitySheet open={open} onOpenChange={onOpenChange} size="lg">
      <EntitySheetHeader>
        <EntitySheetTitle>{player.fullName ?? "Jugador"}</EntitySheetTitle>
        <EntitySheetDescription>
          Expediente médico{player.teamName ? ` · ${player.teamName}` : ""}
        </EntitySheetDescription>
      </EntitySheetHeader>
      <EntitySheetBody>
        <PlayerHealthContent {...rest} player={player} />
      </EntitySheetBody>
      <EntitySheetFooter>
        <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
          Cerrar
        </Button>
      </EntitySheetFooter>
    </EntitySheet>
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
    <section className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <h3 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          <Icon className="h-4 w-4" /> {title}
        </h3>
        {action}
      </div>
      {children}
    </section>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="text-sm text-muted-foreground">{children}</p>;
}

function Row({ label, value }: { label: string; value?: string | null }) {
  return (
    <>
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="break-words text-foreground">{value || "—"}</dd>
    </>
  );
}

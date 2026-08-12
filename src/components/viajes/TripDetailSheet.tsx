import * as React from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { LocationDisplay } from "@/components/calendar/LocationDisplay";
import { CalendarClock, MapPin, Pencil, Plane, Trophy, Users, UserPlus, X } from "lucide-react";

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
import { formatDateTime } from "@/lib/calendar-utils";
import {
  addTraveler,
  deleteTrip,
  removeTraveler,
  tripMilestones,
  TRIP_STATUS_LABEL,
  TRIP_STATUS_VARIANT,
  type TripRow,
} from "@/hooks/useTrips";
import { TravelerPicker, initialsOf, type TeamMemberOption } from "./TravelerPicker";
import { TripTabs } from "./TripTabs";
import { DeleteAction } from "./logistica/DeleteAction";
import { useTripRefresh } from "@/hooks/useTripChannel";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  trip: TripRow | null;
  /** 'editor' de viajes en la categoría del viaje. */
  canEdit?: boolean;
  /** Modo consulta (pestaña Agenda): oculta toda acción de edición. */
  readOnly?: boolean;
  onEdit?: (trip: TripRow) => void;
  /** Abre el picker de convocatoria al montar (FAB del detalle). */
  openPickerSignal?: number;
}

const MILESTONE_ICON = {
  citatorio: CalendarClock,
  salida: Plane,
  partido: Trophy,
  regreso: Plane,
} as const;

/**
 * Detalle del viaje en modo lectura + "Editar viaje" para editores.
 * La logística vive en tres pestañas (Ida / Regreso / General) que las
 * Partes 2 y 3 siguen llenando. La vista personal del jugador no vive aquí:
 * se construirá en Agenda/Inicio con los mismos datos por usuario.
 */
export function TripDetailSheet({
  open,
  onOpenChange,
  trip,
  canEdit = false,
  readOnly = false,
  onEdit,
  openPickerSignal = 0,
}: Props) {
  const qc = useQueryClient();
  const [picker, setPicker] = React.useState(false);
  const [busyId, setBusyId] = React.useState<string | null>(null);
  const refresh = useTripRefresh(trip?.id ?? null);
  const editable = canEdit && !readOnly;

  React.useEffect(() => {
    if (openPickerSignal > 0 && editable) setPicker(true);
  }, [openPickerSignal, editable]);

  React.useEffect(() => {
    if (!open) setPicker(false);
  }, [open]);

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["trips"] });
    refresh();
  };

  const toggle = useMutation({
    mutationFn: async (member: TeamMemberOption) => {
      if (!trip) return;
      setBusyId(member.id);
      const existing = trip.travelers.find((t) => t.user_id === member.id);
      if (existing) await removeTraveler(existing.id);
      else await addTraveler(trip.id, member.id, member.job_title ?? member.role_name ?? null);
    },
    onSuccess: () => {
      invalidate();
      setBusyId(null);
    },
    onError: (e: any) => {
      setBusyId(null);
      toast.error(e.message ?? "No se pudo actualizar la convocatoria");
    },
  });

  const milestones = trip ? tripMilestones(trip) : [];
  const selectedIds = new Set((trip?.travelers ?? []).map((t) => t.user_id));

  const generalHeader = !trip ? null : (
    <div className="space-y-5">
      {/* Cronología del viaje */}
      <section className="space-y-3">
        <h3 className="font-display text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Cronología
        </h3>
        <ol className="relative space-y-3 border-l border-white/10 pl-5">
          {milestones.map((m) => {
            const Icon = MILESTONE_ICON[m.kind];
            return (
              <li key={m.id} className="relative">
                <span className="absolute -left-[27px] top-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary/20 ring-2 ring-background">
                  <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                </span>
                <div className="glass p-3">
                  <p className="flex items-center gap-2 text-sm font-medium text-foreground">
                    <Icon className="h-4 w-4 text-primary" />
                    {m.label}
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">{formatDateTime(m.at)}</p>
                  {m.detail ? <p className="mt-1 text-xs text-muted-foreground">{m.detail}</p> : null}
                </div>
              </li>
            );
          })}
        </ol>
      </section>

      {trip.meeting_point || (trip as any).meeting_location_id || trip.notes ? (
        <section className="space-y-2">
          {trip.meeting_point || (trip as any).meeting_location_id ? (
            <div className="space-y-1.5 text-sm text-muted-foreground">
              <p className="flex items-center gap-2">
                <MapPin className="h-4 w-4 shrink-0 text-primary" /> Punto de reunión
              </p>
              <LocationDisplay
                clubId={trip.club_id}
                locationId={(trip as any).meeting_location_id ?? null}
                text={trip.meeting_point}
              />
            </div>
          ) : null}
          {trip.notes ? <p className="whitespace-pre-wrap text-sm text-muted-foreground">{trip.notes}</p> : null}
        </section>
      ) : null}

      {/* Convocatoria */}
      <section className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <h3 className="flex items-center gap-2 font-display text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            <Users className="h-4 w-4" /> Convocatoria
          </h3>
          {editable ? (
            <Button type="button" size="sm" variant="ghost" onClick={() => setPicker((v) => !v)}>
              <UserPlus className="mr-2 h-4 w-4" />
              {picker ? "Cerrar" : "Agregar"}
            </Button>
          ) : null}
        </div>

        {picker && editable ? (
          <TravelerPicker
            clubId={trip.club_id}
            teamId={trip.team_id}
            selectedIds={selectedIds}
            busyId={busyId}
            onToggle={(m) => toggle.mutate(m)}
          />
        ) : null}

        {trip.travelers.length === 0 ? (
          <p className="text-sm text-muted-foreground">Aún no hay convocados para este viaje.</p>
        ) : (
          <ul className="space-y-1">
            {[...trip.travelers]
              .sort((a, b) => (a.profile?.full_name ?? "").localeCompare(b.profile?.full_name ?? "", "es"))
              .map((t) => (
                <li key={t.id} className="flex items-center gap-3 rounded-xl border border-border/60 px-3 py-2">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={t.profile?.avatar_url ?? undefined} alt="" />
                    <AvatarFallback className="text-xs">
                      {initialsOf(t.profile?.full_name ?? null, t.profile?.email ?? null)}
                    </AvatarFallback>
                  </Avatar>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm text-foreground">
                      {t.profile?.full_name ?? t.profile?.email ?? "Miembro"}
                    </span>
                    {t.role_note ? (
                      <span className="block truncate text-xs text-muted-foreground">{t.role_note}</span>
                    ) : null}
                  </span>
                  {editable ? (
                    <button
                      type="button"
                      aria-label="Quitar del viaje"
                      className="rounded-full p-1.5 text-muted-foreground hover:bg-white/10 hover:text-foreground"
                      onClick={() => {
                        setBusyId(t.user_id);
                        removeTraveler(t.id)
                          .then(() => {
                            invalidate();
                            setBusyId(null);
                          })
                          .catch((e) => {
                            setBusyId(null);
                            toast.error(e.message ?? "No se pudo quitar");
                          });
                      }}
                    >
                      <X className="h-4 w-4" />
                    </button>
                  ) : null}
                </li>
              ))}
          </ul>
        )}
      </section>
    </div>
  );

  return (
    <EntitySheet open={open} onOpenChange={onOpenChange} size="xl">
      <EntitySheetHeader>
        <EntitySheetTitle>{trip?.title ?? "Viaje"}</EntitySheetTitle>
        <EntitySheetDescription>
          {trip?.destination ? `Destino: ${trip.destination}` : "Sin destino especificado"}
        </EntitySheetDescription>
        {editable && trip && onEdit ? (
          <div className="mt-3 flex flex-wrap gap-2">
            <Button type="button" size="sm" variant="secondary" onClick={() => onEdit(trip)}>
              <Pencil className="mr-2 h-3.5 w-3.5" /> Editar viaje
            </Button>
            <DeleteAction
              label="Eliminar viaje"
              title={`¿Eliminar el viaje "${trip.title}"?`}
              description="Se borrará toda su logística: convocatoria, transportes, vuelos, hoteles, comidas, material y documentos."
              successMessage="Viaje eliminado"
              onDelete={() => deleteTrip(trip.id)}
              onDeleted={() => {
                invalidate();
                onOpenChange(false);
              }}
            />
          </div>
        ) : null}
      </EntitySheetHeader>

      <EntitySheetBody>
        {!trip ? null : (
          <>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <StatusBadge variant={TRIP_STATUS_VARIANT[trip.status]}>{TRIP_STATUS_LABEL[trip.status]}</StatusBadge>
              <span className="text-xs text-muted-foreground">
                Salida {formatDateTime(trip.departure_at)}
                {trip.return_at ? ` · Regreso ${formatDateTime(trip.return_at)}` : ""}
              </span>
              <span className="text-xs text-muted-foreground">
                {trip.travelers.length} convocado{trip.travelers.length === 1 ? "" : "s"}
              </span>
            </div>

            <TripTabs trip={trip} canEdit={editable} generalHeader={generalHeader} />
          </>
        )}
      </EntitySheetBody>

      <EntitySheetFooter>
        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
          Cerrar
        </Button>
      </EntitySheetFooter>
    </EntitySheet>
  );
}

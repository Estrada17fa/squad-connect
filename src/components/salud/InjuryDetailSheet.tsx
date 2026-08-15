import * as React from "react";
import { toast } from "sonner";
import { Activity, CalendarClock, CalendarDays, CheckCircle2, Plus, Trash2 } from "lucide-react";
import {
  DetailSheet,
  DetailSection,
  DetailField,
  DetailGrid,
  DetailValue,
} from "@/components/squad/DetailSheet";
import { StatusBadge, type StatusVariant } from "@/components/squad/StatusBadge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { formatDateTime } from "@/lib/calendar-utils";
import { INJURY_STATUS_BADGE, SEVERITY_VARIANT, formatDay } from "@/lib/salud";
import { HealthCard, HealthEmpty, HealthPersonHeader } from "./HealthPieces";
import {
  INJURY_STATUS_LABEL,
  SEVERITY_LABEL,
  daysToReturn,
  useAddInjuryProgress,
  useDeleteInjury,
  useInjuryProgress,
  useSaveInjury,
  type InjuryRow,
} from "@/hooks/useHealth";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  clubId: string;
  userId: string;
  injury: InjuryRow | null;
  canEdit: boolean;
  onEdit?: (i: InjuryRow) => void;
}

export const INJURY_STATUS_VARIANT: Record<string, StatusVariant> = INJURY_STATUS_BADGE;

export function InjuryDetailSheet({ open, onOpenChange, clubId, userId, injury, canEdit, onEdit }: Props) {
  const progressQ = useInjuryProgress(open && injury ? injury.id : null);
  const addProgress = useAddInjuryProgress(clubId, userId);
  const saveInjury = useSaveInjury(clubId, userId);
  const removeInjury = useDeleteInjury(clubId);
  const [note, setNote] = React.useState("");

  if (!injury) return null;

  const days = daysToReturn(injury);
  const isOpen = injury.status !== "recuperada";
  const overdue = isOpen && days != null && days < 0;

  const submitNote = async () => {
    if (!note.trim()) return;
    try {
      await addProgress.mutateAsync({
        injury_id: injury.id,
        note: note.trim(),
        progress_date: new Date().toISOString(),
      });
      setNote("");
      toast.success("Avance registrado");
    } catch (e: any) {
      toast.error(e?.message ?? "No se pudo registrar el avance");
    }
  };

  const markRecovered = async () => {
    try {
      await saveInjury.mutateAsync({
        id: injury.id,
        team_id: injury.team_id,
        player_user_id: injury.player_user_id,
        injury_type: injury.injury_type,
        body_part: injury.body_part,
        severity: injury.severity,
        occurred_at: injury.occurred_at,
        estimated_return: injury.estimated_return,
        status: "recuperada",
        description: injury.description,
        availability: "apto",
      });
      toast.success("Lesión dada de alta");
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e?.message ?? "No se pudo dar de alta");
    }
  };

  return (
    <DetailSheet
      open={open}
      onOpenChange={onOpenChange}
      size="lg"
      title={`${injury.injury_type} · ${injury.body_part}`}
      icon={HeartPulse}
      accent="var(--event-medico)"
      description={`${injury.player?.full_name ?? "Jugador"}${injury.team?.name ? ` · ${injury.team.name}` : ""}`}
      headerActions={
        canEdit ? (
          <>
            {onEdit ? (
              <Button type="button" size="sm" variant="secondary" onClick={() => onEdit(injury)}>
                Editar
              </Button>
            ) : null}
            {isOpen ? (
              <Button type="button" size="sm" onClick={markRecovered} disabled={saveInjury.isPending}>
                <CheckCircle2 className="mr-2 h-4 w-4" /> Dar de alta
              </Button>
            ) : null}
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="text-destructive hover:bg-destructive/10 hover:text-destructive"
              onClick={async () => {
                try {
                  await removeInjury.mutateAsync(injury.id);
                  toast.success("Lesión eliminada");
                  onOpenChange(false);
                } catch (e: any) {
                  toast.error(e?.message ?? "No se pudo eliminar");
                }
              }}
            >
              <Trash2 className="mr-2 h-4 w-4" /> Eliminar
            </Button>
          </>
        ) : undefined
      }
    >
      <div className="space-y-6">
        <HealthPersonHeader
          name={injury.player?.full_name ?? "Jugador"}
          avatarUrl={injury.player?.avatar_url}
          subtitle={injury.team?.name ?? undefined}
          badges={
            <>
              <StatusBadge variant={INJURY_STATUS_BADGE[injury.status]}>
                {INJURY_STATUS_LABEL[injury.status]}
              </StatusBadge>
              <StatusBadge variant={SEVERITY_VARIANT[injury.severity]}>
                {SEVERITY_LABEL[injury.severity]}
              </StatusBadge>
            </>
          }
        />

        <DetailSection title="Lesión">
          <div className="glass rounded-lg p-4">
            <DetailGrid>
              <DetailField label="Tipo">
                <DetailValue value={injury.injury_type} />
              </DetailField>
              <DetailField label="Zona">
                <DetailValue value={injury.body_part} />
              </DetailField>
              <DetailField label="Fecha de la lesión" icon={CalendarDays}>
                {formatDay(injury.occurred_at)}
              </DetailField>
              <DetailField label="Regreso estimado" icon={CalendarClock}>
                {injury.estimated_return ? (
                  <span className={overdue ? "text-destructive" : undefined}>
                    {formatDay(injury.estimated_return)}
                    {isOpen && days != null
                      ? days < 0
                        ? ` · vencido hace ${Math.abs(days)} d`
                        : days === 0
                          ? " · es hoy"
                          : ` · en ${days} d`
                      : ""}
                  </span>
                ) : (
                  <DetailValue value={null} />
                )}
              </DetailField>
              <DetailField label="Descripción" full>
                <DetailValue value={injury.description} />
              </DetailField>
            </DetailGrid>
          </div>
        </DetailSection>

        <DetailSection title="Seguimiento de recuperación">
          {canEdit ? (
            <div className="glass space-y-2 rounded-lg p-3">
              <Label htmlFor="inj-note" className="sr-only">
                Nota de evolución
              </Label>
              <Textarea
                id="inj-note"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={2}
                placeholder="Sesión de fisio, avance, indicaciones…"
              />
              <Button
                type="button"
                size="sm"
                onClick={submitNote}
                disabled={!note.trim() || addProgress.isPending}
              >
                <Plus className="mr-2 h-4 w-4" /> Agregar avance
              </Button>
            </div>
          ) : null}

          {(progressQ.data ?? []).length === 0 ? (
            <HealthEmpty
              icon={Activity}
              title="Sin notas de evolución"
              message="Aún no se registra avance de recuperación."
            />
          ) : (
            <div className="grid gap-2">
              {(progressQ.data ?? []).map((p) => (
                <HealthCard
                  key={p.id}
                  title={<span className="whitespace-pre-wrap">{p.note}</span>}
                  metaIcon={Activity}
                  meta={formatDateTime(p.progress_date)}
                />
              ))}
            </div>
          )}
        </DetailSection>
      </div>
    </DetailSheet>
  );
}

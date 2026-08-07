import * as React from "react";
import { toast } from "sonner";
import { Activity, CalendarClock, CheckCircle2, Pencil, Plus, Trash2 } from "lucide-react";
import {
  EntitySheet,
  EntitySheetBody,
  EntitySheetDescription,
  EntitySheetFooter,
  EntitySheetHeader,
  EntitySheetTitle,
} from "@/components/squad/EntitySheet";
import { StatusBadge, type StatusVariant } from "@/components/squad/StatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { formatDateTime } from "@/lib/calendar-utils";
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

export const INJURY_STATUS_VARIANT: Record<string, StatusVariant> = {
  activa: "rejected",
  en_recuperacion: "pending",
  recuperada: "approved",
};

export function InjuryDetailSheet({ open, onOpenChange, clubId, userId, injury, canEdit, onEdit }: Props) {
  const progressQ = useInjuryProgress(open && injury ? injury.id : null);
  const addProgress = useAddInjuryProgress(clubId, userId);
  const saveInjury = useSaveInjury(clubId, userId);
  const removeInjury = useDeleteInjury(clubId);
  const [note, setNote] = React.useState("");

  if (!injury) return null;

  const days = daysToReturn(injury);
  const open_ = injury.status !== "recuperada";

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
    <EntitySheet open={open} onOpenChange={onOpenChange} size="lg">
      <EntitySheetHeader>
        <EntitySheetTitle>
          {injury.injury_type} · {injury.body_part}
        </EntitySheetTitle>
        <EntitySheetDescription>
          {injury.player?.full_name ?? "Jugador"}
          {injury.team?.name ? ` · ${injury.team.name}` : ""}
        </EntitySheetDescription>
      </EntitySheetHeader>

      <EntitySheetBody>
        {canEdit ? (
          <div className="flex flex-wrap gap-2">
            {onEdit ? (
              <Button type="button" size="sm" variant="outline" onClick={() => onEdit(injury)}>
                <Pencil className="mr-2 h-4 w-4" /> Editar
              </Button>
            ) : null}
            {open_ ? (
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
          </div>
        ) : null}

        <div className="glass space-y-2 p-4 text-sm">
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge variant={INJURY_STATUS_VARIANT[injury.status]}>
              {INJURY_STATUS_LABEL[injury.status]}
            </StatusBadge>
            <StatusBadge variant={injury.severity === "grave" ? "rejected" : injury.severity === "moderada" ? "pending" : "info"}>
              {SEVERITY_LABEL[injury.severity]}
            </StatusBadge>
          </div>
          <p className="text-muted-foreground">
            Ocurrió el{" "}
            {new Date(`${injury.occurred_at}T12:00:00`).toLocaleDateString("es-MX", {
              day: "2-digit",
              month: "long",
              year: "numeric",
            })}
          </p>
          {injury.estimated_return ? (
            <p className={days != null && days < 0 && open_ ? "text-destructive" : "text-muted-foreground"}>
              <CalendarClock className="mr-1 inline h-3.5 w-3.5" />
              Retorno estimado:{" "}
              {new Date(`${injury.estimated_return}T12:00:00`).toLocaleDateString("es-MX", {
                day: "2-digit",
                month: "long",
              })}
              {open_ && days != null
                ? days < 0
                  ? ` · vencido hace ${Math.abs(days)} d`
                  : days === 0
                    ? " · es hoy"
                    : ` · en ${days} d`
                : ""}
            </p>
          ) : null}
          {injury.description ? (
            <p className="whitespace-pre-wrap text-muted-foreground">{injury.description}</p>
          ) : null}
        </div>

        <div className="space-y-2">
          <h3 className="font-display text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Seguimiento de recuperación
          </h3>
          {canEdit ? (
            <div className="space-y-2">
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
            <p className="text-sm text-muted-foreground">Aún no hay notas de evolución.</p>
          ) : (
            <ul className="space-y-2">
              {(progressQ.data ?? []).map((p) => (
                <li key={p.id} className="glass p-3 text-sm">
                  <p className="text-foreground whitespace-pre-wrap">{p.note}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    <Activity className="mr-1 inline h-3 w-3" />
                    {formatDateTime(p.progress_date)}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </EntitySheetBody>

      <EntitySheetFooter>
        <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
          Cerrar
        </Button>
      </EntitySheetFooter>
    </EntitySheet>
  );
}

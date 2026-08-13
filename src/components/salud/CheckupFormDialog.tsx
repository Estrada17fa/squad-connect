import * as React from "react";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";
import {
  EntitySheet,
  EntitySheetBody,
  EntitySheetDescription,
  EntitySheetFooter,
  EntitySheetHeader,
  EntitySheetTitle,
} from "@/components/squad/EntitySheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { fromLocalInputValue, toLocalInputValue } from "@/lib/calendar-utils";
import {
  useSaveCheckup,
  type CheckupRow,
  type MedicalRosterMember,
  type PrescriptionDraft,
} from "@/hooks/useHealth";
import { cn } from "@/lib/utils";
import { CHECKUP_TYPE_LABEL, CHECKUP_TYPE_ORDER, type CheckupType } from "@/lib/salud";

export interface CheckupDraft {
  playerUserId?: string | null;
  reason?: string | null;
  notes?: string | null;
  requestId?: string | null;
}

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  clubId: string;
  userId: string;
  /** Jugadores donde el usuario puede registrar (equipos editables en 'salud'). */
  players: MedicalRosterMember[];
  checkup?: CheckupRow | null;
  draft?: CheckupDraft | null;
  onSaved?: () => void;
}

const emptyPrescription = (): PrescriptionDraft => ({
  medication: "",
  dosage: "",
  duration: "",
  instructions: "",
});

export function CheckupFormDialog({
  open,
  onOpenChange,
  clubId,
  userId,
  players,
  checkup,
  draft,
  onSaved,
}: Props) {
  const save = useSaveCheckup(clubId, userId);
  const isEdit = !!checkup;

  const [playerUserId, setPlayerUserId] = React.useState("");
  const [date, setDate] = React.useState("");
  const [checkupType, setCheckupType] = React.useState<CheckupType>("valoracion");
  const [reason, setReason] = React.useState("");
  const [findings, setFindings] = React.useState("");
  const [diagnosis, setDiagnosis] = React.useState("");
  const [notes, setNotes] = React.useState("");
  const [prescriptions, setPrescriptions] = React.useState<PrescriptionDraft[]>([]);

  React.useEffect(() => {
    if (!open) return;
    setPlayerUserId(checkup?.player_user_id ?? draft?.playerUserId ?? players[0]?.userId ?? "");
    setDate(toLocalInputValue(checkup?.checkup_date ?? new Date().toISOString()));
    setCheckupType((checkup?.checkup_type ?? "valoracion") as CheckupType);
    setReason(checkup?.reason ?? draft?.reason ?? "");
    setFindings(checkup?.findings ?? "");
    setDiagnosis(checkup?.diagnosis ?? "");
    setNotes(checkup?.notes ?? draft?.notes ?? "");
    setPrescriptions([]);
  }, [open, checkup, draft, players]);

  const player = players.find((p) => p.userId === playerUserId) ?? null;
  const disabled = !player || !reason.trim() || save.isPending;

  const submit = async () => {
    if (!player) {
      toast.error("Elige un jugador");
      return;
    }
    try {
      await save.mutateAsync({
        id: checkup?.id ?? null,
        team_id: player.teamId,
        player_user_id: player.userId,
        checkup_date: date ? fromLocalInputValue(date) : new Date().toISOString(),
        checkup_type: checkupType,
        reason: reason.trim(),
        findings: findings.trim() || null,
        diagnosis: diagnosis.trim() || null,
        notes: notes.trim() || null,
        request_id: checkup?.request_id ?? draft?.requestId ?? null,
        prescriptions,
      });
      toast.success(
        draft?.requestId && !isEdit ? "Revisión registrada y solicitud completada" : "Revisión guardada",
      );
      onOpenChange(false);
      onSaved?.();
    } catch (e: any) {
      toast.error(e?.message ?? "No se pudo guardar la revisión");
    }
  };

  return (
    <EntitySheet open={open} onOpenChange={onOpenChange} size="lg">
      <EntitySheetHeader>
        <EntitySheetTitle>{isEdit ? "Editar revisión" : "Registrar revisión"}</EntitySheetTitle>
        <EntitySheetDescription>
          La información médica solo la ven el cuerpo médico del equipo y el propio jugador.
        </EntitySheetDescription>
      </EntitySheetHeader>

      <EntitySheetBody>
        <PlayerPicker
          id="ck-player"
          players={players}
          value={playerUserId}
          onChange={setPlayerUserId}
          disabled={isEdit}
          emptyMessage="No tienes equipos donde puedas registrar información médica."
        />

        <div className="space-y-1.5">
          <Label htmlFor="ck-date">Fecha y hora</Label>
          <Input id="ck-date" type="datetime-local" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="ck-type">Tipo de revisión</Label>
          <select
            id="ck-type"
            value={checkupType}
            onChange={(e) => setCheckupType(e.target.value as CheckupType)}
            className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
          >
            {CHECKUP_TYPE_ORDER.map((t) => (
              <option key={t} value={t}>
                {CHECKUP_TYPE_LABEL[t]}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="ck-reason">Motivo</Label>
          <Input
            id="ck-reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="p.ej. Molestia en rodilla derecha"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="ck-findings">Hallazgos</Label>
          <Textarea id="ck-findings" value={findings} onChange={(e) => setFindings(e.target.value)} rows={3} />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="ck-diagnosis">Diagnóstico</Label>
          <Textarea id="ck-diagnosis" value={diagnosis} onChange={(e) => setDiagnosis(e.target.value)} rows={2} />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="ck-notes">Notas</Label>
          <Textarea id="ck-notes" value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label>Recetas y tratamientos</Label>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => setPrescriptions((p) => [...p, emptyPrescription()])}
            >
              <Plus className="mr-1 h-3.5 w-3.5" /> Agregar
            </Button>
          </div>
          {prescriptions.length === 0 ? (
            <p className="text-xs text-muted-foreground">Sin recetas nuevas en esta revisión.</p>
          ) : (
            prescriptions.map((p, idx) => (
              <div key={idx} className={cn("glass space-y-2 p-3")}>
                <div className="flex items-start gap-2">
                  <Input
                    value={p.medication}
                    onChange={(e) =>
                      setPrescriptions((prev) =>
                        prev.map((x, i) => (i === idx ? { ...x, medication: e.target.value } : x)),
                      )
                    }
                    placeholder="Medicamento o tratamiento"
                  />
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    className="shrink-0 text-destructive hover:bg-destructive/10"
                    onClick={() => setPrescriptions((prev) => prev.filter((_, i) => i !== idx))}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <Input
                    value={p.dosage}
                    onChange={(e) =>
                      setPrescriptions((prev) =>
                        prev.map((x, i) => (i === idx ? { ...x, dosage: e.target.value } : x)),
                      )
                    }
                    placeholder="Dosis"
                  />
                  <Input
                    value={p.duration}
                    onChange={(e) =>
                      setPrescriptions((prev) =>
                        prev.map((x, i) => (i === idx ? { ...x, duration: e.target.value } : x)),
                      )
                    }
                    placeholder="Duración"
                  />
                </div>
                <Textarea
                  value={p.instructions}
                  onChange={(e) =>
                    setPrescriptions((prev) =>
                      prev.map((x, i) => (i === idx ? { ...x, instructions: e.target.value } : x)),
                    )
                  }
                  placeholder="Indicaciones"
                  rows={2}
                />
              </div>
            ))
          )}
        </div>
      </EntitySheetBody>

      <EntitySheetFooter>
        <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
          Cancelar
        </Button>
        <Button type="button" className="glow-primary" onClick={submit} disabled={disabled}>
          {save.isPending ? "Guardando…" : isEdit ? "Guardar cambios" : "Registrar revisión"}
        </Button>
      </EntitySheetFooter>
    </EntitySheet>
  );
}

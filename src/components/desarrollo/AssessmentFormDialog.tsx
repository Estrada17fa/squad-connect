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
import { Slider } from "@/components/ui/slider";
import {
  DEFAULT_ATTRIBUTES,
  useSaveAssessment,
  type AssessmentRow,
  type DevelopmentRosterMember,
  type ScoreDraft,
} from "@/hooks/useDevelopment";
import { PlayerSelect } from "./PlayerSelect";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  clubId: string;
  userId: string;
  players: DevelopmentRosterMember[];
  assessment?: AssessmentRow | null;
  defaultPlayerUserId?: string | null;
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

const baseScores = (): ScoreDraft[] => DEFAULT_ATTRIBUTES.map((a) => ({ attribute: a, score: 5 }));

export function AssessmentFormDialog({
  open,
  onOpenChange,
  clubId,
  userId,
  players,
  assessment,
  defaultPlayerUserId,
}: Props) {
  const isEdit = !!assessment;
  const save = useSaveAssessment(clubId, userId);

  const [playerUserId, setPlayerUserId] = React.useState("");
  const [date, setDate] = React.useState(today());
  const [notes, setNotes] = React.useState("");
  const [scores, setScores] = React.useState<ScoreDraft[]>(baseScores());

  React.useEffect(() => {
    if (!open) return;
    setPlayerUserId(assessment?.player_user_id ?? defaultPlayerUserId ?? "");
    setDate(assessment?.assessment_date ?? today());
    setNotes(assessment?.notes ?? "");
    setScores(
      assessment?.scores && assessment.scores.length > 0
        ? assessment.scores.map((s) => ({ attribute: s.attribute, score: Number(s.score) }))
        : baseScores(),
    );
  }, [open, assessment, defaultPlayerUserId]);

  const player = players.find((p) => p.userId === playerUserId);
  const disabled = !player || scores.filter((s) => s.attribute.trim()).length === 0 || save.isPending;

  const submit = () => {
    if (!player) return;
    save.mutate(
      {
        id: assessment?.id ?? null,
        team_id: player.teamId,
        player_user_id: player.userId,
        assessment_date: date,
        notes: notes.trim() || null,
        scores,
      },
      {
        onSuccess: () => {
          toast.success(isEdit ? "Evaluación actualizada" : "Evaluación registrada");
          onOpenChange(false);
        },
        onError: (e: any) => toast.error(e?.message ?? "No se pudo guardar"),
      },
    );
  };

  return (
    <EntitySheet open={open} onOpenChange={onOpenChange} size="lg">
      <EntitySheetHeader>
        <EntitySheetTitle>{isEdit ? "Editar evaluación" : "Nueva evaluación"}</EntitySheetTitle>
        <EntitySheetDescription>Puntaje por atributo del 1 al 10.</EntitySheetDescription>
      </EntitySheetHeader>

      <EntitySheetBody>
        <PlayerSelect
          id="as-player"
          players={players}
          value={playerUserId}
          onChange={setPlayerUserId}
          disabled={isEdit}
        />

        <div className="space-y-1.5">
          <Label htmlFor="as-date">Fecha</Label>
          <Input id="as-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label>Atributos</Label>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => setScores((s) => [...s, { attribute: "", score: 5 }])}
            >
              <Plus className="mr-1 h-3.5 w-3.5" /> Agregar
            </Button>
          </div>
          {scores.map((s, idx) => (
            <div key={idx} className="glass space-y-2 p-3">
              <div className="flex items-center gap-2">
                <Input
                  value={s.attribute}
                  onChange={(e) =>
                    setScores((prev) =>
                      prev.map((x, i) => (i === idx ? { ...x, attribute: e.target.value } : x)),
                    )
                  }
                  placeholder="Atributo"
                />
                <span className="w-10 shrink-0 text-right font-display text-lg font-semibold text-primary">
                  {s.score}
                </span>
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  className="shrink-0 text-destructive hover:bg-destructive/10"
                  onClick={() => setScores((prev) => prev.filter((_, i) => i !== idx))}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
              <Slider
                min={1}
                max={10}
                step={1}
                value={[s.score]}
                onValueChange={([v]) =>
                  setScores((prev) => prev.map((x, i) => (i === idx ? { ...x, score: v } : x)))
                }
              />
            </div>
          ))}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="as-notes">Notas (opcional)</Label>
          <Textarea id="as-notes" value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} />
        </div>
      </EntitySheetBody>

      <EntitySheetFooter>
        <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
          Cancelar
        </Button>
        <Button type="button" className="glow-primary" onClick={submit} disabled={disabled}>
          {save.isPending ? "Guardando…" : isEdit ? "Guardar cambios" : "Registrar evaluación"}
        </Button>
      </EntitySheetFooter>
    </EntitySheet>
  );
}

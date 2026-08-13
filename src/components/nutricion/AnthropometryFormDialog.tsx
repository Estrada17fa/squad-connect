import * as React from "react";
import { toast } from "sonner";
import { ChevronDown } from "lucide-react";
import {
  EntitySheet,
  EntitySheetBody,
  EntitySheetDescription,
  EntitySheetFooter,
  EntitySheetHeader,
  EntitySheetTitle,
} from "@/components/squad/EntitySheet";
import { PlayerPicker } from "@/components/squad/PlayerPicker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  useSaveAssessment,
  type AssessmentRow,
  type NutritionRosterMember,
} from "@/hooks/useNutrition";
import {
  ISAK_FIELD_KEYS,
  ISAK_SECTIONS,
  anthroResults,
  fmtNumber,
  somatotypeLabel,
} from "@/lib/nutricion";
import { cn } from "@/lib/utils";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  clubId: string;
  userId: string;
  players: NutritionRosterMember[];
  assessment?: AssessmentRow | null;
  fixedPlayerUserId?: string | null;
  onSaved?: () => void;
}

function todayISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** Estudio ISAK completo, en secciones colapsables para que sea llenable. */
export function AnthropometryFormDialog({
  open,
  onOpenChange,
  clubId,
  userId,
  players,
  assessment,
  fixedPlayerUserId,
  onSaved,
}: Props) {
  const save = useSaveAssessment(clubId, userId);
  const isEdit = !!assessment;

  const [playerUserId, setPlayerUserId] = React.useState("");
  const [date, setDate] = React.useState(todayISO());
  const [notes, setNotes] = React.useState("");
  const [values, setValues] = React.useState<Record<string, string>>({});
  const [openSections, setOpenSections] = React.useState<string[]>([ISAK_SECTIONS[0]!.key]);

  React.useEffect(() => {
    if (!open) return;
    setPlayerUserId(assessment?.player_user_id ?? fixedPlayerUserId ?? "");
    setDate(assessment?.assessed_at?.slice(0, 10) ?? todayISO());
    setNotes(assessment?.notes ?? "");
    const next: Record<string, string> = {};
    for (const k of ISAK_FIELD_KEYS) {
      const v = assessment?.[k];
      next[k] = v == null ? "" : String(v);
    }
    setValues(next);
    setOpenSections([ISAK_SECTIONS[0]!.key]);
  }, [open, assessment, fixedPlayerUserId]);

  const numeric = React.useMemo(() => {
    const out: Record<string, number | null> = {};
    for (const k of ISAK_FIELD_KEYS) {
      const raw = values[k];
      const n = raw == null || raw.trim() === "" ? null : Number(raw);
      out[k] = n != null && Number.isFinite(n) ? n : null;
    }
    return out;
  }, [values]);

  const results = React.useMemo(() => anthroResults(numeric), [numeric]);
  const player = players.find((p) => p.userId === playerUserId);
  const disabled = !player || !date || save.isPending;

  const toggle = (key: string) =>
    setOpenSections((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]));

  const submit = async () => {
    if (!player) return;
    try {
      await save.mutateAsync({
        id: assessment?.id ?? null,
        team_id: player.teamId,
        player_user_id: player.userId,
        assessed_at: date,
        notes: notes.trim() || null,
        values: numeric,
      });
      toast.success(isEdit ? "Estudio actualizado" : "Estudio registrado");
      onOpenChange(false);
      onSaved?.();
    } catch (e: any) {
      toast.error(e?.message ?? "No se pudo guardar el estudio");
    }
  };

  return (
    <EntitySheet open={open} onOpenChange={onOpenChange} size="lg">
      <EntitySheetHeader>
        <EntitySheetTitle>{isEdit ? "Editar estudio" : "Nuevo estudio antropométrico"}</EntitySheetTitle>
        <EntitySheetDescription>
          Protocolo ISAK. Todas las medidas son opcionales; se calculan IMC, % de grasa (Faulkner) y
          somatotipo con lo capturado.
        </EntitySheetDescription>
      </EntitySheetHeader>

      <EntitySheetBody className="space-y-5">
        <PlayerPicker
          id="nutri-anthro-player"
          players={players}
          value={playerUserId}
          onChange={setPlayerUserId}
          disabled={isEdit || !!fixedPlayerUserId}
          emptyMessage="No tienes categorías donde puedas registrar nutrición."
        />

        <div className="space-y-1.5">
          <Label htmlFor="an-date">Fecha del estudio</Label>
          <Input id="an-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>

        {/* Resultados calculados, siempre a la vista */}
        <div className="glass grid grid-cols-2 gap-3 rounded-lg p-3 sm:grid-cols-4">
          <Result label="IMC" value={fmtNumber(results.bmi, 1)} />
          <Result label="% grasa" value={fmtNumber(results.bodyFat, 1, " %")} />
          <Result label="Σ 6 pliegues" value={fmtNumber(results.sum6, 1, " mm")} />
          <Result
            label="Somatotipo"
            value={
              results.somatotype
                ? `${fmtNumber(results.somatotype.endomorphy)}-${fmtNumber(results.somatotype.mesomorphy)}-${fmtNumber(results.somatotype.ectomorphy)}`
                : "—"
            }
          />
        </div>

        {ISAK_SECTIONS.map((section) => {
          const isOpen = openSections.includes(section.key);
          const filled = section.fields.filter((f) => (values[f.key] ?? "").trim() !== "").length;
          return (
            <div key={section.key} className="glass rounded-lg">
              <button
                type="button"
                onClick={() => toggle(section.key)}
                className="flex w-full items-center justify-between gap-2 p-3 text-left"
              >
                <span className="font-display text-sm font-semibold">{section.title}</span>
                <span className="flex items-center gap-2 text-xs text-muted-foreground">
                  {filled}/{section.fields.length}
                  <ChevronDown className={cn("h-4 w-4 transition-transform", isOpen && "rotate-180")} />
                </span>
              </button>
              {isOpen ? (
                <div className="grid grid-cols-1 gap-3 border-t border-white/5 p-3 sm:grid-cols-2">
                  {section.fields.map((f) => (
                    <div key={f.key} className="space-y-1.5">
                      <Label htmlFor={`isak-${f.key}`} className="text-xs">
                        {f.label} ({f.unit})
                      </Label>
                      <Input
                        id={`isak-${f.key}`}
                        type="number"
                        inputMode="decimal"
                        step="0.1"
                        value={values[f.key] ?? ""}
                        onChange={(e) => setValues((v) => ({ ...v, [f.key]: e.target.value }))}
                      />
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          );
        })}

        <div className="space-y-1.5">
          <Label htmlFor="an-notes">Notas</Label>
          <Textarea
            id="an-notes"
            rows={3}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Observaciones del estudio"
          />
        </div>

        {results.somatotype ? (
          <p className="text-xs text-muted-foreground">{somatotypeLabel(results.somatotype)}</p>
        ) : null}
      </EntitySheetBody>

      <EntitySheetFooter>
        <Button variant="ghost" onClick={() => onOpenChange(false)}>
          Cancelar
        </Button>
        <Button className="glow-primary" disabled={disabled} onClick={submit}>
          {save.isPending ? "Guardando…" : "Guardar estudio"}
        </Button>
      </EntitySheetFooter>
    </EntitySheet>
  );
}

function Result({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <p className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="truncate font-display text-base font-semibold text-foreground">{value}</p>
    </div>
  );
}

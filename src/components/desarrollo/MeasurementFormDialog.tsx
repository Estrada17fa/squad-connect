import * as React from "react";
import { toast } from "sonner";
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
import { MEASUREMENT_PRESETS } from "@/lib/desarrollo";
import {
  useSaveMeasurement,
  type DevelopmentRosterMember,
  type MeasurementRow,
} from "@/hooks/useDevelopment";
import { PlayerSelect } from "./PlayerSelect";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  clubId: string;
  userId: string;
  players: DevelopmentRosterMember[];
  measurement?: MeasurementRow | null;
  defaultPlayerUserId?: string | null;
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

/** Registro de una medición física puntual (peso, % grasa, salto…). */
export function MeasurementFormDialog({
  open,
  onOpenChange,
  clubId,
  userId,
  players,
  measurement,
  defaultPlayerUserId,
}: Props) {
  const isEdit = !!measurement;
  const save = useSaveMeasurement(clubId, userId);

  const [playerUserId, setPlayerUserId] = React.useState("");
  const [date, setDate] = React.useState(today());
  const [metric, setMetric] = React.useState(MEASUREMENT_PRESETS[0]!.metric);
  const [unit, setUnit] = React.useState(MEASUREMENT_PRESETS[0]!.unit);
  const [value, setValue] = React.useState("");
  const [notes, setNotes] = React.useState("");

  React.useEffect(() => {
    if (!open) return;
    setPlayerUserId(measurement?.player_user_id ?? defaultPlayerUserId ?? "");
    setDate(measurement?.measured_on ?? today());
    setMetric(measurement?.metric ?? MEASUREMENT_PRESETS[0]!.metric);
    setUnit(measurement?.unit ?? MEASUREMENT_PRESETS[0]!.unit);
    setValue(measurement ? String(measurement.value) : "");
    setNotes(measurement?.notes ?? "");
  }, [open, measurement, defaultPlayerUserId]);

  const player = players.find((p) => p.userId === playerUserId);
  const numeric = Number(value);
  const disabled = !player || !metric.trim() || !value.trim() || Number.isNaN(numeric) || save.isPending;

  const submit = () => {
    if (!player) return;
    save.mutate(
      {
        id: measurement?.id ?? null,
        team_id: player.teamId,
        player_user_id: player.userId,
        measured_on: date,
        metric: metric.trim(),
        value: numeric,
        unit: unit.trim() || null,
        notes: notes.trim() || null,
      },
      {
        onSuccess: () => {
          toast.success(isEdit ? "Medición actualizada" : "Medición registrada");
          onOpenChange(false);
        },
        onError: (e: any) => toast.error(e?.message ?? "No se pudo guardar"),
      },
    );
  };

  return (
    <EntitySheet open={open} onOpenChange={onOpenChange} size="lg">
      <EntitySheetHeader>
        <EntitySheetTitle>{isEdit ? "Editar medición" : "Nueva medición física"}</EntitySheetTitle>
        <EntitySheetDescription>
          Cada registro lleva fecha para poder ver la evolución del jugador.
        </EntitySheetDescription>
      </EntitySheetHeader>

      <EntitySheetBody>
        <PlayerSelect
          id="me-player"
          players={players}
          value={playerUserId}
          onChange={setPlayerUserId}
          disabled={isEdit}
        />

        <div className="space-y-1.5">
          <Label htmlFor="me-date">Fecha</Label>
          <Input id="me-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="me-metric">Medición</Label>
          <Input
            id="me-metric"
            list="me-metric-presets"
            value={metric}
            onChange={(e) => {
              setMetric(e.target.value);
              const preset = MEASUREMENT_PRESETS.find((p) => p.metric === e.target.value);
              if (preset) setUnit(preset.unit);
            }}
            placeholder="Peso, % grasa corporal, salto vertical…"
          />
          <datalist id="me-metric-presets">
            {MEASUREMENT_PRESETS.map((p) => (
              <option key={p.metric} value={p.metric} />
            ))}
          </datalist>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="me-value">Valor</Label>
            <Input
              id="me-value"
              inputMode="decimal"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder="72.5"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="me-unit">Unidad</Label>
            <Input
              id="me-unit"
              value={unit}
              onChange={(e) => setUnit(e.target.value)}
              placeholder="kg, cm, %"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="me-notes">Notas (opcional)</Label>
          <Textarea id="me-notes" value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} />
        </div>
      </EntitySheetBody>

      <EntitySheetFooter>
        <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
          Cancelar
        </Button>
        <Button type="button" className="glow-primary" onClick={submit} disabled={disabled}>
          {save.isPending ? "Guardando…" : isEdit ? "Guardar cambios" : "Registrar"}
        </Button>
      </EntitySheetFooter>
    </EntitySheet>
  );
}

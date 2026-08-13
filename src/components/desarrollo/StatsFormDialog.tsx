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
import {
  useSaveCompetitionStats,
  type CompetitionStatsRow,
  type DevelopmentRosterMember,
} from "@/hooks/useDevelopment";
import { PlayerSelect } from "./PlayerSelect";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  clubId: string;
  userId: string;
  players: DevelopmentRosterMember[];
  stats?: CompetitionStatsRow | null;
  defaultPlayerUserId?: string | null;
}

const NUMBER_FIELDS = [
  { key: "matches_played", label: "Partidos jugados" },
  { key: "matches_started", label: "Titularidades" },
  { key: "minutes_played", label: "Minutos" },
  { key: "goals", label: "Goles" },
  { key: "assists", label: "Asistencias" },
  { key: "yellow_cards", label: "Amarillas" },
  { key: "red_cards", label: "Rojas" },
] as const;

type NumberKey = (typeof NUMBER_FIELDS)[number]["key"];

const EMPTY: Record<NumberKey, string> = {
  matches_played: "0",
  matches_started: "0",
  minutes_played: "0",
  goals: "0",
  assists: "0",
  yellow_cards: "0",
  red_cards: "0",
};

/** Captura manual de las estadísticas de competencia (mañana llegarán de Torneo). */
export function StatsFormDialog({
  open,
  onOpenChange,
  clubId,
  userId,
  players,
  stats,
  defaultPlayerUserId,
}: Props) {
  const isEdit = !!stats;
  const save = useSaveCompetitionStats(clubId, userId);

  const [playerUserId, setPlayerUserId] = React.useState("");
  const [season, setSeason] = React.useState("");
  const [start, setStart] = React.useState("");
  const [end, setEnd] = React.useState("");
  const [notes, setNotes] = React.useState("");
  const [numbers, setNumbers] = React.useState<Record<NumberKey, string>>(EMPTY);

  React.useEffect(() => {
    if (!open) return;
    setPlayerUserId(stats?.player_user_id ?? defaultPlayerUserId ?? "");
    setSeason(stats?.season_name ?? "");
    setStart(stats?.period_start ?? "");
    setEnd(stats?.period_end ?? "");
    setNotes(stats?.notes ?? "");
    setNumbers(
      stats
        ? (Object.fromEntries(
            NUMBER_FIELDS.map((f) => [f.key, String(stats[f.key] ?? 0)]),
          ) as Record<NumberKey, string>)
        : EMPTY,
    );
  }, [open, stats, defaultPlayerUserId]);

  const player = players.find((p) => p.userId === playerUserId);
  const disabled = !player || !season.trim() || save.isPending;
  const num = (k: NumberKey) => {
    const n = Number(numbers[k]);
    return Number.isFinite(n) && n >= 0 ? Math.round(n) : 0;
  };

  const submit = () => {
    if (!player) return;
    save.mutate(
      {
        id: stats?.id ?? null,
        team_id: player.teamId,
        player_user_id: player.userId,
        season_name: season.trim(),
        period_start: start || null,
        period_end: end || null,
        matches_played: num("matches_played"),
        matches_started: num("matches_started"),
        minutes_played: num("minutes_played"),
        goals: num("goals"),
        assists: num("assists"),
        yellow_cards: num("yellow_cards"),
        red_cards: num("red_cards"),
        notes: notes.trim() || null,
      },
      {
        onSuccess: () => {
          toast.success(isEdit ? "Estadísticas actualizadas" : "Estadísticas registradas");
          onOpenChange(false);
        },
        onError: (e: any) => toast.error(e?.message ?? "No se pudo guardar"),
      },
    );
  };

  return (
    <EntitySheet open={open} onOpenChange={onOpenChange} size="lg">
      <EntitySheetHeader>
        <EntitySheetTitle>
          {isEdit ? "Editar estadísticas" : "Estadísticas de competencia"}
        </EntitySheetTitle>
        <EntitySheetDescription>
          Captura por temporada o torneo. Más adelante estos números llegarán solos desde Torneo.
        </EntitySheetDescription>
      </EntitySheetHeader>

      <EntitySheetBody>
        <PlayerSelect
          id="st-player"
          players={players}
          value={playerUserId}
          onChange={setPlayerUserId}
          disabled={isEdit}
        />

        <div className="space-y-1.5">
          <Label htmlFor="st-season">Temporada o torneo</Label>
          <Input
            id="st-season"
            value={season}
            onChange={(e) => setSeason(e.target.value)}
            placeholder="Apertura 2026 · Liga TDP"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="st-start">Desde (opcional)</Label>
            <Input id="st-start" type="date" value={start} onChange={(e) => setStart(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="st-end">Hasta (opcional)</Label>
            <Input id="st-end" type="date" value={end} onChange={(e) => setEnd(e.target.value)} />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {NUMBER_FIELDS.map((f) => (
            <div key={f.key} className="space-y-1.5">
              <Label htmlFor={`st-${f.key}`}>{f.label}</Label>
              <Input
                id={`st-${f.key}`}
                inputMode="numeric"
                value={numbers[f.key]}
                onChange={(e) => setNumbers((prev) => ({ ...prev, [f.key]: e.target.value }))}
              />
            </div>
          ))}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="st-notes">Notas (opcional)</Label>
          <Textarea id="st-notes" value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} />
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

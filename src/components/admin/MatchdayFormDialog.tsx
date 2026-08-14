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
import { fromLocalInputValue } from "@/lib/calendar-utils";
import { useSaveMatchday, type MatchInput } from "@/hooks/useTournamentMatches";
import type { TournamentTeamRow } from "@/hooks/useTournaments";
import { TeamSelect } from "./MatchFormDialog";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  clubId: string;
  userId: string;
  tournamentId: string;
  teams: TournamentTeamRow[];
  defaultMatchday?: number;
}

interface RowState {
  key: string;
  home: string;
  away: string;
  kickoff: string;
  venue: string;
}

const emptyRow = (): RowState => ({
  key: crypto.randomUUID(),
  home: "",
  away: "",
  kickoff: "",
  venue: "",
});

/** Alta de varios enfrentamientos de una misma jornada en un solo guardado. */
export function MatchdayFormDialog({
  open,
  onOpenChange,
  clubId,
  userId,
  tournamentId,
  teams,
  defaultMatchday = 1,
}: Props) {
  const save = useSaveMatchday();
  const [matchday, setMatchday] = React.useState(String(defaultMatchday));
  const [rows, setRows] = React.useState<RowState[]>([emptyRow(), emptyRow()]);

  React.useEffect(() => {
    if (!open) return;
    setMatchday(String(defaultMatchday));
    setRows([emptyRow(), emptyRow()]);
  }, [open, defaultMatchday]);

  const update = (key: string, patch: Partial<RowState>) =>
    setRows((prev) => prev.map((r) => (r.key === key ? { ...r, ...patch } : r)));

  async function handleSave() {
    const filled = rows.filter((r) => r.home || r.away);
    if (!filled.length) return toast.error("Agrega al menos un enfrentamiento");
    for (const r of filled) {
      if (!r.home || !r.away) return toast.error("Cada enfrentamiento necesita local y visitante");
      if (r.home === r.away) return toast.error("Un equipo no puede enfrentarse a sí mismo");
    }
    const payload: MatchInput[] = filled.map((r) => ({
      tournament_id: tournamentId,
      club_id: clubId,
      matchday: matchday.trim() ? Number(matchday) : null,
      home_team_id: r.home,
      away_team_id: r.away,
      kickoff_at: r.kickoff ? fromLocalInputValue(r.kickoff) : null,
      location_id: null,
      venue: r.venue.trim() || null,
      status: "programado",
      notes: null,
      created_by: userId,
    }));
    try {
      await save.mutateAsync(payload);
      toast.success(`Jornada guardada (${payload.length} partidos)`);
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e?.message ?? "No se pudo guardar la jornada");
    }
  }

  return (
    <EntitySheet open={open} onOpenChange={onOpenChange} size="xl">
      <EntitySheetHeader>
        <EntitySheetTitle>Nueva jornada</EntitySheetTitle>
        <EntitySheetDescription>
          Arma varios enfrentamientos y guárdalos juntos.
        </EntitySheetDescription>
      </EntitySheetHeader>

      <EntitySheetBody>
        <div className="max-w-40 space-y-1.5">
          <Label htmlFor="md-num">Jornada</Label>
          <Input
            id="md-num"
            type="number"
            min={1}
            value={matchday}
            onChange={(e) => setMatchday(e.target.value)}
          />
        </div>

        <div className="space-y-3">
          {rows.map((r, i) => (
            <div
              key={r.key}
              className="space-y-2 rounded-xl bg-white/[0.04] p-3 ring-1 ring-inset ring-white/5"
            >
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Partido {i + 1}
                </p>
                {rows.length > 1 ? (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setRows((prev) => prev.filter((x) => x.key !== r.key))}
                    aria-label="Quitar partido"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                ) : null}
              </div>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <TeamSelect
                  teams={teams}
                  value={r.home}
                  onChange={(v) => update(r.key, { home: v })}
                  exclude={r.away}
                  placeholder="Local"
                />
                <TeamSelect
                  teams={teams}
                  value={r.away}
                  onChange={(v) => update(r.key, { away: v })}
                  exclude={r.home}
                  placeholder="Visitante"
                />
              </div>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <Input
                  type="datetime-local"
                  value={r.kickoff}
                  onChange={(e) => update(r.key, { kickoff: e.target.value })}
                  aria-label="Fecha y hora"
                />
                <Input
                  value={r.venue}
                  onChange={(e) => update(r.key, { venue: e.target.value })}
                  placeholder="Sede (opcional)"
                  aria-label="Sede"
                />
              </div>
            </div>
          ))}
        </div>

        <Button variant="secondary" size="sm" onClick={() => setRows((p) => [...p, emptyRow()])}>
          <Plus className="mr-2 h-3.5 w-3.5" /> Agregar partido
        </Button>
      </EntitySheetBody>

      <EntitySheetFooter>
        <Button variant="ghost" onClick={() => onOpenChange(false)}>
          Cancelar
        </Button>
        <Button onClick={handleSave} disabled={save.isPending}>
          {save.isPending ? "Guardando…" : "Guardar jornada"}
        </Button>
      </EntitySheetFooter>
    </EntitySheet>
  );
}

import * as React from "react";
import { toast } from "sonner";
import { Info, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  EntitySheet,
  EntitySheetBody,
  EntitySheetDescription,
  EntitySheetFooter,
  EntitySheetHeader,
  EntitySheetTitle,
} from "@/components/squad/EntitySheet";
import {
  useDeleteAdjustment,
  useSaveAdjustment,
  useTournamentAdjustments,
  type AdjustmentRow,
  type MatchRow,
} from "@/hooks/useTournamentMatches";
import type { TournamentTeamRow } from "@/hooks/useTournaments";
import { buildStandings, type PointsConfig } from "@/lib/torneo";
import { TeamSelect } from "./MatchFormDialog";
import { cn } from "@/lib/utils";

interface Props {
  tournamentId: string;
  clubId: string;
  userId: string;
  config: PointsConfig;
  teams: TournamentTeamRow[];
  matches: MatchRow[];
  canEdit: boolean;
}

export function StandingsTable({
  tournamentId,
  clubId,
  userId,
  config,
  teams,
  matches,
  canEdit,
}: Props) {
  const adjQ = useTournamentAdjustments(tournamentId);
  const [dialog, setDialog] = React.useState(false);

  const rows = React.useMemo(
    () =>
      buildStandings(
        config,
        teams.map((t) => ({
          id: t.id,
          name: t.name,
          is_our_team: t.is_our_team,
          crest_path: t.crest_path,
        })),
        matches.map((m) => ({
          home_team_id: m.home_team_id ?? "",
          away_team_id: m.away_team_id ?? "",
          home_goals: m.home_goals,
          away_goals: m.away_goals,
          status: m.status,
          shootout_winner_team_id: m.shootout_winner_team_id,
        })),
        adjQ.data ?? [],
      ),
    [config, teams, matches, adjQ.data],
  );

  if (!teams.length) {
    return <p className="text-sm text-muted-foreground">Registra equipos participantes para ver la tabla.</p>;
  }

  return (
    <div className="space-y-3">
      {canEdit ? (
        <Button size="sm" variant="secondary" onClick={() => setDialog(true)}>
          <Plus className="mr-2 h-3.5 w-3.5" /> Ajuste de puntos
        </Button>
      ) : null}

      <div className="-mx-1 overflow-x-auto px-1">
        <table className="w-full min-w-[36rem] border-separate border-spacing-y-1 text-sm">
          <thead>
            <tr className="text-xs uppercase tracking-wider text-muted-foreground">
              <th className="px-2 py-1 text-left">#</th>
              <th className="px-2 py-1 text-left">Equipo</th>
              <th className="px-2 py-1 text-right">JJ</th>
              <th className="px-2 py-1 text-right">G</th>
              <th className="px-2 py-1 text-right">E</th>
              <th className="px-2 py-1 text-right">P</th>
              <th className="px-2 py-1 text-right">GF</th>
              <th className="px-2 py-1 text-right">GC</th>
              <th className="px-2 py-1 text-right">DIF</th>
              <th className="px-2 py-1 text-right">Pts</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr
                key={r.team_id}
                className={cn(
                  "bg-white/[0.04] ring-1 ring-inset ring-white/5",
                  r.is_our_team && "bg-primary/10 ring-primary/30",
                )}
              >
                <td className="rounded-l-lg px-2 py-2 text-muted-foreground">{r.position}</td>
                <td className="px-2 py-2">
                  <span className="font-medium">{r.name}</span>
                  {r.adjustment !== 0 ? (
                    <span
                      className="ml-2 inline-flex items-center gap-1 text-xs text-amber-400"
                      title={r.adjustment_reasons.join(" · ") || "Ajuste manual"}
                    >
                      <Info className="h-3 w-3" />
                      {r.adjustment > 0 ? `+${r.adjustment}` : r.adjustment}
                    </span>
                  ) : null}
                </td>
                <td className="px-2 py-2 text-right">{r.played}</td>
                <td className="px-2 py-2 text-right">{r.won}</td>
                <td className="px-2 py-2 text-right">{r.drawn}</td>
                <td className="px-2 py-2 text-right">{r.lost}</td>
                <td className="px-2 py-2 text-right">{r.goals_for}</td>
                <td className="px-2 py-2 text-right">{r.goals_against}</td>
                <td className="px-2 py-2 text-right">{r.goal_diff}</td>
                <td className="rounded-r-lg px-2 py-2 text-right font-semibold">{r.points}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {(adjQ.data ?? []).length ? (
        <div className="space-y-1.5">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Ajustes manuales
          </p>
          {(adjQ.data ?? []).map((a) => (
            <AdjustmentItem
              key={a.id}
              adjustment={a}
              teamName={teams.find((t) => t.id === a.team_id)?.name ?? "Equipo"}
              canEdit={canEdit}
            />
          ))}
        </div>
      ) : null}

      <PointAdjustmentDialog
        open={dialog}
        onOpenChange={setDialog}
        tournamentId={tournamentId}
        clubId={clubId}
        userId={userId}
        teams={teams}
      />
    </div>
  );
}

function AdjustmentItem({
  adjustment,
  teamName,
  canEdit,
}: {
  adjustment: AdjustmentRow;
  teamName: string;
  canEdit: boolean;
}) {
  const del = useDeleteAdjustment();
  return (
    <div className="flex items-center gap-2 rounded-lg bg-white/[0.03] px-3 py-2 text-sm ring-1 ring-inset ring-white/5">
      <span className="font-medium">{teamName}</span>
      <span className={adjustment.points < 0 ? "text-destructive" : "text-primary"}>
        {adjustment.points > 0 ? `+${adjustment.points}` : adjustment.points} pts
      </span>
      <span className="min-w-0 flex-1 truncate text-muted-foreground">{adjustment.reason ?? ""}</span>
      {canEdit ? (
        <Button
          size="sm"
          variant="ghost"
          aria-label="Eliminar ajuste"
          disabled={del.isPending}
          onClick={async () => {
            try {
              await del.mutateAsync(adjustment);
              toast.success("Ajuste eliminado");
            } catch (e: any) {
              toast.error(e?.message ?? "No se pudo eliminar");
            }
          }}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      ) : null}
    </div>
  );
}

function PointAdjustmentDialog({
  open,
  onOpenChange,
  tournamentId,
  clubId,
  userId,
  teams,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  tournamentId: string;
  clubId: string;
  userId: string;
  teams: TournamentTeamRow[];
}) {
  const save = useSaveAdjustment();
  const [teamId, setTeamId] = React.useState("");
  const [points, setPoints] = React.useState("");
  const [reason, setReason] = React.useState("");

  React.useEffect(() => {
    if (!open) return;
    setTeamId("");
    setPoints("");
    setReason("");
  }, [open]);

  async function handleSave() {
    const value = Number(points);
    if (!teamId) return toast.error("Elige el equipo");
    if (!points.trim() || Number.isNaN(value) || value === 0) {
      return toast.error("Captura los puntos a sumar o restar");
    }
    try {
      await save.mutateAsync({
        tournament_id: tournamentId,
        club_id: clubId,
        team_id: teamId,
        points: value,
        reason: reason.trim() || null,
        created_by: userId,
      });
      toast.success("Ajuste aplicado");
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e?.message ?? "No se pudo guardar el ajuste");
    }
  }

  return (
    <EntitySheet open={open} onOpenChange={onOpenChange}>
      <EntitySheetHeader>
        <EntitySheetTitle>Ajuste de puntos</EntitySheetTitle>
        <EntitySheetDescription>
          Suma o resta puntos a un equipo (por ejemplo una sanción).
        </EntitySheetDescription>
      </EntitySheetHeader>
      <EntitySheetBody>
        <div className="space-y-1.5">
          <Label>Equipo</Label>
          <TeamSelect teams={teams} value={teamId} onChange={setTeamId} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="adj-points">Puntos (usa negativo para restar)</Label>
          <Input
            id="adj-points"
            type="number"
            value={points}
            onChange={(e) => setPoints(e.target.value)}
            placeholder="-3"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="adj-reason">Motivo</Label>
          <Textarea
            id="adj-reason"
            rows={3}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Sanción por alineación indebida"
          />
        </div>
      </EntitySheetBody>
      <EntitySheetFooter>
        <Button variant="ghost" onClick={() => onOpenChange(false)}>
          Cancelar
        </Button>
        <Button onClick={handleSave} disabled={save.isPending}>
          {save.isPending ? "Guardando…" : "Aplicar ajuste"}
        </Button>
      </EntitySheetFooter>
    </EntitySheet>
  );
}

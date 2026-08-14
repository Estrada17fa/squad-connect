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
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { TeamSelect } from "@/components/admin/MatchFormDialog";
import { fromLocalInputValue, toLocalInputValue } from "@/lib/calendar-utils";
import type { MatchRow } from "@/hooks/useTournamentMatches";
import type { TournamentTeamRow } from "@/hooks/useTournaments";
import {
  useDeleteTie,
  useSaveTie,
  tieLegs,
  type PlayoffTieRow,
} from "@/hooks/useTournamentPlayoffs";
import { PLAYOFF_ROUND_LABEL, tieAggregate } from "@/lib/torneo";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  clubId: string;
  userId: string;
  tournamentId: string;
  teams: TournamentTeamRow[];
  matches: MatchRow[];
  roundSize: number;
  slot: number;
  tie: PlayoffTieRow | null;
  /** Ida y vuelta por defecto según la configuración del torneo. */
  defaultTwoLegs: boolean;
}

interface LegState {
  id?: string;
  kickoff: string;
  venue: string;
  home: string;
  away: string;
}

function emptyLeg(): LegState {
  return { kickoff: "", venue: "", home: "", away: "" };
}

/** Alta y captura de una llave de fase final (uno o dos partidos). */
export function PlayoffTieDialog({
  open,
  onOpenChange,
  clubId,
  userId,
  tournamentId,
  teams,
  matches,
  roundSize,
  slot,
  tie,
  defaultTwoLegs,
}: Props) {
  const save = useSaveTie();
  const del = useDeleteTie();

  const [homeId, setHomeId] = React.useState("");
  const [awayId, setAwayId] = React.useState("");
  const [twoLegs, setTwoLegs] = React.useState(defaultTwoLegs);
  const [notes, setNotes] = React.useState("");
  const [legs, setLegs] = React.useState<LegState[]>([emptyLeg()]);
  const [scores, setScores] = React.useState<{ h: string; a: string }[]>([{ h: "", a: "" }]);
  const [winner, setWinner] = React.useState<string>("");

  const existing = React.useMemo(() => tieLegs(matches, tie?.id), [matches, tie?.id]);

  React.useEffect(() => {
    if (!open) return;
    const h = tie?.home_team_id ?? "";
    const a = tie?.away_team_id ?? "";
    setHomeId(h);
    setAwayId(a);
    const two = tie?.two_legs ?? defaultTwoLegs;
    setTwoLegs(two);
    setNotes(tie?.notes ?? "");
    setWinner(tie?.winner_team_id ?? "");
    const count = two ? 2 : 1;
    const next: LegState[] = [];
    const nextScores: { h: string; a: string }[] = [];
    for (let i = 0; i < count; i++) {
      const m = existing[i];
      next.push({
        id: m?.id,
        kickoff: toLocalInputValue(m?.kickoff_at ?? null),
        venue: m?.venue ?? "",
        home: m?.home_team_id ?? (i === 0 ? h : a),
        away: m?.away_team_id ?? (i === 0 ? a : h),
      });
      nextScores.push({
        h: m?.home_goals != null ? String(m.home_goals) : "",
        a: m?.away_goals != null ? String(m.away_goals) : "",
      });
    }
    setLegs(next);
    setScores(nextScores);
  }, [open, tie?.id]);

  // Al cambiar ida/vuelta se ajusta el número de partidos sin perder lo capturado.
  React.useEffect(() => {
    const count = twoLegs ? 2 : 1;
    setLegs((ls) => {
      if (ls.length === count) return ls;
      if (count === 1) return ls.slice(0, 1);
      return [...ls, { ...emptyLeg(), home: awayId, away: homeId }];
    });
    setScores((s) => (s.length === count ? s : count === 1 ? s.slice(0, 1) : [...s, { h: "", a: "" }]));
  }, [twoLegs, homeId, awayId]);

  const legLike = legs.map((l, i) => ({
    home_team_id: l.home || null,
    away_team_id: l.away || null,
    home_goals: scores[i]?.h === "" ? null : Number(scores[i]?.h),
    away_goals: scores[i]?.a === "" ? null : Number(scores[i]?.a),
  }));
  const agg = tieAggregate(legLike, homeId || null, awayId || null);

  // Ganador sugerido por marcador global; el empate se resuelve a mano.
  React.useEffect(() => {
    if (!agg.hasScore || agg.tied) return;
    setWinner(agg.winner === "home" ? homeId : awayId);
  }, [agg.hasScore, agg.tied, agg.winner, homeId, awayId]);

  const homeName = teams.find((t) => t.id === homeId)?.name ?? "Local";
  const awayName = teams.find((t) => t.id === awayId)?.name ?? "Visitante";

  const handleSave = async () => {
    if (!homeId || !awayId) {
      toast.error("Elige los dos equipos de la llave");
      return;
    }
    try {
      await save.mutateAsync({
        id: tie?.id,
        tournament_id: tournamentId,
        club_id: clubId,
        round_size: roundSize,
        slot,
        home_team_id: homeId,
        away_team_id: awayId,
        winner_team_id: winner || null,
        two_legs: twoLegs,
        notes: notes.trim() || null,
        legs: legs.map((l, i) => ({
          id: l.id,
          leg: i + 1,
          home_team_id: l.home || homeId,
          away_team_id: l.away || awayId,
          kickoff_at: l.kickoff ? fromLocalInputValue(l.kickoff) : null,
          venue: l.venue.trim() || null,
          home_goals: scores[i]?.h === "" ? null : Number(scores[i]?.h),
          away_goals: scores[i]?.a === "" ? null : Number(scores[i]?.a),
        })),
        existingLegIds: existing.map((m) => m.id),
        created_by: userId,
      });
      toast.success("Llave guardada");
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e?.message ?? "No se pudo guardar la llave");
    }
  };

  return (
    <EntitySheet open={open} onOpenChange={onOpenChange}>
      <EntitySheetHeader>
        <EntitySheetTitle>{PLAYOFF_ROUND_LABEL[roundSize] ?? "Llave"}</EntitySheetTitle>
        <EntitySheetDescription>
          Llave {slot + 1}. El ganador pasa solo a la ronda siguiente.
        </EntitySheetDescription>
      </EntitySheetHeader>

      <EntitySheetBody>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label>Equipo 1</Label>
            <TeamSelect teams={teams} value={homeId} onChange={setHomeId} exclude={awayId} />
          </div>
          <div className="space-y-1.5">
            <Label>Equipo 2</Label>
            <TeamSelect teams={teams} value={awayId} onChange={setAwayId} exclude={homeId} />
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 rounded-xl bg-white/[0.03] p-3 ring-1 ring-inset ring-white/5">
          <div className="min-w-0">
            <p className="text-sm font-medium">Ida y vuelta</p>
            <p className="text-xs text-muted-foreground">Desactívalo para partido único.</p>
          </div>
          <Switch checked={twoLegs} onCheckedChange={setTwoLegs} />
        </div>

        {legs.map((l, i) => (
          <div
            key={i}
            className="space-y-3 rounded-xl bg-white/[0.03] p-3 ring-1 ring-inset ring-white/5"
          >
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {twoLegs ? (i === 0 ? "Partido de ida" : "Partido de vuelta") : "Partido único"}
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Fecha y hora</Label>
                <Input
                  type="datetime-local"
                  value={l.kickoff}
                  onChange={(e) =>
                    setLegs((ls) => ls.map((x, j) => (j === i ? { ...x, kickoff: e.target.value } : x)))
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Sede</Label>
                <Input
                  value={l.venue}
                  onChange={(e) =>
                    setLegs((ls) => ls.map((x, j) => (j === i ? { ...x, venue: e.target.value } : x)))
                  }
                  placeholder="Estadio o cancha"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">
                  {teams.find((t) => t.id === l.home)?.name ?? "Local"}
                </Label>
                <Input
                  type="number"
                  min={0}
                  value={scores[i]?.h ?? ""}
                  onChange={(e) =>
                    setScores((s) => s.map((x, j) => (j === i ? { ...x, h: e.target.value } : x)))
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">
                  {teams.find((t) => t.id === l.away)?.name ?? "Visitante"}
                </Label>
                <Input
                  type="number"
                  min={0}
                  value={scores[i]?.a ?? ""}
                  onChange={(e) =>
                    setScores((s) => s.map((x, j) => (j === i ? { ...x, a: e.target.value } : x)))
                  }
                />
              </div>
            </div>
          </div>
        ))}

        {agg.hasScore ? (
          <div className="space-y-2 rounded-xl bg-white/[0.03] p-3 ring-1 ring-inset ring-white/5">
            <p className="text-sm">
              Global: {homeName} {agg.home} — {agg.away} {awayName}
            </p>
            {agg.tied ? (
              <>
                <p className="text-xs text-muted-foreground">
                  Empate global: elige quién avanza (penales o criterio del torneo).
                </p>
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant={winner === homeId ? "secondary" : "ghost"}
                    onClick={() => setWinner(homeId)}
                  >
                    {homeName}
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant={winner === awayId ? "secondary" : "ghost"}
                    onClick={() => setWinner(awayId)}
                  >
                    {awayName}
                  </Button>
                </div>
              </>
            ) : (
              <p className="text-xs text-muted-foreground">
                Avanza {winner === awayId ? awayName : homeName}.
              </p>
            )}
          </div>
        ) : null}

        <div className="space-y-1.5">
          <Label>Notas</Label>
          <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
        </div>
      </EntitySheetBody>

      <EntitySheetFooter>
        {tie ? (
          <Button
            type="button"
            variant="ghost"
            disabled={del.isPending}
            onClick={async () => {
              try {
                await del.mutateAsync(tie);
                toast.success("Llave eliminada");
                onOpenChange(false);
              } catch (e: any) {
                toast.error(e?.message ?? "No se pudo eliminar");
              }
            }}
          >
            Eliminar llave
          </Button>
        ) : null}
        <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>
          Cancelar
        </Button>
        <Button type="button" onClick={handleSave} disabled={save.isPending}>
          {save.isPending ? "Guardando…" : "Guardar llave"}
        </Button>
      </EntitySheetFooter>
    </EntitySheet>
  );
}

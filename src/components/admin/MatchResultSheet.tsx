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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PlayerPicker, type PickerPlayer } from "@/components/squad/PlayerPicker";
import { useRoster } from "@/hooks/useRoster";
import {
  useSaveMatchResult,
  useTournamentGoals,
  type MatchRow,
} from "@/hooks/useTournamentMatches";
import type { TournamentTeamRow } from "@/hooks/useTournaments";
import { matchPointsSummary, needsShootout, type PointsConfig } from "@/lib/torneo";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  match: MatchRow | null;
  teams: TournamentTeamRow[];
  config: PointsConfig;
  clubId: string;
  userId: string;
  /** Categoría del torneo, para el plantel de nuestro equipo. */
  teamId: string | null;
}

interface ScorerRow {
  key: string;
  teamId: string;
  playerUserId: string;
  playerName: string;
  goals: string;
}

const newScorer = (teamId: string): ScorerRow => ({
  key: crypto.randomUUID(),
  teamId,
  playerUserId: "",
  playerName: "",
  goals: "1",
});

export function MatchResultSheet({
  open,
  onOpenChange,
  match,
  teams,
  config,
  clubId,
  userId,
  teamId,
}: Props) {
  const save = useSaveMatchResult();
  const goalsQ = useTournamentGoals(open && match ? match.tournament_id : null);
  const rosterQ = useRoster(open ? clubId : null, teamId);

  const [home, setHome] = React.useState("");
  const [away, setAway] = React.useState("");
  const [shootout, setShootout] = React.useState<string>("");
  const [scorers, setScorers] = React.useState<ScorerRow[]>([]);

  const matchGoals = React.useMemo(
    () => (goalsQ.data ?? []).filter((g) => g.match_id === match?.id),
    [goalsQ.data, match?.id],
  );

  React.useEffect(() => {
    if (!open || !match) return;
    setHome(match.home_goals != null ? String(match.home_goals) : "");
    setAway(match.away_goals != null ? String(match.away_goals) : "");
    setShootout(match.shootout_winner_team_id ?? "");
    setScorers(
      matchGoals.map((g) => ({
        key: g.id,
        teamId: g.team_id,
        playerUserId: g.player_user_id ?? "",
        playerName: g.player_name ?? "",
        goals: String(g.goals),
      })),
    );
    // Se rellena una vez por apertura del partido.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, match?.id, goalsQ.isSuccess]);

  const homeTeam = teams.find((t) => t.id === match?.home_team_id) ?? null;
  const awayTeam = teams.find((t) => t.id === match?.away_team_id) ?? null;

  const hg = home.trim() === "" ? null : Number(home);
  const ag = away.trim() === "" ? null : Number(away);
  const askShootout = needsShootout(config, hg, ag);

  React.useEffect(() => {
    if (!askShootout && shootout) setShootout("");
  }, [askShootout, shootout]);

  const players: PickerPlayer[] = React.useMemo(
    () =>
      (rosterQ.data ?? [])
        .filter((m) => m.playerId)
        .map((m) => ({
          playerId: m.playerId ?? undefined,
          userId: m.userId,
          teamId: m.teamId ?? "sin-categoria",
          teamName: m.teamName,
          fullName: m.fullName,
          avatarUrl: m.avatarUrl,
          jerseyNumber: m.jerseyNumber,
          position: m.position,
        })),
    [rosterQ.data],
  );

  const preview =
    match && hg != null && ag != null
      ? matchPointsSummary(
          config,
          {
            home_team_id: match.home_team_id ?? "",
            away_team_id: match.away_team_id ?? "",
            home_goals: hg,
            away_goals: ag,
            status: "jugado",
            shootout_winner_team_id: shootout || null,
          },
          homeTeam?.name ?? "Local",
          awayTeam?.name ?? "Visitante",
        )
      : null;

  const scorerTotal = (tid: string) =>
    scorers
      .filter((s) => s.teamId === tid)
      .reduce((acc, s) => acc + (Number(s.goals) || 0), 0);

  const mismatch =
    hg != null &&
    ag != null &&
    ((scorers.some((s) => s.teamId === match?.home_team_id) && scorerTotal(match?.home_team_id ?? "") !== hg) ||
      (scorers.some((s) => s.teamId === match?.away_team_id) && scorerTotal(match?.away_team_id ?? "") !== ag));

  async function handleSave() {
    if (!match) return;
    if (hg == null || ag == null || Number.isNaN(hg) || Number.isNaN(ag) || hg < 0 || ag < 0) {
      return toast.error("Captura el marcador de ambos equipos");
    }
    if (askShootout && !shootout) return toast.error("Indica quién ganó la tanda de penales");
    try {
      await save.mutateAsync({
        match,
        home_goals: hg,
        away_goals: ag,
        shootout_winner_team_id: askShootout ? shootout : null,
        goals: scorers
          .filter((s) => s.teamId && Number(s.goals) > 0)
          .map((s) => ({
            team_id: s.teamId,
            player_user_id: s.playerUserId || null,
            player_name: s.playerUserId ? null : s.playerName.trim() || null,
            goals: Number(s.goals),
          })),
        created_by: userId,
      });
      toast.success("Resultado guardado");
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e?.message ?? "No se pudo guardar el resultado");
    }
  }

  if (!match) return null;

  return (
    <EntitySheet open={open} onOpenChange={onOpenChange} size="xl">
      <EntitySheetHeader>
        <EntitySheetTitle>Registrar resultado</EntitySheetTitle>
        <EntitySheetDescription>
          {homeTeam?.name ?? "Local"} vs {awayTeam?.name ?? "Visitante"}
        </EntitySheetDescription>
      </EntitySheetHeader>

      <EntitySheetBody>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="res-home">{homeTeam?.name ?? "Local"}</Label>
            <Input
              id="res-home"
              type="number"
              min={0}
              value={home}
              onChange={(e) => setHome(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="res-away">{awayTeam?.name ?? "Visitante"}</Label>
            <Input
              id="res-away"
              type="number"
              min={0}
              value={away}
              onChange={(e) => setAway(e.target.value)}
            />
          </div>
        </div>

        {askShootout ? (
          <div className="space-y-1.5">
            <Label>Ganador de la tanda de penales</Label>
            <Select value={shootout} onValueChange={setShootout}>
              <SelectTrigger>
                <SelectValue placeholder="Elige equipo" />
              </SelectTrigger>
              <SelectContent>
                {homeTeam ? <SelectItem value={homeTeam.id}>{homeTeam.name}</SelectItem> : null}
                {awayTeam ? <SelectItem value={awayTeam.id}>{awayTeam.name}</SelectItem> : null}
              </SelectContent>
            </Select>
          </div>
        ) : null}

        {preview ? (
          <p className="rounded-lg bg-white/[0.04] px-3 py-2 text-sm text-muted-foreground ring-1 ring-inset ring-white/5">
            {preview}
          </p>
        ) : null}

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Goleadores
            </p>
            <div className="flex gap-1.5">
              {homeTeam ? (
                <Button size="sm" variant="secondary" onClick={() => setScorers((p) => [...p, newScorer(homeTeam.id)])}>
                  <Plus className="mr-1.5 h-3.5 w-3.5" /> Local
                </Button>
              ) : null}
              {awayTeam ? (
                <Button size="sm" variant="secondary" onClick={() => setScorers((p) => [...p, newScorer(awayTeam.id)])}>
                  <Plus className="mr-1.5 h-3.5 w-3.5" /> Visitante
                </Button>
              ) : null}
            </div>
          </div>

          {mismatch ? (
            <p className="text-xs text-amber-400">
              La suma de goleadores no coincide con el marcador capturado.
            </p>
          ) : null}

          {scorers.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Opcional: registra quién anotó para alimentar la tabla de goleo.
            </p>
          ) : (
            <div className="space-y-2">
              {scorers.map((s) => {
                const team = teams.find((t) => t.id === s.teamId);
                const ours = !!team?.is_our_team;
                return (
                  <div
                    key={s.key}
                    className="space-y-2 rounded-xl bg-white/[0.04] p-3 ring-1 ring-inset ring-white/5"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate text-sm font-medium">{team?.name ?? "Equipo"}</p>
                      <Button
                        size="sm"
                        variant="ghost"
                        aria-label="Quitar goleador"
                        onClick={() => setScorers((p) => p.filter((x) => x.key !== s.key))}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                    {ours ? (
                      <PlayerPicker
                        id={`scorer-${s.key}`}
                        label="Jugador"
                        players={players}
                        value={s.playerUserId}
                        onChange={(v) =>
                          setScorers((p) =>
                            p.map((x) => (x.key === s.key ? { ...x, playerUserId: v } : x)),
                          )
                        }
                        emptyMessage="No hay jugadores en el plantel de esta categoría."
                      />
                    ) : (
                      <div className="space-y-1.5">
                        <Label htmlFor={`sn-${s.key}`}>Goleador (opcional)</Label>
                        <Input
                          id={`sn-${s.key}`}
                          value={s.playerName}
                          onChange={(e) =>
                            setScorers((p) =>
                              p.map((x) => (x.key === s.key ? { ...x, playerName: e.target.value } : x)),
                            )
                          }
                          placeholder="Nombre del goleador"
                        />
                      </div>
                    )}
                    <div className="max-w-28 space-y-1.5">
                      <Label htmlFor={`sg-${s.key}`}>Goles</Label>
                      <Input
                        id={`sg-${s.key}`}
                        type="number"
                        min={1}
                        value={s.goals}
                        onChange={(e) =>
                          setScorers((p) =>
                            p.map((x) => (x.key === s.key ? { ...x, goals: e.target.value } : x)),
                          )
                        }
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </EntitySheetBody>

      <EntitySheetFooter>
        <Button variant="ghost" onClick={() => onOpenChange(false)}>
          Cancelar
        </Button>
        <Button onClick={handleSave} disabled={save.isPending}>
          {save.isPending ? "Guardando…" : "Guardar resultado"}
        </Button>
      </EntitySheetFooter>
    </EntitySheet>
  );
}

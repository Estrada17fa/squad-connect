import * as React from "react";
import { toast } from "sonner";
import { Minus, Plus } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useMatchCallupList, useSaveMatchLogistics, type MatchLogisticsRow, type OurMatch } from "@/hooks/useMatchOps";
import { useSaveMatchResult } from "@/hooks/useTournamentMatches";
import { TeamCrest } from "@/components/match/TeamCrest";
import { useCrestTeam } from "@/components/agenda/AgendaCards";
import { Avatar, BottomBar, shortName } from "./parts";

const OWN_GOAL = "__own_goal__";

function Counter({ value, onChange, disabled }: { value: number; onChange: (n: number) => void; disabled?: boolean }) {
  return (
    <div className="flex items-center gap-2">
      <button type="button" aria-label="Menos" disabled={disabled || value <= 0} onClick={() => onChange(value - 1)} className="flex h-10 w-10 items-center justify-center rounded-full bg-muted disabled:opacity-40"><Minus className="h-4 w-4" /></button>
      <span className="w-10 text-center text-4xl font-bold tabular-nums">{value}</span>
      <button type="button" aria-label="Más" disabled={disabled} onClick={() => onChange(value + 1)} className="flex h-10 w-10 items-center justify-center rounded-full bg-muted disabled:opacity-40"><Plus className="h-4 w-4" /></button>
    </div>
  );
}

export function ResultTab({ match, logistics, canEdit, userId }: { match: OurMatch; logistics: MatchLogisticsRow | null; canEdit: boolean; userId: string }) {
  const callups = useMatchCallupList(match.id).data ?? [];
  const goalsQ = useQuery({
    queryKey: ["match-goals", match.id],
    queryFn: async () => (await (supabase as any).from("tournament_match_goals").select("player_user_id, player_name, goals, team_id").eq("match_id", match.id)).data ?? [],
  });
  const save = useSaveMatchResult();
  const saveLog = useSaveMatchLogistics();
  const home = useCrestTeam(match.home);
  const away = useCrestTeam(match.away);

  const [hg, setHg] = React.useState(match.home_goals ?? 0);
  const [ag, setAg] = React.useState(match.away_goals ?? 0);
  const [notes, setNotes] = React.useState(logistics?.post_match_notes ?? "");
  const [scorers, setScorers] = React.useState<Record<string, number>>({});
  React.useEffect(() => {
    const s: Record<string, number> = {};
    for (const g of (goalsQ.data ?? []) as any[]) if (g.team_id === match.ours?.id) s[g.player_user_id ?? OWN_GOAL] = (s[g.player_user_id ?? OWN_GOAL] ?? 0) + g.goals;
    setScorers(s);
  }, [goalsQ.data, match.ours?.id]);

  const ourGoals = match.isHome ? hg : ag;
  const assignedGoals = Object.values(scorers).reduce((a, b) => a + b, 0);
  const setScorer = (id: string, n: number) => setScorers((s) => { const x = { ...s }; if (n <= 0) delete x[id]; else x[id] = n; return x; });

  async function submit() {
    if (assignedGoals > ourGoals) return toast.error(`Asignaste ${assignedGoals} goles y el marcador dice ${ourGoals}.`);
    try {
      await save.mutateAsync({
        match: { id: match.id, tournament_id: match.tournament_id, club_id: match.club_id } as any,
        home_goals: hg, away_goals: ag, shootout_winner_team_id: null, created_by: userId,
        goals: match.ours ? Object.entries(scorers).map(([id, goals]) => ({
          team_id: match.ours!.id, goals,
          player_user_id: id === OWN_GOAL ? null : id,
          player_name: id === OWN_GOAL ? "Autogol del rival" : callups.find((c) => c.user_id === id)?.full_name ?? null,
        })) : [],
      });
      await saveLog.mutateAsync({ matchId: match.id, clubId: match.club_id, createdBy: userId, post_match_notes: notes.trim() || null });
      goalsQ.refetch();
      toast.success("Resultado guardado · tabla y goleo actualizados");
    } catch (e: any) { toast.error(e.message ?? "No se pudo guardar"); }
  }

  const rows = [...callups.map((c) => ({ id: c.user_id, name: shortName(c.full_name), c })), { id: OWN_GOAL, name: "Autogol del rival", c: null }];

  return (
    <div className="space-y-5 pb-36">
      <div className="grid grid-cols-2 gap-3 rounded-2xl bg-card p-4">
        {[{ t: home, v: hg, set: setHg }, { t: away, v: ag, set: setAg }].map((x, i) => (
          <div key={i} className="flex flex-col items-center gap-2">
            <TeamCrest team={x.t} size="lg" />
            <span className="line-clamp-1 text-xs font-semibold">{x.t.shortName}</span>
            <Counter value={x.v} onChange={x.set} disabled={!canEdit} />
          </div>
        ))}
      </div>

      <section>
        <div className="mb-2 flex items-baseline justify-between">
          <h3 className="text-sm font-semibold">Goleadores</h3>
          <span className="text-[11px] text-muted-foreground">{assignedGoals} de {ourGoals} goles</span>
        </div>
        <div className="divide-y divide-border/50 overflow-hidden rounded-2xl bg-card">
          {rows.map((r) => (
            <div key={r.id} className="flex items-center gap-3 px-3 py-2">
              {r.c ? <Avatar name={r.c.full_name} url={r.c.avatar_url} number={r.c.jersey_number} /> : <span className="h-10 w-10" />}
              <span className="min-w-0 flex-1 truncate text-sm font-semibold">{r.name}</span>
              <div className="flex items-center gap-1">
                <button type="button" aria-label={`Quitar gol a ${r.name}`} disabled={!canEdit || !scorers[r.id]} onClick={() => setScorer(r.id, (scorers[r.id] ?? 0) - 1)} className="flex h-8 w-8 items-center justify-center rounded-full bg-muted disabled:opacity-30"><Minus className="h-3.5 w-3.5" /></button>
                <span className="w-6 text-center font-bold tabular-nums">{scorers[r.id] ?? 0}</span>
                <button type="button" aria-label={`Gol de ${r.name}`} disabled={!canEdit} onClick={() => setScorer(r.id, (scorers[r.id] ?? 0) + 1)} className="flex h-8 w-8 items-center justify-center rounded-full bg-muted disabled:opacity-30"><Plus className="h-3.5 w-3.5" /></button>
              </div>
            </div>
          ))}
        </div>
      </section>

      <label className="block space-y-1.5"><span className="text-xs font-semibold text-muted-foreground">Notas del partido</span>
        <textarea disabled={!canEdit} rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} className="w-full rounded-xl bg-muted px-3 py-3 text-sm outline-none" />
      </label>

      {canEdit ? (
        <BottomBar>
          <div className="flex-1 text-sm">{match.status === "jugado" ? "Jugado" : "Por jugar"}</div>
          <button type="button" disabled={save.isPending || saveLog.isPending} onClick={submit} className="min-h-11 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground disabled:opacity-50">Guardar resultado</button>
        </BottomBar>
      ) : null}
    </div>
  );
}

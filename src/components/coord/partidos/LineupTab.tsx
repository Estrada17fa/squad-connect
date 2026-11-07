import * as React from "react";
import { toast } from "sonner";
import { Copy, X } from "lucide-react";
import { useMatchCallupList, useMatchLineups, useSaveLineup, useSaveMatchLogistics, type MatchLogisticsRow, type OurMatch } from "@/hooks/useMatchOps";
import { TripSheet } from "@/components/coord/viajes/form";
import { assignSlot, canBuildLineup, canCopyLineup, cleanLineup, formationSlots, FORMATIONS, DEFAULT_FORMATION, MIN_LINEUP, substitutes } from "@/lib/partidos";
import { Avatar, BottomBar, Pitch, PosTag, StateTag, shortName, type PitchPlayer } from "./parts";
import { cn } from "@/lib/utils";

export function LineupTab({ match, logistics, canEdit, userId, prevMatchId }: {
  match: OurMatch; logistics: MatchLogisticsRow | null; canEdit: boolean; userId: string; prevMatchId: string | null;
}) {
  const listQ = useMatchCallupList(match.id);
  const callups = listQ.data ?? [];
  const lineupQ = useMatchLineups([match.id]);
  const prevQ = useMatchLineups(prevMatchId ? [prevMatchId] : []);
  const save = useSaveLineup();
  const saveLog = useSaveMatchLogistics();
  const published = !!logistics?.lineup_published_at;
  const ids = callups.map((c) => c.user_id);

  const saved = React.useMemo(() => {
    const a: Record<string, string> = {};
    for (const r of lineupQ.data ?? []) if (r.role === "titular" && r.slot) a[r.slot] = r.user_id;
    return a;
  }, [lineupQ.data]);
  const [formation, setFormation] = React.useState<string | null>(null);
  const [draft, setDraft] = React.useState<Record<string, string> | null>(null);
  React.useEffect(() => { setDraft(null); setFormation(null); }, [lineupQ.data, logistics?.formation]);
  const f = formation ?? logistics?.formation ?? DEFAULT_FORMATION;
  const assigned = cleanLineup(draft ?? saved, ids, f);
  const dirty = draft !== null || formation !== null;
  const [slot, setSlot] = React.useState<string | null>(null);

  const players = new Map<string, PitchPlayer>(callups.map((c) => [c.user_id, { user_id: c.user_id, name: c.full_name, avatar_url: c.avatar_url, number: c.jersey_number }]));
  const subs = substitutes(ids, assigned);

  if (!listQ.isLoading && !canBuildLineup(callups.length)) {
    return <p className="rounded-2xl bg-card px-4 py-6 text-center text-sm text-muted-foreground">La alineación se arma cuando hay al menos {MIN_LINEUP} convocados ({callups.length} ahora).</p>;
  }

  async function persist(publish: boolean) {
    try {
      await save.mutateAsync({ matchId: match.id, clubId: match.club_id, assigned, subs });
      await saveLog.mutateAsync({ matchId: match.id, clubId: match.club_id, createdBy: userId, formation: f, ...(publish ? { lineup_published_at: new Date().toISOString() } : {}) });
      toast.success(publish ? "Alineación publicada" : "Alineación guardada");
    } catch (e: any) { toast.error(e.message ?? "No se pudo guardar"); }
  }

  const prevAssigned: Record<string, string> = {};
  for (const r of prevQ.data ?? []) if (r.role === "titular" && r.slot) prevAssigned[r.slot] = r.user_id;
  const busy = save.isPending || saveLog.isPending;
  const slotLabel = formationSlots(f).find((s) => s.key === slot)?.label ?? "";

  return (
    <div className="space-y-4 pb-36">
      <StateTag published={published} at={logistics?.lineup_published_at} />
      <div className="flex gap-1 overflow-x-auto">
        {FORMATIONS.map((x) => (
          <button key={x} type="button" disabled={!canEdit} onClick={() => setFormation(x)}
            className={cn("min-h-9 shrink-0 rounded-full px-3 text-xs font-bold", x === f ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground")}>{x}</button>
        ))}
      </div>
      <Pitch formation={f} assigned={assigned} players={players} onSlot={canEdit ? setSlot : undefined} selected={slot} />
      {canEdit && prevMatchId && canCopyLineup(prevAssigned, ids) ? (
        <button type="button" onClick={() => setDraft(prevAssigned)} className="coord-press inline-flex min-h-10 items-center gap-2 px-1 text-sm font-semibold text-primary">
          <Copy className="h-4 w-4" /> Copiar alineación del partido anterior
        </button>
      ) : null}

      <section>
        <h3 className="mb-2 text-sm font-semibold">Suplentes ({subs.length})</h3>
        <div className="flex flex-wrap gap-3 rounded-2xl bg-card p-3">
          {subs.length ? subs.map((id) => { const p = players.get(id)!; return (
            <div key={id} className="flex w-14 flex-col items-center gap-1 text-center">
              <Avatar name={p.name} url={p.avatar_url} number={p.number} />
              <span className="w-full truncate text-[10px] font-semibold">{shortName(p.name).split(" ")[0]}</span>
            </div>); }) : <span className="text-sm text-muted-foreground">Todos los convocados están en la cancha.</span>}
        </div>
      </section>

      {canEdit ? (
        <BottomBar>
          <div className="min-w-0 flex-1 text-sm"><span className="font-bold">{Object.keys(assigned).length}</span>/11 titulares</div>
          {!published ? (
            <>
              {dirty ? <button type="button" disabled={busy} onClick={() => persist(false)} className="min-h-11 rounded-xl bg-muted px-3 text-sm font-semibold">Guardar</button> : null}
              <button type="button" disabled={busy || Object.keys(assigned).length < 11} onClick={() => persist(true)} className="min-h-11 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground disabled:opacity-50">Publicar alineación</button>
            </>
          ) : (
            <button type="button" disabled={busy || !dirty} onClick={() => persist(false)} className="min-h-11 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground disabled:opacity-50">{dirty ? "Guardar cambios" : "Publicada"}</button>
          )}
        </BottomBar>
      ) : null}

      <TripSheet open={!!slot} onOpenChange={(v) => !v && setSlot(null)} title={`Puesto ${slotLabel}`}>
        <div className="space-y-1 px-4 pb-6">
          {slot && assigned[slot] ? (
            <button type="button" onClick={() => { const n = { ...assigned }; delete n[slot]; setDraft(n); setSlot(null); }} className="coord-press flex min-h-11 w-full items-center gap-2 rounded-xl px-2 text-sm font-semibold text-destructive">
              <X className="h-4 w-4" /> Quitar de la cancha
            </button>
          ) : null}
          {callups.map((c) => {
            const at = Object.keys(assigned).find((k) => assigned[k] === c.user_id);
            return (
              <button key={c.user_id} type="button" onClick={() => { setDraft(assignSlot(assigned, slot!, c.user_id)); setSlot(null); }}
                className={cn("coord-press flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left", at === slot && "bg-primary/10")}>
                <Avatar name={c.full_name} url={c.avatar_url} number={c.jersey_number} />
                <span className="min-w-0 flex-1 truncate text-sm font-semibold">{shortName(c.full_name)}</span>
                <PosTag position={c.player_position} />
                {at ? <span className="text-[11px] text-muted-foreground">{at === slot ? "Aquí" : `En ${formationSlots(f).find((s) => s.key === at)?.label} · cambiar`}</span> : null}
              </button>
            );
          })}
        </div>
      </TripSheet>
    </div>
  );
}

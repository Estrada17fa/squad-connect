import * as React from "react";
import { toast } from "sonner";
import { Copy, Search } from "lucide-react";
import { usePlayers, type PlayerRow } from "@/hooks/usePlayers";
import { useMatchCallups, useSaveCallups, useSaveMatchLogistics, type MatchLogisticsRow, type OurMatch } from "@/hooks/useMatchOps";
import { ConfirmDialog } from "@/components/squad/ConfirmDialog";
import { Segmented } from "@/components/coord/tareas/parts";
import { callupDiff, noticeCount, positionCounts, posGroup, type PosGroup } from "@/lib/partidos";
import { Avatar, BottomBar, PosTag, StateTag, shortName } from "./parts";
import { cn } from "@/lib/utils";

const AVAIL: Record<string, string> = { lesionado: "Lesionado", en_duda: "En duda", en_recuperacion: "En recuperación", baja_medica: "Baja médica" };

export function CallupTab({ match, logistics, canEdit, userId, prevMatchId }: {
  match: OurMatch; logistics: MatchLogisticsRow | null; canEdit: boolean; userId: string; prevMatchId: string | null;
}) {
  const playersQ = usePlayers(match.tournament_team_id);
  const players = playersQ.data ?? [];
  const callupsQ = useMatchCallups([match.id]);
  const current = callupsQ.data ?? [];
  const prevQ = useMatchCallups(prevMatchId ? [prevMatchId] : []);
  const save = useSaveCallups();
  const saveLog = useSaveMatchLogistics();
  const published = !!logistics?.callup_published_at;

  const [sel, setSel] = React.useState<Set<string> | null>(null);
  const selected = sel ?? new Set(current.map((c) => c.user_id));
  React.useEffect(() => { setSel(null); }, [callupsQ.data]);
  const dirty = sel !== null && (sel.size !== current.length || current.some((c) => !sel.has(c.user_id)));

  const [term, setTerm] = React.useState("");
  const [pos, setPos] = React.useState<"all" | PosGroup>("all");
  const [warn, setWarn] = React.useState<PlayerRow | null>(null);
  const [confirm, setConfirm] = React.useState(false);

  const byUser = new Map(players.map((p) => [p.user_id, p] as const));
  const match_ = (p: PlayerRow) => (!term || (p.profile?.full_name ?? "").toLowerCase().includes(term.toLowerCase())) && (pos === "all" || posGroup(p.position) === pos);
  const sortP = (a: PlayerRow, b: PlayerRow) => (a.jersey_number ?? 999) - (b.jersey_number ?? 999);
  const called = players.filter((p) => selected.has(p.user_id)).sort(sortP);
  const rest = players.filter((p) => !selected.has(p.user_id)).sort(sortP);

  const toggle = (p: PlayerRow, force = false) => {
    if (!canEdit) return;
    const next = new Set(selected);
    if (next.has(p.user_id)) next.delete(p.user_id);
    else {
      if (!force && p.availability_status !== "apto") return setWarn(p);
      next.add(p.user_id);
    }
    setSel(next);
  };

  const ids = [...selected];
  const notices = noticeCount(published, current.map((c) => c.user_id), ids);

  async function persist(publish: boolean) {
    try {
      await save.mutateAsync({
        matchId: match.id, clubId: match.club_id, createdBy: userId, current,
        players: ids.map((id) => ({ userId: id, playerProfileId: byUser.get(id)?.id ?? null })),
      });
      if (publish) await saveLog.mutateAsync({ matchId: match.id, clubId: match.club_id, createdBy: userId, callup_published_at: new Date().toISOString() });
      setSel(null);
      toast.success(publish ? "Convocatoria publicada" : published ? "Cambios guardados" : "Borrador guardado");
    } catch (e: any) { toast.error(e.message ?? "No se pudo guardar"); }
  }

  function copyPrev() {
    const prev = (prevQ.data ?? []).map((c) => c.user_id).filter((id) => byUser.has(id));
    if (!prev.length) return toast("El partido anterior no tiene convocados");
    setSel(new Set(prev));
  }

  const busy = save.isPending || saveLog.isPending;
  const d = callupDiff(current.map((c) => c.user_id), ids);

  return (
    <div className="space-y-4 pb-36">
      <StateTag published={published} at={logistics?.callup_published_at} />

      <div className="flex items-center gap-2 rounded-xl bg-muted px-3">
        <Search className="h-4 w-4 text-muted-foreground" />
        <input value={term} onChange={(e) => setTerm(e.target.value)} placeholder="Buscar jugador…" className="min-h-11 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground" />
      </div>
      <Segmented value={pos} onChange={setPos} items={[{ key: "all", label: "Todos" }, { key: "POR", label: "POR" }, { key: "DEF", label: "DEF" }, { key: "MED", label: "MED" }, { key: "DEL", label: "DEL" }]} />
      {canEdit && prevMatchId ? (
        <button type="button" onClick={copyPrev} className="coord-press inline-flex min-h-10 items-center gap-2 rounded-xl px-1 text-sm font-semibold text-primary">
          <Copy className="h-4 w-4" /> Copiar convocatoria del partido anterior
        </button>
      ) : null}

      <section>
        <div className="mb-2 flex items-baseline justify-between">
          <h3 className="text-sm font-semibold">Convocados ({called.length})</h3>
          <span className="text-[11px] font-semibold text-muted-foreground">{positionCounts(called.map((p) => p.position))}</span>
        </div>
        <List rows={called.filter(match_)} on onTap={toggle} empty="Toca a los jugadores del plantel para convocarlos." />
      </section>
      <section>
        <h3 className="mb-2 text-sm font-semibold">Plantel ({rest.length})</h3>
        <List rows={rest.filter(match_)} onTap={toggle} empty={playersQ.isLoading ? "Cargando…" : "Sin más jugadores."} />
      </section>

      {canEdit ? (
        <BottomBar>
          <div className="min-w-0 flex-1 text-sm"><span className="font-bold">{selected.size}</span> convocados</div>
          {!published ? (
            <>
              {dirty ? <button type="button" disabled={busy} onClick={() => persist(false)} className="min-h-11 rounded-xl bg-muted px-3 text-sm font-semibold">Guardar</button> : null}
              <button type="button" disabled={busy || selected.size === 0} onClick={() => persist(true)} className="min-h-11 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground disabled:opacity-50">Publicar convocatoria</button>
            </>
          ) : (
            <button type="button" disabled={busy || !dirty} onClick={() => (notices ? setConfirm(true) : persist(false))} className="min-h-11 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground disabled:opacity-50">
              {dirty ? "Guardar cambios" : "Publicada"}
            </button>
          )}
        </BottomBar>
      ) : null}

      <ConfirmDialog open={!!warn} onOpenChange={(v) => !v && setWarn(null)} destructive={false} confirmLabel="Convocar"
        title={`${warn ? AVAIL[warn.availability_status] ?? "No disponible" : ""}. ¿Convocarlo igual?`}
        description={warn ? `${warn.profile?.full_name ?? "Este jugador"} no está apto.` : ""}
        onConfirm={() => { if (warn) toggle(warn, true); setWarn(null); }} />
      <ConfirmDialog open={confirm} onOpenChange={setConfirm} destructive={false} confirmLabel="Guardar y avisar"
        title={`Se avisará a ${notices} ${notices === 1 ? "persona" : "personas"}`}
        description={[d.added.length ? `${d.added.length} nuevo${d.added.length > 1 ? "s" : ""} convocado${d.added.length > 1 ? "s" : ""}` : null, d.removed.length ? `${d.removed.length} ya no convocado${d.removed.length > 1 ? "s" : ""}` : null].filter(Boolean).join(" · ")}
        onConfirm={() => { setConfirm(false); persist(false); }} />
    </div>
  );
}

function List({ rows, onTap, on, empty }: { rows: PlayerRow[]; onTap: (p: PlayerRow) => void; on?: boolean; empty: string }) {
  if (!rows.length) return <p className="rounded-2xl bg-card px-4 py-5 text-center text-sm text-muted-foreground">{empty}</p>;
  return (
    <div className="divide-y divide-border/50 overflow-hidden rounded-2xl bg-card">
      {rows.map((p) => (
        <button key={p.user_id} type="button" onClick={() => onTap(p)} className="coord-press flex w-full items-center gap-3 px-3 py-2.5 text-left">
          <Avatar name={p.profile?.full_name ?? null} url={p.profile?.avatar_url ?? null} number={p.jersey_number} />
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-semibold">{shortName(p.profile?.full_name)}</div>
            <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
              <PosTag position={p.position} />
              {p.availability_status !== "apto" ? <span className="font-semibold text-destructive">{AVAIL[p.availability_status]}</span> : <span className="flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-primary" />Apto</span>}
            </div>
          </div>
          <span className={cn("flex h-7 w-7 items-center justify-center rounded-full border-2 text-xs font-bold", on ? "border-primary bg-primary text-primary-foreground" : "border-muted-foreground/40")}>{on ? "✓" : ""}</span>
        </button>
      ))}
    </div>
  );
}

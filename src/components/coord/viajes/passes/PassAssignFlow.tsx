import * as React from "react";
import { createPortal } from "react-dom";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ChevronLeft, Loader2, Search, Upload, Undo2, SkipForward, Check, X } from "lucide-react";
import type { TripFlight } from "@/hooks/useTripFlights";
import { tripFlightsKey } from "@/hooks/useTripFlights";
import { deleteBoardingPass, insertBoardingPass, sendPassNotices } from "@/hooks/useTripBoardingPasses";
import type { AssignCandidate } from "@/components/viajes/logistica/PassengerAssignDialog";
import { detectFlight, matchPerson, pdfToPassImages, type MatchConfidence } from "@/lib/boardingPassMatch";
import { orderPassCards, sessionNoticeTargets, similarPeople } from "@/lib/misViajes";
import { PersonAvatar } from "../parts";
import { ConfirmDialog } from "@/components/squad/ConfirmDialog";
import { ZoomImage } from "@/components/viajes/mine/PassFullscreen";
import { cn } from "@/lib/utils";

interface Card {
  key: string;
  blob: Blob;
  ext: string;
  url: string;
  nameGuess: string | null;
  seat: string | null;
  group: string | null;
  terminal: string | null;
  flightId: string;
  suggestedUserId: string | null;
  confidence: MatchConfidence;
}
interface Done { key: string; passId: string; path: string; userId: string; flightId: string; undone?: boolean }
type Person = { user_id: string; label: string; profile: AssignCandidate["profile"] };

const CONF: Record<MatchConfidence, string> = { alta: "Coincidencia segura", media: "Revisar", ninguna: "Sin coincidencia" };

/**
 * Asignación de pases con tarjetas, un pase a la vez. Cada asignación se guarda
 * al momento; el aviso (uno por persona, nunca en Borrador) sale al salir.
 */
export function PassAssignFlow({ tripId, flights, travelers, initialFlightId, onClose }: {
  tripId: string;
  flights: TripFlight[];
  travelers: AssignCandidate[];
  initialFlightId?: string | null;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [phase, setPhase] = React.useState<"pick" | "reading" | "cards" | "done">("pick");
  const [progress, setProgress] = React.useState({ done: 0, total: 0 });
  const [cards, setCards] = React.useState<Record<string, Card>>({});
  const [queue, setQueue] = React.useState<string[]>([]);
  const [skipped, setSkipped] = React.useState<string[]>([]);
  const [history, setHistory] = React.useState<Done[]>([]);
  const [busy, setBusy] = React.useState(false);
  const [zoom, setZoom] = React.useState(false);
  const [searchOpen, setSearchOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const [replace, setReplace] = React.useState<Person | null>(null);
  const [drag, setDrag] = React.useState(0);
  const dragStart = React.useRef<number | null>(null);
  const exited = React.useRef(false);

  const label = (p: AssignCandidate) => p.profile?.full_name ?? p.profile?.email ?? "";
  const peopleFor = React.useCallback((flightId: string): Person[] => {
    const f = flights.find((x) => x.id === flightId);
    const base = f?.passengers.length ? f.passengers.map((p) => ({ user_id: p.user_id, profile: p.profile })) : travelers;
    return base.map((p) => ({ user_id: p.user_id, label: label(p as AssignCandidate), profile: p.profile }));
  }, [flights, travelers]);

  const sessionTaken = (flightId: string) => new Set(history.filter((h) => !h.undone && h.flightId === flightId).map((h) => h.userId));
  const existingPasses = (flightId: string, userId: string) => (flights.find((f) => f.id === flightId)?.boarding_passes ?? []).filter((p) => p.user_id === userId && !history.some((h) => !h.undone && h.passId === p.id));
  const taken = (flightId: string) => {
    const s = sessionTaken(flightId);
    for (const p of flights.find((f) => f.id === flightId)?.boarding_passes ?? []) if (p.user_id) s.add(p.user_id);
    return s;
  };

  const read = async (files: FileList | null) => {
    if (!files?.length) return;
    setPhase("reading");
    const list = Array.from(files);
    const out: Card[] = [];
    let total = list.length;
    setProgress({ done: 0, total });
    let done = 0;
    for (const file of list) {
      const isPdf = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
      if (!isPdf) {
        const flightId = initialFlightId ?? (flights.length === 1 ? flights[0]!.id : "");
        out.push({ key: crypto.randomUUID(), blob: file, ext: (file.name.split(".").pop() ?? "jpg").toLowerCase(), url: URL.createObjectURL(file), nameGuess: null, seat: null, group: null, terminal: null, flightId, suggestedUserId: null, confidence: "ninguna" });
        setProgress({ done: ++done, total });
        continue;
      }
      let counted = false;
      const pages = await pdfToPassImages(file, (_d, n) => {
        if (!counted) { counted = true; total += n - 1; }
        setProgress({ done: ++done, total });
      });
      if (!pages) { toast.error(`No se pudo leer ${file.name}`); setProgress({ done: ++done, total }); continue; }
      for (const { extract, blob } of pages) {
        const f = (initialFlightId ? flights.find((x) => x.id === initialFlightId) : null) ?? detectFlight(extract, flights) ?? (flights.length === 1 ? flights[0]! : null);
        const m = f ? matchPerson(extract.nameGuess, peopleFor(f.id).filter((p) => !taken(f.id).has(p.user_id))) : { userId: null, confidence: "ninguna" as const };
        out.push({ key: crypto.randomUUID(), blob, ext: "jpg", url: URL.createObjectURL(blob), nameGuess: extract.nameGuess, seat: extract.seat, group: extract.group ?? null, terminal: extract.terminal ?? null, flightId: f?.id ?? "", suggestedUserId: m.userId, confidence: m.confidence });
      }
    }
    if (inputRef.current) inputRef.current.value = "";
    if (!out.length) { setPhase(Object.keys(cards).length ? "cards" : "pick"); return; }
    setCards((c) => ({ ...c, ...Object.fromEntries(out.map((x) => [x.key, x])) }));
    setQueue((q) => [...q, ...orderPassCards(out).map((x) => x.key)]);
    setPhase("cards");
  };

  const allKeys = Object.keys(cards);
  const assignedKeys = new Set(history.filter((h) => !h.undone).map((h) => h.key));
  const pending = allKeys.length - assignedKeys.size;
  const current = queue[0] ? cards[queue[0]] : null;
  React.useEffect(() => { if (phase === "cards" && !current) setPhase("done"); }, [phase, current]);

  const flight = current ? flights.find((f) => f.id === current.flightId) ?? null : null;
  const people = current?.flightId ? peopleFor(current.flightId) : [];
  const takenNow = current?.flightId ? taken(current.flightId) : new Set<string>();
  const suggestion = current?.suggestedUserId && !takenNow.has(current.suggestedUserId) ? people.find((p) => p.user_id === current.suggestedUserId) ?? null : null;
  const others = current ? similarPeople(current.nameGuess, people, new Set([...takenNow, ...(suggestion ? [suggestion.user_id] : [])])) : [];

  const setFlight = (flightId: string) => {
    if (!current) return;
    const m = matchPerson(current.nameGuess, peopleFor(flightId).filter((p) => !taken(flightId).has(p.user_id)));
    setCards((c) => ({ ...c, [current.key]: { ...current, flightId, suggestedUserId: m.userId, confidence: m.confidence } }));
  };

  const assign = async (p: Person, confirmedReplace = false) => {
    if (!current || busy) return;
    if (!current.flightId) { toast.error("Elige el vuelo de este pase"); return; }
    const prev = existingPasses(current.flightId, p.user_id);
    if ((prev.length || sessionTaken(current.flightId).has(p.user_id)) && !confirmedReplace) { setReplace(p); return; }
    setBusy(true);
    try {
      for (const old of prev) await deleteBoardingPass(old.id, old.file_path);
      for (const h of history.filter((h) => !h.undone && h.flightId === current.flightId && h.userId === p.user_id)) {
        await deleteBoardingPass(h.passId, h.path);
        h.undone = true;
      }
      const r = await insertBoardingPass(tripId, current.flightId, current.blob, current.ext, { user_id: p.user_id, seat: current.seat, boarding_group: current.group, terminal: current.terminal, notes: null });
      setHistory((hs) => [...hs, { key: current.key, passId: r.id, path: r.path, userId: p.user_id, flightId: current.flightId }]);
      setQueue((q) => q.slice(1));
      setSearchOpen(false);
      void qc.invalidateQueries({ queryKey: tripFlightsKey(tripId) });
    } catch (e) {
      toast.error((e as Error).message || "No se pudo guardar el pase");
    } finally {
      setBusy(false);
      setDrag(0);
    }
  };

  const skip = () => {
    if (!current) return;
    setSkipped((s) => [...s.filter((k) => k !== current.key), current.key]);
    setQueue((q) => q.slice(1));
    setDrag(0);
  };

  const undo = async () => {
    const last = [...history].reverse().find((h) => !h.undone);
    if (!last || busy) return;
    setBusy(true);
    try {
      await deleteBoardingPass(last.passId, last.path);
      setHistory((hs) => hs.map((h) => (h === last ? { ...h, undone: true } : h)));
      setQueue((q) => [last.key, ...q.filter((k) => k !== last.key)]);
      setSkipped((s) => s.filter((k) => k !== last.key));
      if (phase === "done") setPhase("cards");
      void qc.invalidateQueries({ queryKey: tripFlightsKey(tripId) });
    } catch (e) {
      toast.error((e as Error).message || "No se pudo deshacer");
    } finally {
      setBusy(false);
    }
  };

  const exit = async () => {
    if (exited.current) return;
    exited.current = true;
    const targets = sessionNoticeTargets(history);
    if (targets.length) {
      const n = await sendPassNotices(tripId, targets);
      if (n) toast.success(`Avisamos a ${n} persona${n === 1 ? "" : "s"}`);
    }
    for (const c of Object.values(cards)) URL.revokeObjectURL(c.url);
    void qc.invalidateQueries({ queryKey: tripFlightsKey(tripId) });
    onClose();
  };

  React.useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, []);

  const total = allKeys.length;
  const position = total - queue.length + 1;
  const legName = flight ? (flight.leg === "ida" ? "Vuelo de ida" : "Vuelo de regreso") : "Sin vuelo";
  const matchesQuery = (p: Person) => p.label.toLowerCase().includes(query.trim().toLowerCase());

  if (typeof document === "undefined") return null;
  return createPortal(
    <div role="dialog" aria-modal="true" aria-label="Asignar pases" className="fixed inset-0 z-[90] flex flex-col bg-background text-foreground">
      <input ref={inputRef} type="file" multiple accept="application/pdf,image/jpeg,image/png,image/*" className="hidden" onChange={(e) => read(e.target.files)} />

      <div className="space-y-2 px-3 pt-[max(env(safe-area-inset-top),12px)] pb-2">
        <div className="flex items-center gap-2">
          <button onClick={exit} aria-label="Salir" className="flex h-11 w-11 items-center justify-center rounded-full bg-muted"><ChevronLeft className="h-5 w-5" /></button>
          <div className="min-w-0 flex-1">
            {phase === "cards" && current ? (
              <>
                <div className="truncate text-sm font-semibold">Pase {Math.min(position, total)} de {total} · {legName}</div>
                <div className="text-xs text-muted-foreground">{pending} por asignar</div>
              </>
            ) : <div className="text-sm font-semibold">Subir pases</div>}
          </div>
        </div>
        {total ? <div className="h-1.5 overflow-hidden rounded-full bg-muted"><div className="h-full bg-primary transition-all" style={{ width: `${(assignedKeys.size / total) * 100}%` }} /></div> : null}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-4">
        {phase === "pick" ? (
          <div className="flex h-full flex-col items-center justify-center gap-4 text-center">
            <Upload className="h-10 w-10 text-primary" />
            <div className="space-y-1"><div className="text-lg font-bold">Sube los pases</div><p className="text-sm text-muted-foreground">Varios PDF, un PDF con muchas páginas o fotos (JPG, PNG).</p></div>
            <button onClick={() => inputRef.current?.click()} className="coord-press h-12 w-full max-w-xs rounded-2xl bg-primary text-sm font-semibold text-primary-foreground">Elegir archivos</button>
          </div>
        ) : phase === "reading" ? (
          <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <div className="text-base font-semibold">Leyendo {progress.total} pase{progress.total === 1 ? "" : "s"}…</div>
            <div className="h-1.5 w-48 overflow-hidden rounded-full bg-muted"><div className="h-full bg-primary" style={{ width: `${progress.total ? (progress.done / progress.total) * 100 : 0}%` }} /></div>
          </div>
        ) : phase === "cards" && current ? (
          <div className="space-y-3">
            <div
              className="touch-pan-y select-none"
              style={{ transform: `translateX(${drag}px) rotate(${drag / 30}deg)`, transition: dragStart.current == null ? "transform .2s" : "none" }}
              onPointerDown={(e) => { dragStart.current = e.clientX; }}
              onPointerMove={(e) => { if (dragStart.current != null) setDrag(e.clientX - dragStart.current); }}
              onPointerUp={() => {
                const d = drag; dragStart.current = null;
                if (d > 100 && suggestion) void assign(suggestion);
                else if (d < -100) skip();
                else { setDrag(0); if (Math.abs(d) < 6) setZoom(true); }
              }}
              onPointerCancel={() => { dragStart.current = null; setDrag(0); }}
            >
              <img src={current.url} alt="Pase de abordar" draggable={false} className="max-h-[38dvh] w-full rounded-2xl bg-card object-contain" />
            </div>
            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <span>Leído en el pase: <b className="text-foreground">{current.nameGuess ?? "sin nombre"}</b>{current.seat ? ` · Asiento ${current.seat}` : ""}</span>
              <select aria-label="Vuelo" value={current.flightId} onChange={(e) => setFlight(e.target.value)} className="ml-auto h-8 rounded-lg bg-muted px-2 text-xs">
                <option value="">Elegir vuelo…</option>
                {flights.map((f) => <option key={f.id} value={f.id}>{f.leg === "ida" ? "Ida" : "Regreso"} · {f.flight_code}</option>)}
              </select>
            </div>

            {suggestion ? (
              <div className="flex items-center gap-3 rounded-2xl bg-primary/10 p-3">
                <PersonAvatar p={suggestion.profile} size={10} />
                <div className="min-w-0 flex-1">
                  <div className="truncate font-semibold">{suggestion.label}</div>
                  <div className={cn("text-xs font-semibold", current.confidence === "alta" ? "text-primary" : "text-muted-foreground")}>{CONF[current.confidence === "ninguna" ? "media" : current.confidence]}</div>
                </div>
                <button disabled={busy} onClick={() => assign(suggestion)} className="coord-press h-11 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground disabled:opacity-60">{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Asignar"}</button>
              </div>
            ) : (
              <p className="rounded-2xl bg-muted p-3 text-sm text-muted-foreground">{current.flightId ? "Sin coincidencia: elige a la persona." : "Elige el vuelo de este pase."}</p>
            )}

            {current.flightId ? (
              <div className="space-y-2">
                <div className="text-xs font-semibold text-muted-foreground">¿Es otra persona?</div>
                <div className="grid grid-cols-5 gap-2">
                  {others.map((p) => (
                    <button key={p.user_id} disabled={busy} onClick={() => assign(p)} className="coord-press flex min-w-0 flex-col items-center gap-1 text-[11px]">
                      <PersonAvatar p={p.profile} size={10} />
                      <span className="w-full truncate text-center">{p.label.split(" ")[0]}</span>
                    </button>
                  ))}
                  <button onClick={() => { setQuery(""); setSearchOpen(true); }} className="coord-press flex flex-col items-center gap-1 text-[11px]">
                    <span className="flex h-10 w-10 items-center justify-center rounded-full bg-muted"><Search className="h-4 w-4" /></span>Buscar
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        ) : phase === "done" ? (
          <Summary flights={flights} history={history} skipped={skipped.filter((k) => !assignedKeys.has(k))} cards={cards} onAssignNow={(k) => { setQueue([k, ...skipped.filter((x) => x !== k && !assignedKeys.has(x))]); setSkipped([]); setPhase("cards"); }} />
        ) : null}
      </div>

      <div className="flex gap-2 border-t border-border/50 px-4 pt-3 pb-[max(env(safe-area-inset-bottom),12px)]">
        <button onClick={undo} disabled={busy || !history.some((h) => !h.undone)} className="coord-press flex h-12 flex-1 items-center justify-center gap-2 rounded-2xl bg-muted text-sm font-semibold disabled:opacity-40"><Undo2 className="h-4 w-4" /> Deshacer</button>
        {phase === "cards" && current ? (
          <button onClick={skip} disabled={busy} className="coord-press flex h-12 flex-1 items-center justify-center gap-2 rounded-2xl bg-muted text-sm font-semibold"><SkipForward className="h-4 w-4" /> Saltar</button>
        ) : phase === "done" ? (
          <>
            <button onClick={() => inputRef.current?.click()} className="coord-press flex h-12 flex-1 items-center justify-center gap-2 rounded-2xl bg-muted text-sm font-semibold"><Upload className="h-4 w-4" /> Más</button>
            <button onClick={exit} className="coord-press flex h-12 flex-1 items-center justify-center gap-2 rounded-2xl bg-primary text-sm font-semibold text-primary-foreground"><Check className="h-4 w-4" /> Listo</button>
          </>
        ) : null}
      </div>

      {zoom && current ? (
        <div className="fixed inset-0 z-[95] flex flex-col bg-background">
          <div className="flex justify-end p-3 pt-[max(env(safe-area-inset-top),12px)]"><button onClick={() => setZoom(false)} aria-label="Cerrar" className="flex h-11 w-11 items-center justify-center rounded-full bg-muted"><X className="h-5 w-5" /></button></div>
          <div className="min-h-0 flex-1"><ZoomImage src={current.url} alt="Pase de abordar" /></div>
        </div>
      ) : null}

      {searchOpen && current ? (
        <div className="fixed inset-0 z-[95] flex flex-col bg-background">
          <div className="flex items-center gap-2 p-3 pt-[max(env(safe-area-inset-top),12px)]">
            <button onClick={() => setSearchOpen(false)} aria-label="Volver" className="flex h-11 w-11 items-center justify-center rounded-full bg-muted"><ChevronLeft className="h-5 w-5" /></button>
            <input autoFocus value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar pasajero del vuelo" className="h-11 flex-1 rounded-xl bg-muted px-3 text-sm outline-none" />
          </div>
          <ul className="min-h-0 flex-1 divide-y divide-border/50 overflow-y-auto px-4">
            {people.filter(matchesQuery).map((p) => (
              <li key={p.user_id}>
                <button disabled={busy} onClick={() => assign(p)} className="coord-press flex min-h-14 w-full items-center gap-3 text-left">
                  <PersonAvatar p={p.profile} size={8} />
                  <span className="min-w-0 flex-1 truncate text-sm">{p.label}</span>
                  {takenNow.has(p.user_id) ? <span className="text-xs text-muted-foreground">Ya tiene pase</span> : null}
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <ConfirmDialog
        open={!!replace}
        onOpenChange={(v) => !v && setReplace(null)}
        title="Ya tiene pase. ¿Reemplazar?"
        description={replace ? `${replace.label} ya tiene un pase en este vuelo. Se reemplazará por este.` : undefined}
        confirmLabel="Reemplazar"
        destructive={false}
        onConfirm={() => { const p = replace; setReplace(null); if (p) void assign(p, true); }}
      />
    </div>,
    document.body,
  );
}

function Summary({ flights, history, skipped, cards, onAssignNow }: { flights: TripFlight[]; history: Done[]; skipped: string[]; cards: Record<string, Card>; onAssignNow: (k: string) => void }) {
  const assigned = history.filter((h) => !h.undone).length;
  const total = Object.keys(cards).length;
  const sessionFlights = new Set(Object.values(cards).map((c) => c.flightId).filter(Boolean));
  const missing = flights
    .filter((f) => sessionFlights.has(f.id))
    .flatMap((f) => f.passengers.filter((p) => !f.boarding_passes.some((b) => b.user_id === p.user_id) && !history.some((h) => !h.undone && h.flightId === f.id && h.userId === p.user_id)).map((p) => ({ f, p })));
  return (
    <div className="space-y-5 pt-4">
      <div className="text-center">
        <div className="text-3xl font-bold">{assigned} de {total}</div>
        <div className="text-sm text-muted-foreground">asignados</div>
      </div>
      {skipped.length ? (
        <section className="space-y-2">
          <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Pases saltados</div>
          {skipped.map((k) => (
            <div key={k} className="flex items-center gap-3 rounded-2xl bg-card p-2">
              <img src={cards[k]!.url} alt="" className="h-14 w-10 rounded-lg object-cover" />
              <span className="min-w-0 flex-1 truncate text-sm">{cards[k]!.nameGuess ?? "Sin nombre leído"}</span>
              <button onClick={() => onAssignNow(k)} className="coord-press h-10 rounded-xl bg-primary/15 px-3 text-xs font-semibold text-primary">Asignar ahora</button>
            </div>
          ))}
        </section>
      ) : null}
      {missing.length ? (
        <section className="space-y-2">
          <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Sin pase</div>
          <ul className="divide-y divide-border/50 rounded-2xl bg-card">
            {missing.map(({ f, p }) => (
              <li key={`${f.id}-${p.user_id}`} className="flex min-h-12 items-center gap-3 px-3 text-sm">
                <PersonAvatar p={p.profile} size={6} />
                <span className="min-w-0 flex-1 truncate">{p.profile?.full_name ?? p.profile?.email}</span>
                <span className="text-xs text-muted-foreground">{f.leg === "ida" ? "Ida" : "Regreso"} · {f.flight_code}</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}

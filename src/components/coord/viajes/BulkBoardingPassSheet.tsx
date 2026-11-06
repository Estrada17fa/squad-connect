import * as React from "react";
import { FileText, ImageIcon, Loader2, Upload } from "lucide-react";
import { toast } from "sonner";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { useBoardingPassMutations } from "@/hooks/useTripBoardingPasses";
import type { TripFlight } from "@/hooks/useTripFlights";
import type { AssignCandidate } from "@/components/viajes/logistica/PassengerAssignDialog";
import { detectFlight, extractPdfPages, matchPerson, renderPdfPageThumb, splitPdfPage, type MatchConfidence } from "@/lib/boardingPassMatch";
import { cn } from "@/lib/utils";

interface Item {
  key: string;
  file: File;
  page: number | null; // null = imagen
  pages: number;
  thumb: string | null;
  nameGuess: string | null;
  seat: string | null;
  userId: string;
  flightId: string;
  confidence: MatchConfidence;
}

const CONF_LABEL: Record<MatchConfidence, string> = { alta: "Coincide", media: "Revisa", ninguna: "Asigna a mano" };

/**
 * Carga varios pases a la vez (PDF de varias páginas o imágenes). Sugiere la
 * persona por el nombre del pase y el vuelo por su código o fecha; todo se
 * puede corregir antes de guardar.
 */
export function BulkBoardingPassSheet({ open, onOpenChange, tripId, flights, travelers }: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  tripId: string;
  flights: TripFlight[];
  travelers: AssignCandidate[];
}) {
  const { uploadBatch } = useBoardingPassMutations(tripId);
  const [items, setItems] = React.useState<Item[]>([]);
  const [reading, setReading] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const people = React.useMemo(() => travelers.map((t) => ({ user_id: t.user_id, label: t.profile?.full_name ?? t.profile?.email ?? "" })), [travelers]);

  React.useEffect(() => { if (!open) setItems([]); }, [open]);

  const passengersOf = (flightId: string) => new Set(flights.find((f) => f.id === flightId)?.passengers.map((p) => p.user_id) ?? []);

  const read = async (files: FileList | null) => {
    if (!files?.length) return;
    setReading(true);
    const out: Item[] = [];
    for (const file of Array.from(files)) {
      const isPdf = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
      if (!isPdf) {
        out.push({ key: crypto.randomUUID(), file, page: null, pages: 1, thumb: URL.createObjectURL(file), nameGuess: null, seat: null, userId: "", flightId: flights.length === 1 ? flights[0]!.id : "", confidence: "ninguna" });
        continue;
      }
      const pages = await extractPdfPages(file);
      if (!pages) { toast.error(`No se pudo leer ${file.name}`); continue; }
      for (const pg of pages) {
        const m = matchPerson(pg.nameGuess, people);
        const f = detectFlight(pg, flights) ?? (flights.length === 1 ? flights[0]! : null);
        out.push({
          key: crypto.randomUUID(), file, page: pg.page - 1, pages: pages.length, thumb: await renderPdfPageThumb(file, pg.page - 1, 96),
          nameGuess: pg.nameGuess, seat: pg.seat, userId: m.userId ?? "", flightId: f?.id ?? "", confidence: m.confidence,
        });
      }
    }
    setItems((prev) => [...prev, ...out]);
    setReading(false);
    if (inputRef.current) inputRef.current.value = "";
  };

  const set = (key: string, patch: Partial<Item>) => setItems((list) => list.map((i) => (i.key === key ? { ...i, ...patch } : i)));
  const ready = items.filter((i) => i.flightId);
  const missingPerson = ready.filter((i) => !i.userId).length;

  const save = async () => {
    setSaving(true);
    try {
      const byFlight = new Map<string, Item[]>();
      for (const i of ready) byFlight.set(i.flightId, [...(byFlight.get(i.flightId) ?? []), i]);
      let n = 0;
      for (const [flightId, list] of byFlight) {
        const batch = [];
        for (const i of list) {
          const blob = i.page != null && i.pages > 1 ? await splitPdfPage(i.file, i.page) : i.file;
          const ext = i.page != null ? "pdf" : i.file.name.split(".").pop() ?? "jpg";
          batch.push({ blob, ext, input: { user_id: i.userId || null, seat: i.seat, boarding_group: null, terminal: null, notes: null } });
        }
        await uploadBatch.mutateAsync({ flightId, items: batch });
        n += batch.length;
      }
      toast.success(`${n} pase${n === 1 ? "" : "s"} guardado${n === 1 ? "" : "s"}`);
      onOpenChange(false);
    } catch (e) {
      toast.error((e as Error).message || "No se pudieron guardar los pases");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="max-h-[92dvh] overflow-y-auto rounded-t-3xl pb-[max(env(safe-area-inset-bottom),16px)]">
        <SheetHeader className="text-left">
          <SheetTitle>Cargar pases</SheetTitle>
          <SheetDescription>Sube uno o varios PDF o fotos. Revisa la persona y el vuelo de cada pase.</SheetDescription>
        </SheetHeader>
        <input ref={inputRef} type="file" multiple accept="application/pdf,image/*" className="hidden" onChange={(e) => read(e.target.files)} />
        <div className="mt-4 space-y-3">
          <button onClick={() => inputRef.current?.click()} disabled={reading} className="coord-press flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-border py-5 text-sm font-semibold">
            {reading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            {reading ? "Leyendo pases…" : items.length ? "Agregar más archivos" : "Elegir archivos"}
          </button>

          {items.map((i) => {
            const onFlight = i.flightId ? passengersOf(i.flightId) : null;
            return (
              <div key={i.key} className="flex gap-3 rounded-2xl bg-card p-3">
                <div className="flex h-20 w-14 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-muted">
                  {i.thumb ? <img src={i.thumb} alt="" className="h-full w-full object-cover" /> : i.page != null ? <FileText className="h-5 w-5 text-muted-foreground" /> : <ImageIcon className="h-5 w-5 text-muted-foreground" />}
                </div>
                <div className="min-w-0 flex-1 space-y-1.5">
                  <div className="flex items-center justify-between gap-2 text-xs">
                    <span className="truncate text-muted-foreground">{i.nameGuess ?? (i.page == null ? "Foto (sin texto)" : "Nombre no detectado")}{i.seat ? ` · ${i.seat}` : ""}</span>
                    <span className={cn("shrink-0 rounded-full px-2 py-0.5 font-semibold", i.userId && i.confidence === "alta" ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground")}>
                      {i.userId ? CONF_LABEL[i.confidence === "ninguna" ? "media" : i.confidence] : CONF_LABEL.ninguna}
                    </span>
                  </div>
                  <select aria-label="Persona" value={i.userId} onChange={(e) => set(i.key, { userId: e.target.value, confidence: "alta" })} className="min-h-10 w-full rounded-xl bg-muted px-2 text-sm">
                    <option value="">Sin asignar</option>
                    {travelers.map((t) => <option key={t.user_id} value={t.user_id}>{t.profile?.full_name ?? t.profile?.email}</option>)}
                  </select>
                  <select aria-label="Vuelo" value={i.flightId} onChange={(e) => set(i.key, { flightId: e.target.value })} className="min-h-10 w-full rounded-xl bg-muted px-2 text-sm">
                    <option value="">Elegir vuelo…</option>
                    {flights.map((f) => <option key={f.id} value={f.id}>{f.leg === "ida" ? "Ida" : "Regreso"} · {f.flight_code} {f.origin}→{f.destination}</option>)}
                  </select>
                  {i.userId && onFlight && !onFlight.has(i.userId) ? <p className="text-[11px] text-muted-foreground">Esta persona aún no está en ese vuelo.</p> : null}
                  <button onClick={() => setItems((l) => l.filter((x) => x.key !== i.key))} className="text-xs font-semibold text-destructive">Quitar</button>
                </div>
              </div>
            );
          })}

          {items.length ? (
            <div className="space-y-2 pt-1">
              {missingPerson ? <p className="text-xs text-muted-foreground">{missingPerson} se guardará{missingPerson === 1 ? "" : "n"} sin persona; podrás asignarlo{missingPerson === 1 ? "" : "s"} después.</p> : null}
              {items.length > ready.length ? <p className="text-xs text-muted-foreground">Elige el vuelo de {items.length - ready.length} pase{items.length - ready.length === 1 ? "" : "s"} para guardarlo{items.length - ready.length === 1 ? "" : "s"}.</p> : null}
              <Button className="h-12 w-full rounded-2xl" disabled={!ready.length || saving} onClick={save}>
                {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Guardar {ready.length} pase{ready.length === 1 ? "" : "s"}
              </Button>
            </div>
          ) : null}
        </div>
      </SheetContent>
    </Sheet>
  );
}

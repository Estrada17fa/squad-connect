import * as React from "react";
import { Check, Search, X } from "lucide-react";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { PersonAvatar } from "./parts";
import type { TripCandidate } from "./useTripCandidates";

/** Selector a pantalla completa: búsqueda, filtro (posición o rol), casillas y "Listo". */
export function TravelerPickerSheet({
  open, onOpenChange, title, people, selected, onDone, filterBy,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  title: string;
  people: TripCandidate[];
  selected: Set<string>;
  onDone: (ids: Set<string>) => void;
  filterBy: "position" | "role";
}) {
  const [draft, setDraft] = React.useState<Set<string>>(new Set());
  const [q, setQ] = React.useState("");
  const [filter, setFilter] = React.useState<string | null>(null);
  React.useEffect(() => {
    if (open) { setDraft(new Set(selected)); setQ(""); setFilter(null); }
  }, [open, selected]);

  const keyOf = (p: TripCandidate) => (filterBy === "position" ? p.position : p.role_name) || "Sin asignar";
  const filters = React.useMemo(() => [...new Set(people.map(keyOf))].sort(), [people, filterBy]); // eslint-disable-line react-hooks/exhaustive-deps
  const term = q.trim().toLowerCase();
  const visible = people.filter((p) => (!filter || keyOf(p) === filter) && (!term || `${p.full_name ?? ""} ${p.email ?? ""}`.toLowerCase().includes(term)));
  const allOn = visible.length > 0 && visible.every((p) => draft.has(p.id));
  const toggle = (id: string) => setDraft((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  const toggleAll = () => setDraft((s) => { const n = new Set(s); for (const p of visible) { if (allOn) n.delete(p.id); else n.add(p.id); } return n; });

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="flex h-[100dvh] flex-col gap-0 p-0 [&>button]:hidden">
        <div className="space-y-3 border-b border-border/60 px-4 pb-3 pt-[max(env(safe-area-inset-top),12px)]">
          <div className="flex items-center justify-between">
            <SheetTitle className="text-lg font-bold">{title}</SheetTitle>
            <button aria-label="Cerrar" onClick={() => onOpenChange(false)} className="coord-press flex h-10 w-10 items-center justify-center rounded-xl"><X className="h-5 w-5" /></button>
          </div>
          <div className="flex items-center gap-2 rounded-xl bg-muted px-3">
            <Search className="h-4 w-4 text-muted-foreground" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar…" className="min-h-10 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground" />
          </div>
          {filters.length > 1 ? (
            <div className="-mx-4 flex gap-1.5 overflow-x-auto px-4 [scrollbar-width:none]">
              {[null, ...filters].map((f) => (
                <button key={f ?? "all"} onClick={() => setFilter(f)} className={cn("shrink-0 rounded-full px-3 py-1 text-xs font-semibold", filter === f ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground")}>
                  {f ?? "Todos"}
                </button>
              ))}
            </div>
          ) : null}
          <button onClick={toggleAll} disabled={!visible.length} className="text-xs font-semibold text-primary disabled:opacity-40">
            {allOn ? "Quitar todos" : "Seleccionar todos"}{filter ? ` (${filter})` : ""}
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-2 py-1">
          {visible.length === 0 ? <p className="py-10 text-center text-sm text-muted-foreground">Nadie con ese filtro</p> : null}
          {visible.map((p) => {
            const on = draft.has(p.id);
            return (
              <button key={p.id} onClick={() => toggle(p.id)} className="coord-press flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left">
                <PersonAvatar p={p} size={8} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold">{p.jersey != null ? <span className="mr-1 text-muted-foreground">{p.jersey}</span> : null}{p.full_name ?? p.email}</span>
                  <span className="block truncate text-xs text-muted-foreground">{filterBy === "position" ? p.position ?? "Sin posición" : p.role_name ?? "Sin rol"}</span>
                </span>
                <span className={cn("flex h-5 w-5 shrink-0 items-center justify-center rounded-md border", on ? "border-primary bg-primary text-primary-foreground" : "border-border")}>
                  {on ? <Check className="h-3.5 w-3.5" /> : null}
                </span>
              </button>
            );
          })}
        </div>
        <div className="border-t border-border/60 px-4 pb-[max(env(safe-area-inset-bottom),12px)] pt-3">
          <Button className="w-full" onClick={() => { onDone(draft); onOpenChange(false); }}>Listo · {[...draft].filter((id) => people.some((p) => p.id === id)).length} seleccionados</Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}

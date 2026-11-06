import * as React from "react";
import { toast } from "sonner";
import { Globe, Loader2, MapPin, Search, X } from "lucide-react";
import { useLocation, useLocations, usePromoteLocation, useResolveLocation, type LocationRow } from "@/hooks/useLocations";
import { useClub } from "@/hooks/useClubSettings";
import { useGeocodeSearch, type GeocodeResult } from "@/hooks/useGeocodeSearch";
import { cn } from "@/lib/utils";

/**
 * Selector de lugar reutilizable: primero el catálogo del club (Sede arriba);
 * si no está, búsqueda en el mapa con opción de guardarlo en el catálogo.
 * Siempre liga una fila de locations (location_id).
 */
export function LocationPicker({
  clubId, userId, value, onChange,
}: { clubId: string; userId: string; value: string | null; onChange: (id: string | null, row?: LocationRow | null) => void }) {
  const locQ = useLocations(clubId);
  const clubQ = useClub(clubId);
  const selectedQ = useLocation(value);
  const resolve = useResolveLocation();
  const promote = usePromoteLocation();
  const homeId = (clubQ.data as any)?.home_location_id as string | null | undefined;
  const [open, setOpen] = React.useState(false);
  const [q, setQ] = React.useState("");
  const [web, setWeb] = React.useState(false);
  const [saveToClub, setSaveToClub] = React.useState(true);
  const geo = useGeocodeSearch(q, open && web);

  const list = React.useMemo(() => {
    const term = q.trim().toLowerCase();
    return [...(locQ.data ?? [])]
      .filter((l) => !term || `${l.name} ${l.address ?? ""}`.toLowerCase().includes(term))
      .sort((a, b) => (a.id === homeId ? -1 : b.id === homeId ? 1 : a.name.localeCompare(b.name, "es")));
  }, [locQ.data, q, homeId]);

  function close() { setOpen(false); setQ(""); setWeb(false); }

  async function pickWeb(r: GeocodeResult) {
    try {
      let row = await resolve.mutateAsync({ club_id: clubId, name: r.name, address: r.address, latitude: r.latitude, longitude: r.longitude, place_id: r.placeId, created_by: userId });
      if (saveToClub && !row.is_catalog) row = await promote.mutateAsync(row.id);
      onChange(row.id, row);
      close();
    } catch (e: any) {
      toast.error(e.message ?? "No se pudo usar ese lugar");
    }
  }

  const sel = selectedQ.data;
  return (
    <div className="space-y-2">
      {value && sel ? (
        <div className="flex items-center gap-2 rounded-xl bg-card px-3 py-2.5">
          <MapPin className="h-4 w-4 shrink-0 text-area-general" />
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-medium">{sel.name}</span>
            {sel.address ? <span className="block truncate text-[11px] text-muted-foreground">{sel.address}</span> : null}
          </span>
          <button type="button" onClick={() => setOpen(true)} className="coord-press px-1 text-xs font-semibold text-area-general">Cambiar</button>
          <button type="button" aria-label="Quitar lugar" onClick={() => onChange(null, null)} className="p-1 text-muted-foreground"><X className="h-4 w-4" /></button>
        </div>
      ) : !open ? (
        <button type="button" onClick={() => setOpen(true)} className="coord-press flex min-h-11 w-full items-center gap-2 rounded-xl bg-card px-3 text-left text-sm text-muted-foreground">
          <MapPin className="h-4 w-4" /> Elegir lugar (opcional)
        </button>
      ) : null}

      {open ? (
        <div className="coord-enter space-y-2 rounded-xl bg-card p-2">
          <div className="flex items-center gap-2 rounded-lg bg-muted px-3">
            <Search className="h-4 w-4 text-muted-foreground" />
            <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder={web ? "Buscar lugar o dirección…" : "Buscar en ubicaciones del club…"} aria-label="Buscar lugar"
              className="min-h-10 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground" />
            <button type="button" aria-label="Cerrar" onClick={close} className="p-1 text-muted-foreground"><X className="h-4 w-4" /></button>
          </div>
          <div role="radiogroup" className="grid grid-cols-2 gap-1 rounded-lg bg-muted p-0.5">
            {[{ k: false, l: "Del club" }, { k: true, l: "Buscar en el mapa" }].map((o) => (
              <button key={o.l} type="button" role="radio" aria-checked={web === o.k} onClick={() => setWeb(o.k)}
                className={cn("min-h-8 rounded-md text-xs font-semibold", web === o.k ? "bg-card text-foreground" : "text-muted-foreground")}>{o.l}</button>
            ))}
          </div>
          {!web ? (
            <ul className="max-h-60 overflow-y-auto">
              {list.map((l) => (
                <li key={l.id}>
                  <button type="button" onClick={() => { onChange(l.id, l); close(); }} className="coord-press flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left hover:bg-muted/50">
                    <MapPin className="h-4 w-4 shrink-0 text-muted-foreground" />
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-1.5 text-sm"><span className="truncate">{l.name}</span>
                        {l.id === homeId ? <span className="shrink-0 rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-bold text-primary">Sede</span> : null}</span>
                      {l.address ? <span className="block truncate text-[11px] text-muted-foreground">{l.address}</span> : null}
                    </span>
                  </button>
                </li>
              ))}
              {list.length === 0 ? <li className="px-2 py-2 text-xs text-muted-foreground">No está en el club.</li> : null}
              <li>
                <button type="button" onClick={() => setWeb(true)} className="coord-press flex min-h-10 w-full items-center gap-2 px-2 text-sm font-semibold text-area-general">
                  <Globe className="h-4 w-4" /> Buscar en el mapa
                </button>
              </li>
            </ul>
          ) : (
            <div className="space-y-2">
              <label className="flex items-center gap-2 px-1 text-xs">
                <input type="checkbox" checked={saveToClub} onChange={(e) => setSaveToClub(e.target.checked)} /> Guardar en ubicaciones del club
              </label>
              <ul className="max-h-60 overflow-y-auto">
                {q.trim().length < 3 ? <li className="px-2 py-2 text-xs text-muted-foreground">Escribe al menos 3 letras.</li>
                  : geo.isFetching ? <li className="flex items-center gap-2 px-2 py-2 text-xs text-muted-foreground"><Loader2 className="h-3.5 w-3.5 animate-spin" /> Buscando…</li>
                  : (geo.data ?? []).length === 0 ? <li className="px-2 py-2 text-xs text-muted-foreground">Sin resultados.</li>
                  : (geo.data ?? []).map((r) => (
                    <li key={r.placeId}>
                      <button type="button" disabled={resolve.isPending || promote.isPending} onClick={() => pickWeb(r)} className="coord-press flex w-full items-start gap-2 rounded-lg px-2 py-2 text-left hover:bg-muted/50">
                        <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                        <span className="min-w-0"><span className="block truncate text-sm">{r.name}</span><span className="block truncate text-[11px] text-muted-foreground">{r.address}</span></span>
                      </button>
                    </li>
                  ))}
              </ul>
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}

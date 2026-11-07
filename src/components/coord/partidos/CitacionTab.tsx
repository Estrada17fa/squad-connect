import * as React from "react";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { ChevronRight, Plane, Plus } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useSaveMatchLogistics, type MatchLogisticsRow, type OurMatch } from "@/hooks/useMatchOps";
import { tripsQueryOptions } from "@/hooks/useTrips";
import { DateTimeField, SegmentedField } from "@/components/coord/viajes/form";
import { LocationPicker } from "@/components/location/LocationPicker";
import { LocationCard } from "@/components/location/LocationCard";
import { TRIP_DISPLAY_LABEL, tripDisplayStatus } from "@/lib/viajes";
import { BottomBar } from "./parts";

const KITS = ["Local", "Visita", "Alterno"] as const;
type Kit = (typeof KITS)[number];
const pad = (n: number) => String(n).padStart(2, "0");
const toLocal = (iso: string | null | undefined) => { if (!iso) return ""; const d = new Date(iso); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`; };
export function parseKit(kit: string | null | undefined): { kit: Kit; note: string } {
  const [k, ...rest] = (kit ?? "").split(" — ");
  return { kit: (KITS as readonly string[]).includes(k) ? (k as Kit) : "Local", note: (KITS as readonly string[]).includes(k) ? rest.join(" — ") : kit ?? "" };
}

const field = "w-full rounded-xl bg-muted px-3 py-3 text-sm outline-none placeholder:text-muted-foreground";

export function CitacionTab({ match, logistics, canEdit, userId }: { match: OurMatch; logistics: MatchLogisticsRow | null; canEdit: boolean; userId: string }) {
  const save = useSaveMatchLogistics();
  const initial = React.useMemo(() => ({ time: toLocal(logistics?.call_time_at), loc: logistics?.meeting_location_id ?? null, ...parseKit(logistics?.kit), notes: logistics?.logistics_notes ?? "" }), [logistics]);
  const [v, setV] = React.useState(initial);
  React.useEffect(() => setV(initial), [initial]);
  const dirty = JSON.stringify(v) !== JSON.stringify(initial);

  const trips = useQuery({ ...tripsQueryOptions(match.club_id, null), enabled: !!match.calendar_event_id }).data ?? [];
  const trip = trips.find((t) => t.match_event_id === match.calendar_event_id) ?? null;

  async function submit() {
    try {
      await save.mutateAsync({
        matchId: match.id, clubId: match.club_id, createdBy: userId,
        call_time_at: v.time ? new Date(v.time).toISOString() : null,
        meeting_location_id: v.loc, kit: v.note.trim() ? `${v.kit} — ${v.note.trim()}` : v.kit, logistics_notes: v.notes.trim() || null,
      });
      toast.success(logistics?.callup_published_at ? "Citación guardada · se avisó a los convocados si cambió hora o lugar" : "Citación guardada");
    } catch (e: any) { toast.error(e.message ?? "No se pudo guardar"); }
  }

  return (
    <div className="space-y-5 pb-36">
      <p className="text-xs text-muted-foreground">{logistics?.callup_published_at ? "Los convocados ven esta citación." : "Los convocados la verán cuando publiques la convocatoria."}</p>
      <label className="block space-y-1.5"><span className="text-xs font-semibold text-muted-foreground">Hora de citación</span>
        {canEdit ? <DateTimeField value={v.time} onChange={(time) => setV({ ...v, time })} clearable /> : <div className={field}>{v.time || "Sin hora"}</div>}
      </label>
      <div className="space-y-1.5"><span className="text-xs font-semibold text-muted-foreground">Lugar</span>
        {canEdit ? <LocationPicker clubId={match.club_id} userId={userId} value={v.loc} onChange={(loc) => setV({ ...v, loc })} /> : null}
        {v.loc ? <LocationCard locationId={v.loc} /> : null}
      </div>
      <div className="space-y-1.5"><span className="text-xs font-semibold text-muted-foreground">Uniforme</span>
        <SegmentedField items={KITS.map((k) => ({ key: k, label: k }))} value={v.kit} onChange={(kit) => canEdit && setV({ ...v, kit })} />
        <input disabled={!canEdit} value={v.note} onChange={(e) => setV({ ...v, note: e.target.value })} placeholder="Nota del uniforme (opcional)" className={field} />
      </div>
      <label className="block space-y-1.5"><span className="text-xs font-semibold text-muted-foreground">Notas para los convocados</span>
        <textarea disabled={!canEdit} rows={3} value={v.notes} onChange={(e) => setV({ ...v, notes: e.target.value })} placeholder="Ej. traer espinilleras y documento" className={field} />
      </label>

      {!match.isHome ? (
        trip ? (
          <Link to="/coordinacion/general/viajes/$tripId" params={{ tripId: trip.id }} search={{} as any} className="coord-press flex items-center gap-3 rounded-2xl bg-card p-4">
            <Plane className="h-5 w-5 text-primary" />
            <div className="min-w-0 flex-1"><div className="truncate text-sm font-semibold">{trip.title}</div><div className="text-xs text-muted-foreground">{TRIP_DISPLAY_LABEL[tripDisplayStatus(trip)]}</div></div>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </Link>
        ) : canEdit ? (
          <Link to="/coordinacion/general/viajes/nuevo" className="coord-press flex items-center gap-3 rounded-2xl border border-dashed border-border p-4 text-sm font-semibold text-primary">
            <Plus className="h-5 w-5" /> Crear viaje para este partido
          </Link>
        ) : null
      ) : null}

      {canEdit ? (
        <BottomBar>
          <div className="flex-1" />
          <button type="button" disabled={!dirty || save.isPending} onClick={submit} className="min-h-11 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground disabled:opacity-50">{dirty ? "Guardar citación" : "Guardada"}</button>
        </BottomBar>
      ) : null}
    </div>
  );
}

import * as React from "react";
import {
  Bed,
  Bus,
  CalendarClock,
  FileText,
  Luggage,
  Plane,
  Utensils,
  type LucideIcon,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { formatDateTime } from "@/lib/calendar-utils";
import {
  LEG_LABEL,
  MEAL_TYPE_LABEL,
  TRANSPORT_TYPE_LABEL,
  TRIP_DOCS_BUCKET,
} from "@/lib/tripLogistics";
import { supabase } from "@/integrations/supabase/client";
import type { TripRow } from "@/hooks/useTrips";
import { useTripFlights } from "@/hooks/useTripFlights";
import { useTripTransports } from "@/hooks/useTripTransports";
import { useTripHotels } from "@/hooks/useTripHotels";
import { useTripMeals } from "@/hooks/useTripMeals";
import { useTripMaterial, materialOutstanding } from "@/hooks/useTripMaterial";
import { openTripDocument, useTripDocuments } from "@/hooks/useTripDocuments";

interface Props {
  trip: TripRow;
  userId: string;
}

interface Entry {
  id: string;
  at: string;
  icon: LucideIcon;
  title: string;
  lines: (string | null)[];
  highlight?: string | null;
  action?: { label: string; onClick: () => void } | null;
}

/**
 * "Mi viaje": solo lo que le toca a la persona, en orden cronológico.
 * Su citatorio, su transporte, su vuelo con pase y asiento, su cuarto,
 * sus comidas y el material que lleva bajo su responsabilidad.
 */
export function MyTripView({ trip, userId }: Props) {
  const flights = useTripFlights(trip.id).data ?? [];
  const transports = useTripTransports(trip.id).data ?? [];
  const hotels = useTripHotels(trip.id).data ?? [];
  const meals = useTripMeals(trip.id).data ?? [];
  const material = useTripMaterial(trip.id).data ?? [];
  const documents = useTripDocuments(trip.id).data ?? [];

  const openPass = async (path: string) => {
    try {
      const { data, error } = await supabase.storage.from(TRIP_DOCS_BUCKET).createSignedUrl(path, 300);
      if (error) throw error;
      window.open(data.signedUrl, "_blank", "noopener");
    } catch (e: any) {
      toast.error(e.message ?? "No se pudo abrir el pase de abordar");
    }
  };

  const entries: Entry[] = React.useMemo(() => {
    const out: Entry[] = [];

    if (trip.meeting_at) {
      out.push({
        id: "citatorio",
        at: trip.meeting_at,
        icon: CalendarClock,
        title: "Citatorio",
        lines: [trip.meeting_point ? `Punto de reunión: ${trip.meeting_point}` : null],
      });
    }

    for (const t of transports) {
      if (!t.passengers.some((p) => p.user_id === userId)) continue;
      out.push({
        id: `tr-${t.id}`,
        at: t.departs_at,
        icon: Bus,
        title: `${TRANSPORT_TYPE_LABEL[t.transport_type]} · ${LEG_LABEL[t.leg]}${t.label ? ` · ${t.label}` : ""}`,
        lines: [`${t.pickup_location} → ${t.destination}`, t.notes],
      });
    }

    for (const f of flights) {
      if (!f.passengers.some((p) => p.user_id === userId)) continue;
      const pass = f.boarding_passes.find((b) => b.user_id === userId);
      const handler = f.baggage_handlers.find((h) => h.user_id === userId);
      out.push({
        id: `fl-${f.id}`,
        at: f.departs_at,
        icon: Plane,
        title: `Vuelo ${f.flight_code} · ${LEG_LABEL[f.leg]}`,
        lines: [
          `${f.origin} → ${f.destination}${f.gate ? ` · Puerta ${f.gate}` : ""}`,
          pass?.seat ? `Tu asiento: ${pass.seat}` : null,
          f.baggage_instructions,
        ],
        highlight: handler
          ? `Tú documentas las maletas del equipo${handler.pieces ? ` · ${handler.pieces} pieza${handler.pieces === 1 ? "" : "s"}` : ""}`
          : null,
        action: pass ? { label: "Ver mi pase de abordar", onClick: () => openPass(pass.file_path) } : null,
      });
    }

    for (const h of hotels) {
      const room = h.rooms.find((r) => r.occupants.some((o) => o.user_id === userId));
      if (!room) continue;
      out.push({
        id: `ho-${h.id}`,
        at: h.check_in_at,
        icon: Bed,
        title: `${h.name} · Cuarto ${room.room_label}`,
        lines: [
          h.address,
          room.occupants.length > 1
            ? `Compartes con: ${room.occupants
                .filter((o) => o.user_id !== userId)
                .map((o) => o.profile?.full_name ?? o.profile?.email ?? "Miembro")
                .join(", ")}`
            : "Cuarto individual",
        ],
      });
    }

    for (const m of meals) {
      out.push({
        id: `me-${m.id}`,
        at: m.scheduled_at,
        icon: Utensils,
        title: MEAL_TYPE_LABEL[m.meal_type],
        lines: [m.location, m.notes],
      });
    }

    return out.sort((a, b) => a.at.localeCompare(b.at));
  }, [trip.meeting_at, trip.meeting_point, transports, flights, hotels, meals, userId]);

  const myMaterial = material.filter((l) => l.borrower_user_id === userId);

  return (
    <div className="space-y-4">
      {entries.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Todavía no tienes asignaciones en este viaje. Consulta el itinerario completo.
        </p>
      ) : (
        <ol className="relative space-y-3 border-l border-white/10 pl-5">
          {entries.map((e) => {
            const Icon = e.icon;
            return (
              <li key={e.id} className="relative">
                <span className="absolute -left-[27px] top-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary/20 ring-2 ring-background">
                  <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                </span>
                <div className="glass space-y-1 p-3">
                  <p className="flex items-center gap-2 text-sm font-medium text-foreground">
                    <Icon className="h-4 w-4 text-primary" /> {e.title}
                  </p>
                  <p className="text-xs text-muted-foreground">{formatDateTime(e.at)}</p>
                  {e.lines.filter(Boolean).map((l, i) => (
                    <p key={i} className="text-xs text-muted-foreground">
                      {l}
                    </p>
                  ))}
                  {e.highlight ? (
                    <p className="rounded-lg border border-primary/40 bg-primary/10 px-3 py-2 text-xs font-medium text-primary">
                      {e.highlight}
                    </p>
                  ) : null}
                  {e.action ? (
                    <Button type="button" size="sm" variant="outline" className="w-full" onClick={e.action.onClick}>
                      <FileText className="mr-1.5 h-4 w-4" /> {e.action.label}
                    </Button>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ol>
      )}

      {myMaterial.length > 0 ? (
        <section className="space-y-2">
          <h3 className="flex items-center gap-2 font-display text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            <Luggage className="h-4 w-4" /> Material a tu cargo
          </h3>
          {myMaterial.map((l) => (
            <div key={l.id} className="glass p-3">
              <p className="text-sm text-foreground">
                {l.item?.name ?? "Material"} <span className="text-muted-foreground">×{l.quantity}</span>
              </p>
              <p className="text-xs text-muted-foreground">
                {materialOutstanding(l) === 0
                  ? "Devuelto"
                  : `Pendientes de devolver: ${materialOutstanding(l)}`}
              </p>
            </div>
          ))}
        </section>
      ) : null}

      {documents.length > 0 ? (
        <section className="space-y-2">
          <h3 className="flex items-center gap-2 font-display text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            <FileText className="h-4 w-4" /> Documentos del viaje
          </h3>
          {documents.map((d) => (
            <button
              key={d.id}
              type="button"
              className="glass block w-full p-3 text-left"
              onClick={() =>
                openTripDocument(d.file_path).catch((e: any) =>
                  toast.error(e.message ?? "No se pudo abrir el documento"),
                )
              }
            >
              <p className="truncate text-sm text-foreground">{d.title}</p>
              {d.description ? <p className="text-xs text-muted-foreground">{d.description}</p> : null}
            </button>
          ))}
        </section>
      ) : null}
    </div>
  );
}

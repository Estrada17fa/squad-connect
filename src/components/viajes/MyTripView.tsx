import * as React from "react";
import { Luggage, Plane, Utensils } from "lucide-react";
import { toast } from "sonner";
import { formatDateTime } from "@/lib/calendar-utils";
import { MEAL_TYPE_LABEL, TRIP_DOCS_BUCKET } from "@/lib/tripLogistics";
import { supabase } from "@/integrations/supabase/client";
import type { TripRow } from "@/hooks/useTrips";
import { useTripFlights } from "@/hooks/useTripFlights";
import { useTripTransports } from "@/hooks/useTripTransports";
import { useTripHotels } from "@/hooks/useTripHotels";
import { useTripMeals } from "@/hooks/useTripMeals";
import { useTripMaterial, materialOutstanding } from "@/hooks/useTripMaterial";
import { MyCallCard } from "./mi/MyCallCard";
import { MyFlightCard } from "./mi/MyFlightCard";
import { MyStayCard } from "./mi/MyStayCard";
import { MyTransportCard } from "./mi/MyTransportCard";
import { TripCardShell } from "./mi/TripCardShell";
import { TripTabs } from "./TripTabs";

interface Props {
  trip: TripRow;
  userId: string;
}

/**
 * "Mi viaje": primero LO DEL USUARIO (citación, vuelos con su pase, transporte,
 * hospedaje, comidas y material) y debajo toda la info general del viaje,
 * visible en las pestañas Ida / Regreso / General.
 */
export function MyTripView({ trip, userId }: Props) {
  const flights = useTripFlights(trip.id).data ?? [];
  const transports = useTripTransports(trip.id).data ?? [];
  const hotels = useTripHotels(trip.id).data ?? [];
  const meals = useTripMeals(trip.id).data ?? [];
  const material = useTripMaterial(trip.id).data ?? [];

  const openPass = async (path: string, download: boolean) => {
    try {
      const { data, error } = await supabase.storage
        .from(TRIP_DOCS_BUCKET)
        .createSignedUrl(path, 300, download ? { download: true } : undefined);
      if (error) throw error;
      window.open(data.signedUrl, "_blank", "noopener");
    } catch (e: any) {
      toast.error(e.message ?? "No se pudo abrir el pase de abordar");
    }
  };

  const myFlights = React.useMemo(
    () =>
      flights
        .filter((f) => f.passengers.some((p) => p.user_id === userId))
        .sort((a, b) => a.departs_at.localeCompare(b.departs_at)),
    [flights, userId],
  );

  const myTransports = React.useMemo(
    () =>
      transports
        .filter((t) => t.passengers.some((p) => p.user_id === userId))
        .sort((a, b) => a.departs_at.localeCompare(b.departs_at)),
    [transports, userId],
  );

  const myStays = React.useMemo(
    () =>
      hotels
        .map((h) => ({ hotel: h, room: h.rooms.find((r) => r.occupants.some((o) => o.user_id === userId)) }))
        .filter((s): s is { hotel: (typeof hotels)[number]; room: NonNullable<typeof s.room> } => !!s.room),
    [hotels, userId],
  );

  const myMaterial = material.filter((l) => l.borrower_user_id === userId);
  const hasMine = !!trip.meeting_at || myFlights.length > 0 || myTransports.length > 0 || myStays.length > 0;

  return (
    <div className="space-y-5">
      <section className="space-y-3">
        <h3 className="font-display text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Mi información
        </h3>

        {hasMine ? (
          <>
            {trip.meeting_at ? (
              <MyCallCard meetingAt={trip.meeting_at} meetingPoint={trip.meeting_point} />
            ) : null}
            {myFlights.map((f) => (
              <MyFlightCard key={f.id} flight={f} userId={userId} onOpenPass={openPass} />
            ))}
            {myTransports.map((t) => (
              <MyTransportCard key={t.id} transport={t} />
            ))}
            {myStays.map(({ hotel, room }) => (
              <MyStayCard key={room.id} hotel={hotel} room={room} userId={userId} />
            ))}
          </>
        ) : (
          <div className="glass p-4">
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <Plane className="h-4 w-4" /> Todavía no tienes asignaciones en este viaje.
            </p>
          </div>
        )}

        {meals.length > 0 ? (
          <TripCardShell icon={Utensils} eyebrow="Mis comidas" title={`${meals.length} servicio${meals.length === 1 ? "" : "s"}`}>
            {meals.map((m) => (
              <p key={m.id} className="text-sm text-muted-foreground">
                <span className="text-foreground">{MEAL_TYPE_LABEL[m.meal_type]}</span> ·{" "}
                {formatDateTime(m.scheduled_at)}
                {m.location ? ` · ${m.location}` : ""}
              </p>
            ))}
          </TripCardShell>
        ) : null}

        {myMaterial.length > 0 ? (
          <TripCardShell icon={Luggage} eyebrow="Mi equipaje" title="Material a tu cargo">
            {myMaterial.map((l) => (
              <p key={l.id} className="text-sm text-muted-foreground">
                <span className="text-foreground">{l.item?.name ?? "Material"}</span> ×{l.quantity} ·{" "}
                {materialOutstanding(l) === 0
                  ? "Devuelto"
                  : `Pendientes de devolver: ${materialOutstanding(l)}`}
              </p>
            ))}
          </TripCardShell>
        ) : null}
      </section>

      <section className="space-y-2">
        <h3 className="font-display text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Información del viaje
        </h3>
        <TripTabs trip={trip} canEdit={false} />
      </section>
    </div>
  );
}

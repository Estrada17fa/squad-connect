import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { MiniProfile } from "@/lib/tripLogistics";
import type { TripRow } from "@/hooks/useTrips";
import { useTripFlights } from "@/hooks/useTripFlights";
import { useTripTransports } from "@/hooks/useTripTransports";
import { useTripHotels } from "@/hooks/useTripHotels";
import { useTripMeals } from "@/hooks/useTripMeals";
import { useTripLuggage } from "@/hooks/useTripLuggage";
import { useTripMaterial } from "@/hooks/useTripMaterial";
import { FlightsSection } from "./logistica/FlightsSection";
import { TransportsSection } from "./logistica/TransportsSection";
import { HotelsSection } from "./logistica/HotelsSection";
import { MealsSection } from "./logistica/MealsSection";
import { LuggageSection } from "./logistica/LuggageSection";
import { TripDocumentsSection } from "./logistica/TripDocumentsSection";

import type { AssignCandidate } from "./logistica/PassengerAssignDialog";

interface Props {
  trip: TripRow;
  canEdit: boolean;
}

/**
 * Logística del viaje en orden cronológico:
 * transporte ida → vuelo ida → hotel → comidas → vuelo regreso → transporte regreso → equipaje.
 * Cada bloque vive en su propio componente y hook.
 */
export function TripLogisticsTimeline({ trip, canEdit }: Props) {
  const { data: userId } = useQuery({
    queryKey: ["current-user-id"],
    queryFn: async () => (await supabase.auth.getUser()).data.user?.id ?? "",
    staleTime: 5 * 60 * 1000,
  });

  const flights = useTripFlights(trip.id).data ?? [];
  const transports = useTripTransports(trip.id).data ?? [];
  const hotels = useTripHotels(trip.id).data ?? [];
  const meals = useTripMeals(trip.id).data ?? [];
  const luggage = useTripLuggage(trip.id).data ?? [];
  const material = useTripMaterial(trip.id).data ?? [];

  // Solo los convocados pueden asignarse a vuelos, transportes o cuartos.
  const travelers: AssignCandidate[] = React.useMemo(
    () =>
      (trip.travelers ?? []).map((t) => ({
        user_id: t.user_id,
        profile: (t.profile ?? null) as MiniProfile | null,
        note: t.role_note ?? null,
      })),
    [trip.travelers],
  );

  const editable = canEdit && !!userId;
  const uid = userId ?? "";

  return (
    <section className="space-y-5">
      <h3 className="font-display text-sm font-semibold uppercase tracking-wide text-muted-foreground">Logística</h3>

      <TransportsSection
        tripId={trip.id}
        userId={uid}
        leg="ida"
        transports={transports.filter((t) => t.leg === "ida")}
        allTransports={transports}
        travelers={travelers}
        canEdit={editable}
      />

      <FlightsSection
        tripId={trip.id}
        userId={uid}
        leg="ida"
        flights={flights.filter((f) => f.leg === "ida")}
        allFlights={flights}
        travelers={travelers}
        canEdit={editable}
      />

      <HotelsSection tripId={trip.id} userId={uid} hotels={hotels} travelers={travelers} canEdit={editable} />

      <MealsSection tripId={trip.id} userId={uid} meals={meals} canEdit={editable} />

      <FlightsSection
        tripId={trip.id}
        userId={uid}
        leg="regreso"
        flights={flights.filter((f) => f.leg === "regreso")}
        allFlights={flights}
        travelers={travelers}
        canEdit={editable}
      />

      <TransportsSection
        tripId={trip.id}
        userId={uid}
        leg="regreso"
        transports={transports.filter((t) => t.leg === "regreso")}
        allTransports={transports}
        travelers={travelers}
        canEdit={editable}
      />

      <LuggageSection
        tripId={trip.id}
        clubId={trip.club_id}
        teamId={trip.team_id}
        userId={uid}
        defaultReturnAt={trip.return_at}
        items={luggage}
        loans={material}
        travelers={travelers.map((t) => ({ user_id: t.user_id, profile: t.profile }))}
        canEdit={editable}
      />

      <TripDocumentsSection
        tripId={trip.id}
        clubId={trip.club_id}
        teamId={trip.team_id}
        userId={uid}
        canEdit={editable}
      />

    </section>
  );
}

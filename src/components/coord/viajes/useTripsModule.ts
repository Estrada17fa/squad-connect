import * as React from "react";
import { useApp } from "@/components/squad/AppLayout";
import { useTrips, type TripRow } from "@/hooks/useTrips";
import { useTripFlights } from "@/hooks/useTripFlights";
import { useTripHotels } from "@/hooks/useTripHotels";
import { useTripTransports } from "@/hooks/useTripTransports";
import { useTripMeals } from "@/hooks/useTripMeals";
import { useOurMatches, type OurMatch } from "@/hooks/useMatchOps";
import { useTeamAccess } from "@/hooks/useTeamAccess";
import { useEditableTeams } from "@/hooks/useEditableTeams";
import { canManageTripsModule } from "@/lib/permissions";
import { computeReadiness, splitTrips } from "@/lib/viajes";
import type { AssignCandidate } from "@/components/viajes/logistica/PassengerAssignDialog";
import type { MiniProfile } from "@/lib/tripLogistics";

/** Acceso al módulo de gestión de viajes (Ver o Editar en alguna categoría). */
export function useTripsAccess() {
  const { isSuperAdmin, getModuleAccess } = useApp();
  const canManage = isSuperAdmin || canManageTripsModule(getModuleAccess("viajes"));
  const { canEditTeam } = useTeamAccess("viajes");
  const editableTeams = useEditableTeams("viajes");
  return { canManage, canEditTeam, editableTeams, canCreate: editableTeams.length > 0 };
}

/** Todos los viajes visibles del club + partidos (para escudos). */
export function useClubTrips(enabled = true) {
  const { profile } = useApp();
  const clubId = profile?.club_id ?? null;
  const tripsQ = useTrips(enabled ? clubId : null, null);
  const matchesQ = useOurMatches(enabled ? clubId : null);
  const matchByEvent = React.useMemo(() => {
    const m = new Map<string, OurMatch>();
    for (const x of matchesQ.data ?? []) if (x.calendar_event_id) m.set(x.calendar_event_id, x);
    return m;
  }, [matchesQ.data]);
  const trips = tripsQ.data ?? [];
  const split = React.useMemo(() => splitTrips(trips), [trips]);
  return { clubId, tripsQ, trips, ...split, matchFor: (t: TripRow | null | undefined) => (t?.match_event_id ? matchByEvent.get(t.match_event_id) ?? null : null) };
}

/** Logística completa de un viaje y su preparación. */
export function useTripLogistics(trip: TripRow | null | undefined) {
  const id = trip?.id ?? null;
  const flightsQ = useTripFlights(id);
  const hotelsQ = useTripHotels(id);
  const transportsQ = useTripTransports(id);
  const mealsQ = useTripMeals(id);
  const flights = flightsQ.data ?? [];
  const hotels = hotelsQ.data ?? [];
  const transports = transportsQ.data ?? [];
  const meals = mealsQ.data ?? [];
  const readiness = React.useMemo(
    () => computeReadiness(trip?.travelers ?? [], flights, hotels, transports),
    [trip?.travelers, flights, hotels, transports],
  );
  const travelers: AssignCandidate[] = React.useMemo(
    () => (trip?.travelers ?? []).map((t) => ({ user_id: t.user_id, profile: (t.profile ?? null) as MiniProfile | null, note: t.role_note ?? null })),
    [trip?.travelers],
  );
  const loading = flightsQ.isLoading || hotelsQ.isLoading || transportsQ.isLoading;
  return { flights, hotels, transports, meals, readiness, travelers, loading };
}

/** Próximo viaje con su preparación (portada de General). */
export function useNextTrip(enabled: boolean) {
  const { upcoming, matchFor, tripsQ } = useClubTrips(enabled);
  const next = upcoming[0] ?? null;
  const lg = useTripLogistics(next);
  return { next, match: matchFor(next), readiness: lg.readiness, loading: tripsQ.isLoading };
}

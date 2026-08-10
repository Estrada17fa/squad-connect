import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { Bus, Plane, Ticket } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { MiniProfile } from "@/lib/tripLogistics";
import type { TripRow } from "@/hooks/useTrips";
import { useTripFlights } from "@/hooks/useTripFlights";
import { useTripTransports } from "@/hooks/useTripTransports";
import { useTripHotels } from "@/hooks/useTripHotels";
import { useTripMeals } from "@/hooks/useTripMeals";
import { useTripMaterial } from "@/hooks/useTripMaterial";
import { FlightsSection } from "./logistica/FlightsSection";
import { TransportsSection } from "./logistica/TransportsSection";
import { HotelsSection } from "./logistica/HotelsSection";
import { MealsSection } from "./logistica/MealsSection";
import { LuggageSection } from "./logistica/LuggageSection";
import { TravelerLuggageSection } from "./logistica/TravelerLuggageSection";
import { TripDocumentsSection } from "./logistica/TripDocumentsSection";
import { TimelineSection } from "./logistica/TimelineSection";
import type { AssignCandidate } from "./logistica/PassengerAssignDialog";
import { cn } from "@/lib/utils";

type TabKey = "ida" | "regreso" | "general";

const TABS: { key: TabKey; label: string }[] = [
  { key: "ida", label: "Ida" },
  { key: "regreso", label: "Regreso" },
  { key: "general", label: "General" },
];

interface Props {
  trip: TripRow;
  canEdit: boolean;
  /** Información general del viaje y convocatoria (se muestran en la pestaña General). */
  generalHeader?: React.ReactNode;
}

/**
 * Estructura del detalle del viaje en tres pestañas:
 * Ida (transporte, vuelos, pases), Regreso (lo mismo) y General
 * (hoteles, comidas, equipaje, documentos e info del viaje).
 */
export function TripTabs({ trip, canEdit, generalHeader }: Props) {
  const [tab, setTab] = React.useState<TabKey>("ida");

  const { data: userId } = useQuery({
    queryKey: ["current-user-id"],
    queryFn: async () => (await supabase.auth.getUser()).data.user?.id ?? "",
    staleTime: 5 * 60 * 1000,
  });

  const flights = useTripFlights(trip.id).data ?? [];
  const transports = useTripTransports(trip.id).data ?? [];
  const hotels = useTripHotels(trip.id).data ?? [];
  const meals = useTripMeals(trip.id).data ?? [];
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
    <div className="space-y-4">
      <div role="tablist" aria-label="Tramos del viaje" className="flex gap-1 rounded-xl border border-border/60 p-1">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            role="tab"
            aria-selected={tab === t.key}
            onClick={() => setTab(t.key)}
            className={cn(
              "flex-1 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
              tab === t.key ? "bg-primary/15 text-primary" : "text-muted-foreground hover:text-foreground",
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "general" ? null : (
        <LegPanel
          leg={tab}
          trip={trip}
          uid={uid}
          editable={editable}
          travelers={travelers}
          flights={flights}
          transports={transports}
        />
      )}

      {tab === "general" ? (
        <div className="space-y-5">
          {generalHeader}

          <HotelsSection
            tripId={trip.id}
            clubId={trip.club_id}
            userId={uid}
            hotels={hotels}
            travelers={travelers}
            canEdit={editable}
          />

          <MealsSection tripId={trip.id} userId={uid} meals={meals} canEdit={editable} />

          <TravelerLuggageSection
            tripId={trip.id}
            userId={uid}
            travelers={travelers.map((t) => ({ user_id: t.user_id, profile: t.profile }))}
            canEdit={editable}
          />

          <LuggageSection
            tripId={trip.id}
            clubId={trip.club_id}
            teamId={trip.team_id}
            userId={uid}
            defaultReturnAt={trip.return_at}
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
        </div>
      ) : null}
    </div>
  );
}

function LegPanel({
  leg,
  trip,
  uid,
  editable,
  travelers,
  flights,
  transports,
}: {
  leg: "ida" | "regreso";
  trip: TripRow;
  uid: string;
  editable: boolean;
  travelers: AssignCandidate[];
  flights: any[];
  transports: any[];
}) {
  const legFlights = (flights ?? []).filter((f: any) => f.leg === leg);
  const legTransports = (transports ?? []).filter((t: any) => t.leg === leg);
  const passes = legFlights.reduce((n: number, f: any) => n + (f.boarding_passes?.length ?? 0), 0);

  return (
    <div className="space-y-5">
      <TransportsSection
        tripId={trip.id}
        clubId={trip.club_id}
        userId={uid}
        leg={leg}
        transports={legTransports}
        allTransports={transports}
        travelers={travelers}
        canEdit={editable}
      />

      <FlightsSection
        tripId={trip.id}
        userId={uid}
        leg={leg}
        flights={legFlights}
        allFlights={flights}
        travelers={travelers}
        canEdit={editable}
      />

      {/* Contenedor de pases de abordar (se llenará en la Parte 3). */}
      <TimelineSection
        icon={Ticket}
        title={`Pases de abordar · ${leg === "ida" ? "Ida" : "Regreso"}`}
        count={passes}
        emptyLabel={
          legFlights.length === 0
            ? "Registra primero un vuelo para adjuntar pases de abordar."
            : "Sin pases de abordar cargados. Se adjuntan dentro de cada vuelo."
        }
      >
        {passes > 0 ? (
          <p className="text-xs text-muted-foreground">
            {passes} pase{passes === 1 ? "" : "s"} cargado{passes === 1 ? "" : "s"}. Ábrelos desde el detalle del vuelo.
          </p>
        ) : null}
      </TimelineSection>

      {legTransports.length === 0 && legFlights.length === 0 ? (
        <p className="flex items-center gap-2 text-xs text-muted-foreground">
          {leg === "ida" ? <Plane className="h-3.5 w-3.5" /> : <Bus className="h-3.5 w-3.5" />}
          Aún no hay logística registrada para este tramo.
        </p>
      ) : null}
    </div>
  );
}

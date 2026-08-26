import * as React from "react";
import { Bed, Bus, Plane, Users } from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { formatDateTime } from "@/lib/calendar-utils";
import {
  LEG_LABEL,
  TRANSPORT_TYPE_LABEL,
  personInitials,
  personLabel,
} from "@/lib/tripLogistics";
import type { TripFlight } from "@/hooks/useTripFlights";
import type { TripTransport } from "@/hooks/useTripTransports";
import type { TripHotel } from "@/hooks/useTripHotels";
import type { TripRow } from "@/hooks/useTrips";

/**
 * Detalle del viaje que NO es del usuario: siempre plegado.
 * - `detail="player"`: solo la lista simple de convocados.
 * - `detail="full"`: manifiesto de vuelos y logística general (staff).
 */
export function TripFoldedSections({
  trip,
  flights,
  transports,
  hotels,
  detail,
}: {
  trip: TripRow;
  flights: TripFlight[];
  transports: TripTransport[];
  hotels: TripHotel[];
  detail: "player" | "full";
}) {
  const travelers = trip.travelers ?? [];

  return (
    <Accordion type="multiple" className="space-y-2">
      {travelers.length > 0 ? (
        <AccordionItem value="travelers" className="glass overflow-hidden rounded-lg border-none px-3">
          <AccordionTrigger className="text-sm">
            <span className="flex items-center gap-2">
              <Users className="h-4 w-4 text-primary" /> Quiénes van al viaje
              <span className="text-xs text-muted-foreground">({travelers.length})</span>
            </span>
          </AccordionTrigger>
          <AccordionContent>
            <ul className="space-y-2 pb-2">
              {travelers.map((t) => (
                <li key={t.id} className="flex items-center gap-2">
                  <Avatar className="h-7 w-7">
                    <AvatarImage src={t.profile?.avatar_url ?? undefined} alt="" />
                    <AvatarFallback className="text-[10px]">{personInitials(t.profile)}</AvatarFallback>
                  </Avatar>
                  <span className="min-w-0 flex-1 truncate text-sm text-foreground">
                    {personLabel(t.profile)}
                  </span>
                  {t.role_note ? (
                    <span className="text-xs text-muted-foreground">{t.role_note}</span>
                  ) : null}
                </li>
              ))}
            </ul>
          </AccordionContent>
        </AccordionItem>
      ) : null}

      {detail === "full" && flights.length > 0 ? (
        <AccordionItem value="flights" className="glass overflow-hidden rounded-lg border-none px-3">
          <AccordionTrigger className="text-sm">
            <span className="flex items-center gap-2">
              <Plane className="h-4 w-4 text-primary" /> Ver todos los vuelos
              <span className="text-xs text-muted-foreground">({flights.length})</span>
            </span>
          </AccordionTrigger>
          <AccordionContent>
            <div className="space-y-3 pb-2">
              {flights.map((f) => (
                <div key={f.id} className="rounded-lg border border-border/60 bg-white/5 p-3">
                  <p className="text-sm font-medium text-foreground">
                    {f.airline ? `${f.airline} ` : ""}
                    {f.flight_code} · {LEG_LABEL[f.leg]}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {f.origin} → {f.destination} · {formatDateTime(f.departs_at)}
                    {f.gate ? ` · Puerta ${f.gate}` : ""}
                  </p>
                  {f.passengers.length > 0 ? (
                    <p className="mt-1 text-xs text-muted-foreground">
                      Pasajeros ({f.passengers.length}):{" "}
                      {f.passengers.map((p) => personLabel(p.profile)).join(", ")}
                    </p>
                  ) : null}
                </div>
              ))}
            </div>
          </AccordionContent>
        </AccordionItem>
      ) : null}

      {detail === "full" && (transports.length > 0 || hotels.length > 0) ? (
        <AccordionItem value="logistics" className="glass overflow-hidden rounded-lg border-none px-3">
          <AccordionTrigger className="text-sm">
            <span className="flex items-center gap-2">
              <Bus className="h-4 w-4 text-primary" /> Ver logística general
            </span>
          </AccordionTrigger>
          <AccordionContent>
            <div className="space-y-3 pb-2">
              {transports.map((t) => (
                <div key={t.id} className="rounded-lg border border-border/60 bg-white/5 p-3">
                  <p className="text-sm font-medium text-foreground">
                    {TRANSPORT_TYPE_LABEL[t.transport_type]} · {LEG_LABEL[t.leg]}
                    {t.label ? ` · ${t.label}` : ""}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {t.pickup_location} → {t.destination} · {formatDateTime(t.departs_at)}
                  </p>
                  {t.passengers.length > 0 ? (
                    <p className="mt-1 text-xs text-muted-foreground">
                      Pasajeros ({t.passengers.length}):{" "}
                      {t.passengers.map((p) => personLabel(p.profile)).join(", ")}
                    </p>
                  ) : null}
                </div>
              ))}
              {hotels.map((h) => (
                <div key={h.id} className="rounded-lg border border-border/60 bg-white/5 p-3">
                  <p className="flex items-center gap-2 text-sm font-medium text-foreground">
                    <Bed className="h-4 w-4 text-primary" /> {h.name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {h.address ? `${h.address} · ` : ""}
                    {formatDateTime(h.check_in_at)}
                  </p>
                  {h.rooms.map((r) => (
                    <p key={r.id} className="mt-1 text-xs text-muted-foreground">
                      Cuarto {r.room_label}: {r.occupants.map((o) => personLabel(o.profile)).join(", ") || "Sin asignar"}
                    </p>
                  ))}
                </div>
              ))}
            </div>
          </AccordionContent>
        </AccordionItem>
      ) : null}
    </Accordion>
  );
}

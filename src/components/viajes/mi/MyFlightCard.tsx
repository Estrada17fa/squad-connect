import * as React from "react";
import { Download, FileText, Plane } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatDateTime } from "@/lib/calendar-utils";
import { LEG_LABEL } from "@/lib/tripLogistics";
import type { TripFlight } from "@/hooks/useTripFlights";
import { TripCardShell, TripLine } from "./TripCardShell";

/** Mi vuelo: ruta grande, horarios y acceso directo a MI pase de abordar. */
export function MyFlightCard({
  flight,
  userId,
  onOpenPass,
}: {
  flight: TripFlight;
  userId: string;
  onOpenPass: (path: string, download: boolean) => void;
}) {
  const pass = flight.boarding_passes.find((b) => b.user_id === userId) ?? null;
  const handler = flight.baggage_handlers.find((h) => h.user_id === userId) ?? null;

  return (
    <TripCardShell
      icon={Plane}
      eyebrow={`Mi vuelo · ${LEG_LABEL[flight.leg]}`}
      title={`${flight.airline ? `${flight.airline} ` : ""}${flight.flight_code}`}
    >
      <p className="font-display text-2xl font-semibold tracking-tight text-foreground">
        {flight.origin} <span className="text-muted-foreground">→</span> {flight.destination}
      </p>

      <div className="grid grid-cols-2 gap-3 text-sm">
        <div>
          <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Sale</p>
          <p className="text-foreground">{formatDateTime(flight.departs_at)}</p>
        </div>
        {flight.arrives_at ? (
          <div>
            <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Llega</p>
            <p className="text-foreground">{formatDateTime(flight.arrives_at)}</p>
          </div>
        ) : null}
        {flight.gate ? (
          <div>
            <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Puerta</p>
            <p className="text-foreground">{flight.gate}</p>
          </div>
        ) : null}
        {pass?.seat ? (
          <div>
            <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Mi asiento</p>
            <p className="text-foreground">{pass.seat}</p>
          </div>
        ) : null}
      </div>

      <TripLine>{flight.baggage_instructions}</TripLine>

      {handler?.checked_bag ? (
        <p className="rounded-lg border border-primary/40 bg-primary/10 px-3 py-2 text-xs font-medium text-primary">
          Documentas maleta
          {handler.pieces ? ` · ${handler.pieces} pieza${handler.pieces === 1 ? "" : "s"}` : ""}
        </p>
      ) : handler?.carry_on ? (
        <p className="rounded-lg border border-primary/40 bg-primary/10 px-3 py-2 text-xs font-medium text-primary">
          Solo maleta de mano
        </p>
      ) : null}

      {pass ? (
        <div className="flex gap-2">
          <Button
            type="button"
            className="glow-primary flex-1"
            onClick={() => onOpenPass(pass.file_path, false)}
          >
            <FileText className="mr-1.5 h-4 w-4" /> Ver mi pase de abordar
          </Button>
          <Button
            type="button"
            variant="outline"
            size="icon"
            aria-label="Descargar mi pase de abordar"
            onClick={() => onOpenPass(pass.file_path, true)}
          >
            <Download className="h-4 w-4" />
          </Button>
        </div>
      ) : (
        <p className="rounded-lg border border-border/60 bg-white/5 px-3 py-2 text-xs text-muted-foreground">
          Tu pase aún no está disponible.
        </p>
      )}
    </TripCardShell>
  );
}

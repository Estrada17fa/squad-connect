import * as React from "react";
import { toast } from "sonner";
import { Briefcase, Check, Luggage, Ban } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { personInitials, personLabel, type MiniProfile } from "@/lib/tripLogistics";
import { useFlightMutations, type TripFlight } from "@/hooks/useTripFlights";

interface Props {
  tripId: string;
  flight: TripFlight;
  canEdit: boolean;
}

type Flags = { checked_bag: boolean; carry_on: boolean; captured: boolean };

/**
 * Equipaje por persona dentro de un vuelo: cada pasajero asignado se marca
 * con chips (documentada, de mano o sin equipaje). El registro es por vuelo,
 * así que ida y regreso pueden ser distintos.
 */
export function FlightLuggageSection({ tripId, flight, canEdit }: Props) {
  const { setLuggageFlags, clearLuggageFlags } = useFlightMutations(tripId);

  const byUser = React.useMemo(() => {
    const map = new Map<string, Flags>();
    for (const h of flight.baggage_handlers) {
      map.set(h.user_id, { checked_bag: h.checked_bag, carry_on: h.carry_on, captured: true });
    }
    return map;
  }, [flight.baggage_handlers]);

  const people = React.useMemo(
    () =>
      [...flight.passengers].sort((a, b) => personLabel(a.profile).localeCompare(personLabel(b.profile), "es")),
    [flight.passengers],
  );

  const flagsOf = (uid: string): Flags => byUser.get(uid) ?? { checked_bag: false, carry_on: false, captured: false };

  const checkedCount = people.filter((p) => flagsOf(p.user_id).checked_bag).length;
  const carryCount = people.filter((p) => flagsOf(p.user_id).carry_on).length;
  const noneCount = people.filter((p) => {
    const f = flagsOf(p.user_id);
    return f.captured && !f.checked_bag && !f.carry_on;
  }).length;

  const apply = (uid: string, checked_bag: boolean, carry_on: boolean) => {
    setLuggageFlags.mutate(
      { flightId: flight.id, userId: uid, checked_bag, carry_on },
      { onError: (e: any) => toast.error(e.message ?? "No se pudo guardar el equipaje") },
    );
  };

  const toggle = (uid: string, field: "checked_bag" | "carry_on") => {
    const f = flagsOf(uid);
    apply(uid, field === "checked_bag" ? !f.checked_bag : f.checked_bag, field === "carry_on" ? !f.carry_on : f.carry_on);
  };

  const setNone = (uid: string) => apply(uid, false, false);

  if (people.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">Asigna pasajeros al vuelo para registrar su equipaje.</p>
    );
  }

  return (
    <div className="space-y-2">
      <p className="text-xs text-muted-foreground">
        {checkedCount} documenta{checkedCount === 1 ? "" : "n"} · {carryCount} con maleta de mano · {noneCount} sin
        equipaje
      </p>

      <ul className="space-y-1">
        {people.map((p) => {
          const f = flagsOf(p.user_id);
          const none = f.captured && !f.checked_bag && !f.carry_on;
          return (
            <li key={p.user_id} className="glass flex items-center gap-3 p-2.5">
              <Avatar className="h-8 w-8">
                <AvatarImage src={p.profile?.avatar_url ?? undefined} alt="" />
                <AvatarFallback className="text-xs">{personInitials(p.profile)}</AvatarFallback>
              </Avatar>
              <span className="min-w-0 flex-1 truncate text-sm text-foreground">{personLabel(p.profile)}</span>

              <div className="flex shrink-0 flex-wrap justify-end gap-1.5">
                <LuggageChip
                  active={f.checked_bag}
                  canEdit={canEdit}
                  icon={Luggage}
                  label="Documentada"
                  onClick={() => toggle(p.user_id, "checked_bag")}
                />
                <LuggageChip
                  active={f.carry_on}
                  canEdit={canEdit}
                  icon={Briefcase}
                  label="Mano"
                  onClick={() => toggle(p.user_id, "carry_on")}
                />
                <LuggageChip
                  active={none}
                  canEdit={canEdit}
                  icon={Ban}
                  label="Sin equipaje"
                  onClick={() => setNone(p.user_id)}
                />
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function LuggageChip({
  active,
  canEdit,
  icon: Icon,
  label,
  onClick,
}: {
  active: boolean;
  canEdit: boolean;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  onClick: () => void;
}) {
  const className = cn(
    "flex items-center gap-1 rounded-full border px-2 py-1 text-[11px] transition-colors",
    active ? "border-primary/60 bg-primary/15 text-primary" : "border-border/60 text-muted-foreground",
    canEdit ? "hover:bg-white/5" : "",
  );

  const content = (
    <>
      <Icon className="h-3.5 w-3.5" />
      {label}
      {active ? <Check className="h-3 w-3" /> : null}
    </>
  );

  if (!canEdit) {
    return active ? <span className={className}>{content}</span> : null;
  }

  return (
    <button type="button" className={className} onClick={onClick} aria-pressed={active}>
      {content}
    </button>
  );
}

import * as React from "react";
import { toast } from "sonner";
import { Briefcase, Luggage, Ban } from "lucide-react";
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

  const setNone = (uid: string, alreadyNone: boolean) => {
    if (alreadyNone) {
      clearLuggageFlags.mutate(
        { flightId: flight.id, userId: uid },
        { onError: (e: any) => toast.error(e.message ?? "No se pudo quitar el equipaje") },
      );
    } else {
      apply(uid, false, false);
    }
  };

  if (people.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">Asigna pasajeros al vuelo para registrar su equipaje.</p>
    );
  }

  const short = (pr: MiniProfile | null | undefined) => { const n = personLabel(pr).split(" "); return n.length > 1 ? `${n[0]} ${n[1]}` : n[0]; };
  return (
    <div className="space-y-2">
      <p className="text-sm font-medium">
        {checkedCount} documentada{checkedCount === 1 ? "" : "s"} · {carryCount} de mano{noneCount ? ` · ${noneCount} sin equipaje` : ""}
      </p>
      <ul className="divide-y divide-border/40 overflow-hidden rounded-[16px] bg-card">
        {people.map((p) => {
          const f = flagsOf(p.user_id);
          const none = f.captured && !f.checked_bag && !f.carry_on;
          return (
            <li key={p.user_id} className="flex items-center gap-3 px-3 py-2">
              <Avatar className="h-8 w-8 shrink-0">
                <AvatarImage src={p.profile?.avatar_url ?? undefined} alt="" />
                <AvatarFallback className="text-xs">{personInitials(p.profile)}</AvatarFallback>
              </Avatar>
              <span className="min-w-0 flex-1 truncate text-sm">{short(p.profile)}</span>
              <div className="flex shrink-0 gap-1">
                <LuggageIcon active={f.checked_bag} canEdit={canEdit} icon={Luggage} label="Documentada" onClick={() => toggle(p.user_id, "checked_bag")} />
                <LuggageIcon active={f.carry_on} canEdit={canEdit} icon={Briefcase} label="De mano" onClick={() => toggle(p.user_id, "carry_on")} />
                <LuggageIcon active={none} canEdit={canEdit} icon={Ban} label="Sin equipaje" onClick={() => setNone(p.user_id, none)} />
              </div>
            </li>
          );
        })}
      </ul>
      <p className="flex flex-wrap gap-x-3 text-[11px] text-muted-foreground">
        <span className="inline-flex items-center gap-1"><Luggage className="h-3 w-3" /> Documentada</span>
        <span className="inline-flex items-center gap-1"><Briefcase className="h-3 w-3" /> Mano</span>
        <span className="inline-flex items-center gap-1"><Ban className="h-3 w-3" /> Sin equipaje</span>
      </p>
    </div>
  );
}

function LuggageIcon({ active, canEdit, icon: Icon, label, onClick }: {
  active: boolean; canEdit: boolean; icon: React.ComponentType<{ className?: string }>; label: string; onClick: () => void;
}) {
  const cls = cn("flex h-9 w-9 items-center justify-center rounded-full transition-colors", active ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground/60");
  if (!canEdit) return <span className={cls} aria-label={`${label}${active ? " · sí" : ""}`}><Icon className="h-4 w-4" /></span>;
  return <button type="button" className={cls} onClick={onClick} aria-pressed={active} aria-label={label}><Icon className="h-4 w-4" /></button>;
}

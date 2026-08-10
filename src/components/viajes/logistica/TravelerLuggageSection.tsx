import * as React from "react";
import { toast } from "sonner";
import { Briefcase, Check, Luggage } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { personInitials, personLabel, type MiniProfile } from "@/lib/tripLogistics";
import { useTripTravelerLuggage, useTravelerLuggageMutations } from "@/hooks/useTripTravelerLuggage";
import { TimelineSection } from "./TimelineSection";

interface Props {
  tripId: string;
  userId: string;
  travelers: { user_id: string; profile: MiniProfile | null }[];
  canEdit: boolean;
}

/**
 * Equipaje por persona: cada convocado puede llevar maleta documentada
 * y/o de mano. Sin peso ni dimensiones: solo lo necesario para saber
 * quién documenta al llegar al aeropuerto.
 */
export function TravelerLuggageSection({ tripId, userId, travelers, canEdit }: Props) {
  const rows = useTripTravelerLuggage(tripId).data ?? [];
  const { setFlags } = useTravelerLuggageMutations(tripId);

  const byUser = React.useMemo(() => {
    const map = new Map<string, { checked_bag: boolean; carry_on: boolean }>();
    for (const r of rows) map.set(r.user_id, { checked_bag: r.checked_bag, carry_on: r.carry_on });
    return map;
  }, [rows]);

  const sorted = React.useMemo(
    () => [...travelers].sort((a, b) => personLabel(a.profile).localeCompare(personLabel(b.profile), "es")),
    [travelers],
  );

  const checkedCount = sorted.filter((t) => byUser.get(t.user_id)?.checked_bag).length;
  const carryCount = sorted.filter((t) => byUser.get(t.user_id)?.carry_on).length;

  const toggle = (uid: string, field: "checked_bag" | "carry_on") => {
    const current = byUser.get(uid) ?? { checked_bag: false, carry_on: false };
    setFlags.mutate(
      {
        userId: uid,
        currentUserId: userId,
        checked_bag: field === "checked_bag" ? !current.checked_bag : current.checked_bag,
        carry_on: field === "carry_on" ? !current.carry_on : current.carry_on,
      },
      { onError: (e: any) => toast.error(e.message ?? "No se pudo guardar el equipaje") },
    );
  };

  return (
    <TimelineSection
      icon={Luggage}
      title="Equipaje por persona"
      count={sorted.length}
      emptyLabel="Aún no hay convocados en el viaje."
    >
      {sorted.length ? (
        <>
          <p className="text-xs text-muted-foreground">
            {checkedCount} documenta{checkedCount === 1 ? "" : "n"} · {carryCount} con maleta de mano
          </p>

          <ul className="space-y-1">
            {sorted.map((t) => {
              const flags = byUser.get(t.user_id) ?? { checked_bag: false, carry_on: false };
              return (
                <li
                  key={t.user_id}
                  className="glass flex items-center gap-3 p-2.5"
                >
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={t.profile?.avatar_url ?? undefined} alt="" />
                    <AvatarFallback className="text-xs">{personInitials(t.profile)}</AvatarFallback>
                  </Avatar>
                  <span className="min-w-0 flex-1 truncate text-sm text-foreground">{personLabel(t.profile)}</span>

                  <div className="flex shrink-0 gap-1.5">
                    <LuggageToggle
                      active={flags.checked_bag}
                      canEdit={canEdit}
                      icon={Luggage}
                      label="Documentada"
                      onClick={() => toggle(t.user_id, "checked_bag")}
                    />
                    <LuggageToggle
                      active={flags.carry_on}
                      canEdit={canEdit}
                      icon={Briefcase}
                      label="Mano"
                      onClick={() => toggle(t.user_id, "carry_on")}
                    />
                  </div>
                </li>
              );
            })}
          </ul>
        </>
      ) : null}
    </TimelineSection>
  );
}

function LuggageToggle({
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

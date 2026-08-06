import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { personInitials, personLabel, type MiniProfile } from "@/lib/tripLogistics";

interface Props {
  people: { id: string; profile: MiniProfile | null }[];
  emptyLabel?: string;
}

/** Lista compacta de personas asignadas (pasajeros, ocupantes). */
export function PersonChips({ people, emptyLabel = "Sin asignar" }: Props) {
  if (!people.length) {
    return <p className="text-xs text-muted-foreground">{emptyLabel}</p>;
  }
  return (
    <ul className="flex flex-wrap gap-1.5">
      {people.map((p) => (
        <li
          key={p.id}
          className="flex items-center gap-1.5 rounded-full border border-border/60 bg-white/5 py-0.5 pl-0.5 pr-2.5"
        >
          <Avatar className="h-5 w-5">
            <AvatarImage src={p.profile?.avatar_url ?? undefined} alt="" />
            <AvatarFallback className="text-[9px]">{personInitials(p.profile)}</AvatarFallback>
          </Avatar>
          <span className="max-w-[9rem] truncate text-xs text-foreground">{personLabel(p.profile)}</span>
        </li>
      ))}
    </ul>
  );
}

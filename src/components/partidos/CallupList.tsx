import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import type { CallupRow } from "@/hooks/useMatchOps";
import { cn } from "@/lib/utils";

function initials(name?: string | null) {
  if (!name) return "?";
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

/** Lista de convocados en solo lectura (compartida por Partidos y Torneo). */
export function CallupList({
  callups,
  highlightUserId,
  emptyMessage = "Todavía no hay convocatoria.",
}: {
  callups: CallupRow[];
  highlightUserId?: string | null;
  emptyMessage?: string;
}) {
  if (!callups.length) return <p className="text-sm text-muted-foreground">{emptyMessage}</p>;

  const sorted = [...callups].sort((a, b) =>
    (a.profile?.full_name ?? "").localeCompare(b.profile?.full_name ?? ""),
  );

  return (
    <ul className="divide-y divide-white/5 overflow-hidden rounded-lg bg-white/[0.03]">
      {sorted.map((c) => {
        const me = highlightUserId && c.user_id === highlightUserId;
        return (
          <li
            key={c.id}
            className={cn("flex items-center gap-3 px-3 py-2", me && "bg-primary/10")}
          >
            <Avatar className="h-8 w-8">
              <AvatarImage src={c.profile?.avatar_url ?? undefined} alt="" />
              <AvatarFallback className="text-xs">{initials(c.profile?.full_name)}</AvatarFallback>
            </Avatar>
            <span className="min-w-0 flex-1 truncate text-sm text-foreground">
              {c.profile?.full_name ?? "—"}
            </span>
            {me ? <span className="text-xs font-medium text-primary">Tú</span> : null}
          </li>
        );
      })}
    </ul>
  );
}

import * as React from "react";
import { cn } from "@/lib/utils";
import { initialsOf } from "@/lib/coordinacion";

export interface AvatarPerson {
  id: string;
  full_name: string | null;
  email: string | null;
  avatar_url: string | null;
}

/** Avatares apilados con "+N" — usado en tarjetas de tareas y juntas. */
export function AvatarStack({
  people,
  max = 4,
  size = "sm",
  className,
}: {
  people: AvatarPerson[];
  max?: number;
  size?: "sm" | "md";
  className?: string;
}) {
  const shown = people.slice(0, max);
  const rest = people.length - shown.length;
  const dim = size === "sm" ? "h-6 w-6 text-[10px]" : "h-8 w-8 text-xs";

  if (people.length === 0) {
    return <span className="text-xs text-muted-foreground">Sin asignar</span>;
  }

  return (
    <div className={cn("flex -space-x-2", className)}>
      {shown.map((p) => (
        <span
          key={p.id}
          title={p.full_name ?? p.email ?? ""}
          className={cn(
            "inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full border border-background bg-white/10 font-semibold text-foreground/80",
            dim,
          )}
        >
          {p.avatar_url ? (
            <img src={p.avatar_url} alt={p.full_name ?? "Miembro"} className="h-full w-full object-cover" />
          ) : (
            initialsOf(p.full_name, p.email)
          )}
        </span>
      ))}
      {rest > 0 ? (
        <span
          className={cn(
            "inline-flex shrink-0 items-center justify-center rounded-full border border-background bg-primary/20 font-semibold text-primary",
            dim,
          )}
        >
          +{rest}
        </span>
      ) : null}
    </div>
  );
}

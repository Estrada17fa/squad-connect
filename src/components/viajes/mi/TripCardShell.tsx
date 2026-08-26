import * as React from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

/** Tarjeta base de "Mi información" del viaje: acento vertical + icono. */
export function TripCardShell({
  icon: Icon,
  eyebrow,
  title,
  accent = "var(--event-viaje)",
  className,
  children,
}: {
  icon: LucideIcon;
  eyebrow?: string;
  title: string;
  accent?: string;
  className?: string;
  children?: React.ReactNode;
}) {
  return (
    <section className={cn("glass relative overflow-hidden p-4 pl-5", className)}>
      <span className="absolute inset-y-0 left-0 w-1" style={{ background: accent }} aria-hidden />
      <header className="flex items-start gap-3">
        <span
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
          style={{ background: "color-mix(in srgb, var(--event-viaje) 18%, transparent)" }}
        >
          <Icon className="h-4.5 w-4.5" style={{ color: accent }} />
        </span>
        <div className="min-w-0 flex-1">
          {eyebrow ? (
            <p className="font-display text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              {eyebrow}
            </p>
          ) : null}
          <h3 className="truncate font-display text-base font-semibold text-foreground">{title}</h3>
        </div>
      </header>
      {children ? <div className="mt-3 space-y-2">{children}</div> : null}
    </section>
  );
}

/** Línea de dato secundaria. */
export function TripLine({ children }: { children: React.ReactNode }) {
  if (!children) return null;
  return <p className="text-sm text-muted-foreground">{children}</p>;
}

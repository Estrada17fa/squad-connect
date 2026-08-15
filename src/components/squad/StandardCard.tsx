import * as React from "react";
import { cn } from "@/lib/utils";
import { StatusBadge, type StatusVariant } from "./StatusBadge";
import type { LucideIcon } from "lucide-react";

export interface StandardCardProps extends React.HTMLAttributes<HTMLDivElement> {
  title: string;
  subtitle?: string;
  icon?: LucideIcon;
  status?: { label: string; variant: StatusVariant };
  action?: React.ReactNode;
  interactive?: boolean;
  /** Color de la barra lateral (token CSS). Ver `src/lib/accents.ts`. */
  accent?: string;
  /** Significado del color, para accesibilidad. */
  accentLabel?: string;
}

export const StandardCard = React.forwardRef<HTMLDivElement, StandardCardProps>(
  (
    { title, subtitle, icon: Icon, status, action, interactive, accent, accentLabel, className, children, ...rest },
    ref,
  ) => {
    return (
      <div
        ref={ref}
        className={cn(
          "glass relative overflow-hidden p-4 flex flex-col gap-3 transition-all",
          accent && "pl-5",
          interactive && "cursor-pointer hover:border-white/15 hover:bg-white/[0.06] active:scale-[0.99]",
          className,
        )}
        {...rest}
      >
        {accent ? <AccentBar color={accent} label={accentLabel} /> : null}
        <div className="flex items-start gap-3">
          {Icon ? (
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/5 text-foreground">
              <Icon className="h-5 w-5" />
            </div>
          ) : null}
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              <h3 className="font-display text-base font-semibold leading-tight text-foreground truncate">
                {title}
              </h3>
              {status ? <StatusBadge variant={status.variant}>{status.label}</StatusBadge> : null}
            </div>
            {subtitle ? (
              <p className="mt-1 text-sm text-muted-foreground line-clamp-2">{subtitle}</p>
            ) : null}
          </div>
          {action ? <div className="shrink-0">{action}</div> : null}
        </div>
        {children ? <div className="text-sm text-muted-foreground">{children}</div> : null}
      </div>
    );
  },
);
StandardCard.displayName = "StandardCard";

/**
 * Barra de color sólida al costado izquierdo de una tarjeta.
 * Mismo grosor y posición en todos los módulos: es el código visual de la app.
 * El contenedor debe ser `relative overflow-hidden` y dejar padding a la izquierda.
 */
export function AccentBar({ color, label }: { color: string; label?: string }) {
  return (
    <span
      aria-hidden={label ? undefined : true}
      aria-label={label}
      title={label}
      className="pointer-events-none absolute inset-y-0 left-0 w-1"
      style={{ backgroundColor: color }}
    />
  );
}

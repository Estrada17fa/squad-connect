import * as React from "react";
import { cn } from "@/lib/utils";
import { StatusBadge, type StatusVariant } from "./StatusBadge";
import type { LucideIcon } from "lucide-react";
import { CardLead, CardMeta, type MetaItem } from "./CardParts";

export interface StandardCardProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "title"> {
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
  /** Dato clave grande del bloque marcador (ej. día / mes). */
  lead?: { top: React.ReactNode; bottom?: React.ReactNode };
  /** Metadatos con ícono bajo el título. */
  meta?: MetaItem[];
  /** Pie separado por línea fina. */
  footer?: React.ReactNode;
}

export const StandardCard = React.forwardRef<HTMLDivElement, StandardCardProps>(
  (
    { title, subtitle, icon: Icon, status, action, interactive, accent, accentLabel, lead, meta, footer, className, children, ...rest },
    ref,
  ) => {
    const showLead = Boolean(lead || Icon);
    return (
      <div
        ref={ref}
        className={cn(
          "glass relative overflow-hidden p-4 flex flex-col gap-3",
          accent && "pl-5",
          interactive && "card-scoreboard cursor-pointer active:scale-[0.99]",
          className,
        )}
        {...rest}
      >
        {accent ? <AccentBar color={accent} label={accentLabel} /> : null}
        <div className="flex items-start gap-3">
          {showLead ? <CardLead top={lead?.top} bottom={lead?.bottom} icon={Icon} accent={accent} /> : null}
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              <h3 className="font-display text-[15px] font-bold leading-snug text-foreground line-clamp-2">
                {title}
              </h3>
              {status ? <StatusBadge variant={status.variant}>{status.label}</StatusBadge> : null}
            </div>
            {subtitle ? (
              <p className="mt-0.5 text-xs font-medium uppercase tracking-wide text-muted-foreground line-clamp-1">
                {subtitle}
              </p>
            ) : null}
            {meta ? <CardMeta items={meta} className="mt-2" /> : null}
          </div>
          {action ? <div className="shrink-0">{action}</div> : null}
        </div>
        {children ? <div className="text-sm text-muted-foreground">{children}</div> : null}
        {footer ? <div className="border-t border-border/50 pt-3 text-sm">{footer}</div> : null}
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

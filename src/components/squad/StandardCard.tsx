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
  /** CSS color (e.g. `var(--module-calendario)`) used for icon tint and top accent line. */
  accent?: string;
  /** Prominent stat/number shown as protagonist. */
  stat?: React.ReactNode;
  statLabel?: React.ReactNode;
  size?: "sm" | "md" | "lg";
}

export const StandardCard = React.forwardRef<HTMLDivElement, StandardCardProps>(
  (
    {
      title,
      subtitle,
      icon: Icon,
      status,
      action,
      interactive,
      accent,
      stat,
      statLabel,
      size = "md",
      className,
      children,
      style,
      ...rest
    },
    ref,
  ) => {
    const pad = size === "lg" ? "p-5" : size === "sm" ? "p-3" : "p-4";
    const iconBoxSize = size === "lg" ? "h-12 w-12" : size === "sm" ? "h-9 w-9" : "h-10 w-10";
    const iconSize = size === "lg" ? "h-6 w-6" : size === "sm" ? "h-4 w-4" : "h-5 w-5";
    const titleSize = size === "lg" ? "text-lg" : "text-base";

    const accentStyle: React.CSSProperties = accent
      ? ({ ["--card-accent" as any]: accent } as React.CSSProperties)
      : {};

    return (
      <div
        ref={ref}
        style={{ ...accentStyle, ...style }}
        className={cn(
          "group glass card-hover relative flex flex-col gap-3 overflow-hidden",
          pad,
          accent &&
            "before:pointer-events-none before:absolute before:inset-x-4 before:top-0 before:h-px before:bg-[linear-gradient(90deg,transparent,var(--card-accent),transparent)] before:opacity-60",
          interactive &&
            "cursor-pointer hover:-translate-y-0.5 hover:shadow-[0_10px_30px_-12px_hsl(150_100%_50%/0.25)] hover:[background:linear-gradient(hsl(0_0%_100%/0.055),hsl(0_0%_100%/0.055))_padding-box,linear-gradient(180deg,hsl(150_100%_50%/0.45),hsl(150_100%_50%/0.06))_border-box] active:translate-y-0 active:scale-[0.995]",
          className,
        )}
        {...rest}
      >
        <div className="flex items-start gap-3">
          {Icon ? (
            <div
              className={cn(
                "flex shrink-0 items-center justify-center rounded-2xl",
                iconBoxSize,
              )}
              style={
                accent
                  ? {
                      background: `color-mix(in oklab, ${accent} 14%, transparent)`,
                      color: accent,
                      boxShadow: `inset 0 0 0 1px color-mix(in oklab, ${accent} 22%, transparent)`,
                    }
                  : { background: "hsl(0 0% 100% / 0.05)" }
              }
            >
              <Icon className={iconSize} />
            </div>
          ) : null}
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              <h3
                className={cn(
                  "font-display font-bold leading-tight text-foreground truncate",
                  titleSize,
                )}
              >
                {title}
              </h3>
              {status ? <StatusBadge variant={status.variant}>{status.label}</StatusBadge> : null}
            </div>
            {subtitle ? (
              <p className="mt-0.5 text-xs text-muted-foreground line-clamp-2">{subtitle}</p>
            ) : null}
          </div>
          {action ? <div className="shrink-0">{action}</div> : null}
        </div>

        {stat !== undefined ? (
          <div className="mt-1 flex items-baseline gap-2">
            <span
              className="font-display text-4xl font-bold leading-none tracking-tight text-foreground"
              style={accent ? { color: accent } : undefined}
            >
              {stat}
            </span>
            {statLabel ? (
              <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                {statLabel}
              </span>
            ) : null}
          </div>
        ) : null}

        {children ? <div className="text-sm text-muted-foreground">{children}</div> : null}
      </div>
    );
  },
);
StandardCard.displayName = "StandardCard";

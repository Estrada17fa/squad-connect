import * as React from "react";
import { cn } from "@/lib/utils";

export function PageHeader({
  title,
  subtitle,
  action,
  hideTitle,
  className,
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  /** Oculta el título. La navbar ya indica la sección; útil para dejar solo subtítulo/acciones. */
  hideTitle?: boolean;
  className?: string;
}) {
  const showText = !hideTitle || subtitle;
  return (
    <div className={cn("flex flex-wrap items-end justify-between gap-3 pb-2", className)}>
      {showText ? (
        <div className="min-w-0">
          {!hideTitle ? (
            <h1 className="font-display text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              {title}
            </h1>
          ) : null}
          {subtitle ? (
            <p className={cn("text-sm text-muted-foreground", !hideTitle && "mt-1")}>{subtitle}</p>
          ) : null}
        </div>
      ) : (
        <div className="min-w-0" />
      )}
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

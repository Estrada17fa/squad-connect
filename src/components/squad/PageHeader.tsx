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
  if (hideTitle) {
    if (!action) return null;
    return (
      <div className={cn("flex flex-wrap items-center justify-end gap-3 pb-2", className)}>
        <div className="shrink-0">{action}</div>
      </div>
    );
  }
  return (
    <div className={cn("flex flex-wrap items-end justify-between gap-3 pb-2", className)}>
      <div className="min-w-0">
        <h1 className="font-display text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
          {title}
        </h1>
        {subtitle ? <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p> : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

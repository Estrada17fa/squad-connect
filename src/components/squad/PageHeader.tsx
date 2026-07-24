import * as React from "react";
import { cn } from "@/lib/utils";

export function PageHeader({
  title,
  subtitle,
  action,
  className,
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-wrap items-center justify-between gap-3 pb-2", className)}>
      <div className="min-w-0">
        <h1 className="font-display text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
          {title}
        </h1>
        {subtitle ? (
          <span className="mt-2 inline-flex items-center rounded-full border border-white/[0.06] bg-white/[0.04] px-2.5 py-1 text-xs font-medium text-muted-foreground">
            {subtitle}
          </span>
        ) : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

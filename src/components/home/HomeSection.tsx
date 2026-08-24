import * as React from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Envoltura común de los bloques de Inicio: encabezado en mayúsculas con
 * icono y, opcionalmente, un enlace a la derecha. Solo presentación.
 */
export function HomeSection({
  icon: Icon,
  title,
  actionLabel,
  onAction,
  children,
  className,
}: {
  icon: LucideIcon;
  title: string;
  actionLabel?: string;
  onAction?: () => void;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("space-y-3", className)}>
      <div className="flex items-center gap-2">
        <Icon className="h-3.5 w-3.5 text-muted-foreground" />
        <h2 className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          {title}
        </h2>
        {actionLabel && onAction ? (
          <button
            type="button"
            onClick={onAction}
            className="ml-auto text-xs font-medium text-primary transition-colors hover:text-primary/80"
          >
            {actionLabel}
          </button>
        ) : null}
      </div>
      {children}
    </section>
  );
}

import * as React from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

interface Props {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  count?: number;
  canEdit?: boolean;
  addLabel?: string;
  onAdd?: () => void;
  emptyLabel?: string;
  children?: React.ReactNode;
  className?: string;
}

/** Bloque de la línea de tiempo del viaje (vuelos, transporte, hotel, comidas…). */
export function TimelineSection({
  icon: Icon,
  title,
  count,
  canEdit = false,
  addLabel = "Agregar",
  onAdd,
  emptyLabel = "Sin elementos.",
  children,
  className,
}: Props) {
  const isEmpty = React.Children.count(children) === 0;
  return (
    <section className={cn("space-y-2", className)}>
      <header className="flex items-center gap-2">
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/15">
          <Icon className="h-4 w-4 text-primary" />
        </span>
        <h3 className="font-display text-sm font-semibold text-foreground">{title}</h3>
        {typeof count === "number" && count > 0 ? (
          <span className="rounded-full bg-white/5 px-2 py-0.5 text-[11px] text-muted-foreground">{count}</span>
        ) : null}
      </header>

      {isEmpty ? <p className="pl-9 text-xs text-muted-foreground">{emptyLabel}</p> : <div className="space-y-2 pl-9">{children}</div>}

      {canEdit && onAdd ? (
        <div className="pl-9">
          <Button type="button" size="sm" variant="outline" className="w-full" onClick={onAdd}>
            <Plus className="mr-1.5 h-4 w-4" /> {addLabel}
          </Button>
        </div>
      ) : null}
    </section>
  );
}

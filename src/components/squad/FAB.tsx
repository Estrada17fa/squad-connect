import * as React from "react";
import { Plus, X } from "lucide-react";
import { cn } from "@/lib/utils";

export function FAB() {
  const [open, setOpen] = React.useState(false);

  return (
    <div className="pointer-events-none fixed bottom-24 right-4 z-40 flex flex-col items-end gap-3 sm:bottom-8">
      {open ? (
        <div className="pointer-events-auto glass animate-fab-menu w-56 p-2">
          <p className="px-3 py-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Acciones rápidas
          </p>
          <div className="flex flex-col text-sm text-muted-foreground">
            <span className="px-3 py-2">Próximamente</span>
          </div>
        </div>
      ) : null}
      <button
        type="button"
        aria-label={open ? "Cerrar acciones" : "Acciones rápidas"}
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "pointer-events-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground",
          "transition-transform duration-200 hover:scale-105 active:scale-95",
          open ? "glow-primary-strong" : "glow-primary-strong animate-fab-pulse",
        )}
      >
        {open ? <X className="h-6 w-6" /> : <Plus className="h-6 w-6" />}
      </button>
    </div>
  );
}

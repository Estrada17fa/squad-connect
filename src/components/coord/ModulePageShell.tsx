import * as React from "react";
import { Link } from "@tanstack/react-router";
import { ChevronLeft, Search, SlidersHorizontal, Plus, X } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { CoordArea, CoordModule } from "@/lib/coordAreas";
import { AreaSummary } from "./StatChip";
import { AreaSwitcher } from "./AreaSwitcher";

export function ModulePageShell({
  area, module, stats, tabs, action, children,
}: {
  area: CoordArea;
  module: CoordModule;
  stats: { value: string; label: string }[];
  tabs?: string[];
  action: string;
  children: React.ReactNode;
}) {
  const [tab, setTab] = React.useState(tabs?.[0] ?? "");
  const [open, setOpen] = React.useState<null | "search" | "filter">(null);
  const Icon = module.icon;

  return (
    <div className="coord-enter mx-auto max-w-4xl space-y-5 pb-24">
      <header className="sticky top-0 z-20 -mx-4 space-y-2 bg-background/90 px-4 pb-3 pt-2 backdrop-blur">
        <div className="flex items-center justify-between">
          <Link
            to="/coordinacion/$area"
            params={{ area: area.key }}
            className="coord-press -ml-2 inline-flex min-h-11 items-center gap-0.5 rounded-xl px-2 text-sm font-semibold"
          >
            <ChevronLeft className="h-5 w-5" /> {area.name}
          </Link>
          <div className="flex gap-1">
            {(["search", "filter"] as const).map((k) => {
              const I = k === "search" ? Search : SlidersHorizontal;
              return (
                <button
                  key={k}
                  aria-label={k === "search" ? "Buscar" : "Filtrar"}
                  onClick={() => setOpen(open === k ? null : k)}
                  className={cn("coord-press flex h-11 w-11 items-center justify-center rounded-xl", open === k ? "bg-muted" : "")}
                >
                  <I className="h-5 w-5" />
                </button>
              );
            })}
          </div>
        </div>
        <div className="text-xs text-muted-foreground">Coordinación · {area.name}</div>
        <h1 className="flex items-center gap-3 text-2xl font-bold">
          <span className={cn("flex h-10 w-10 items-center justify-center rounded-xl", area.bgSoft)}>
            <Icon className={cn("h-5 w-5", area.text)} />
          </span>
          {module.name}
        </h1>
        {open && (
          <div className="coord-card coord-enter flex items-center gap-2 px-3">
            {open === "search" ? <Search className="h-4 w-4 text-muted-foreground" /> : <SlidersHorizontal className="h-4 w-4 text-muted-foreground" />}
            <input
              autoFocus
              placeholder={open === "search" ? "Buscar…" : "Filtros (próximamente)"}
              className="min-h-11 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            />
            <button aria-label="Cerrar" onClick={() => setOpen(null)} className="p-2 text-muted-foreground">
              <X className="h-4 w-4" />
            </button>
          </div>
        )}
      </header>

      <AreaSummary stats={stats} area={area} />

      {tabs && tabs.length > 1 && (
        <AreaSwitcher
          items={tabs.map((t) => ({ key: t, label: t }))}
          active={tab}
          onChange={setTab}
          indicatorClass={area.bg}
        />
      )}

      {children}

      {module.legacy && (
        <div className="text-center">
          <Link
            to="/m/$module"
            params={{ module: module.legacy }}
            className="text-xs text-muted-foreground underline-offset-4 hover:underline"
          >
            Ver versión actual
          </Link>
        </div>
      )}

      <button
        aria-label={action}
        onClick={() => toast("Próximamente")}
        className="coord-press fixed bottom-24 right-4 z-30 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground md:hidden"
      >
        <Plus className="h-6 w-6" />
      </button>
    </div>
  );
}

import * as React from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { ChevronDown } from "lucide-react";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { useQueryClient } from "@tanstack/react-query";
import { useApp } from "./app-context";
import { MODULE_MAP, type ModuleKey } from "@/lib/modules";
import { prefetchModule } from "@/lib/prefetch";
import {
  coordLabelFor,
  isCoordModuleVisible,
  resolveCoordAreas,
  type CoordPath,
  type VisibleCoordArea,
} from "@/lib/coordAreas";
import { cn } from "@/lib/utils";

/** true mientras se renderiza dentro del contenedor de Coordinación. */
export const InCoordContext = React.createContext(false);

/** Áreas de Coordinación visibles para el usuario (según get_my_access). */
export function useCoordAreas(): VisibleCoordArea[] {
  const { getModuleAccess, isSuperAdmin } = useApp();
  return React.useMemo(
    () => resolveCoordAreas((k) => isCoordModuleVisible(k, getModuleAccess(k), isSuperAdmin)),
    [getModuleAccess, isSuperAdmin],
  );
}

/** Ruta de Coordinación del módulo si el usuario lo gestiona ahí; si no, null. */
export function useCoordModuleVisible(key: ModuleKey): CoordPath | null {
  const areas = useCoordAreas();
  for (const a of areas) {
    const m = a.modules.find((x) => x.key === key);
    if (m) return m.to;
  }
  return null;
}

/** Hueco a la derecha del título de Coordinación donde una pantalla puede poner acciones (p. ej. lupa en móvil). */
export const CoordActionSlotContext = React.createContext<HTMLElement | null>(null);

/** Encabezado fijo: título-selector de área + pestañas de módulos del área activa. */
export function CoordHeader({ areas, active, activeModule, onSlot }: {
  areas: VisibleCoordArea[];
  active: VisibleCoordArea;
  activeModule: ModuleKey | null;
  onSlot?: (el: HTMLElement | null) => void;
}) {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const { profile } = useApp();
  const [open, setOpen] = React.useState(false);
  const ctx = React.useMemo(() => ({ clubId: profile?.club_id ?? null, teamId: null }), [profile?.club_id]);
  const multi = areas.length > 1;

  const title = (
    <h1 className="truncate font-display text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
      <span className="hidden md:inline">Coordinación · </span>
      {active.area.label}
    </h1>
  );

  return (
    <div className="sticky top-14 z-20 -mx-4 -mt-4 max-w-[calc(100%+2rem)] overflow-hidden border-b border-border/60 bg-background/85 px-4 pt-2 backdrop-blur-xl sm:-mx-6 sm:mt-0 sm:max-w-[calc(100%+3rem)] sm:px-6 md:pt-3">
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2">
        <div className="min-w-0">
          {multi ? (
            <button
              type="button"
              aria-label="Cambiar área"
              onClick={() => setOpen(true)}
              className="flex min-w-0 max-w-full items-center gap-1.5 text-left"
            >
              {title}
              <ChevronDown className="h-5 w-5 shrink-0 text-muted-foreground" />
            </button>
          ) : (
            title
          )}
          <p className="mt-1 hidden text-sm text-muted-foreground md:block">{active.area.subtitle}</p>
        </div>
        <div ref={onSlot} className="flex shrink-0 items-center gap-2" />
      </div>

      {active.modules.length > 1 ? (
        <div
          role="tablist"
          aria-label="Módulos del área"
          className="-mx-1 flex w-full min-w-0 max-w-full gap-1 overflow-x-auto overflow-y-hidden touch-pan-x overscroll-x-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {active.modules.map((m) => {
            const def = MODULE_MAP[m.key];
            const isActive = m.key === activeModule;
            return (
              <Link
                key={m.key}
                to={m.to}
                role="tab"
                aria-current={isActive ? "page" : undefined}
                onMouseEnter={() => prefetchModule(qc, m.key, ctx)}
                onFocus={() => prefetchModule(qc, m.key, ctx)}
                onTouchStart={() => prefetchModule(qc, m.key, ctx)}
                className={cn(
                  "relative flex shrink-0 items-center gap-2 whitespace-nowrap px-3 py-2.5 text-sm font-medium transition-colors",
                  isActive ? "text-foreground" : "text-muted-foreground hover:text-foreground",
                )}
              >
                <def.icon className="h-4 w-4" />
                <span>{coordLabelFor(m) ?? def.label}</span>
                {isActive ? <span className="absolute inset-x-2 -bottom-px h-[2px] rounded-full bg-primary" /> : null}
              </Link>
            );
          })}
        </div>
      ) : (
        <div className="h-2" />
      )}

      {multi ? (
        <Drawer open={open} onOpenChange={setOpen}>
          <DrawerContent>
            <DrawerHeader>
              <DrawerTitle>Áreas de Coordinación</DrawerTitle>
            </DrawerHeader>
            <div className="space-y-1 px-4 pb-6">
              {areas.map((a) => {
                const isActive = a.area.key === active.area.key;
                const Icon = a.area.icon;
                return (
                  <button
                    key={a.area.key}
                    type="button"
                    aria-label={a.area.label}
                    aria-current={isActive ? "page" : undefined}
                    onClick={() => {
                      setOpen(false);
                      void navigate({ to: a.modules[0].to });
                    }}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-xl border px-3 py-3 text-left transition-colors",
                      isActive ? "border-primary bg-primary/10" : "border-transparent hover:bg-card/60",
                    )}
                  >
                    <span className={cn(
                      "grid h-10 w-10 shrink-0 place-items-center rounded-full",
                      isActive ? "bg-primary text-primary-foreground" : "bg-card text-muted-foreground",
                    )}>
                      <Icon className="h-5 w-5" />
                    </span>
                    <span className="min-w-0">
                      <span className={cn("block font-medium", isActive ? "text-primary" : "text-foreground")}>{a.area.label}</span>
                      <span className="block truncate text-xs text-muted-foreground">{a.area.subtitle}</span>
                    </span>
                  </button>
                );
              })}
            </div>
          </DrawerContent>
        </Drawer>
      ) : null}
    </div>
  );
}

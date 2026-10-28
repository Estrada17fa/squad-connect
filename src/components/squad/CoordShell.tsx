import * as React from "react";
import { Link } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useApp } from "./app-context";
import { PageHeader } from "./PageHeader";
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

/** Encabezado, selector de áreas y pestañas de módulos del área activa. */
export function CoordHeader({ areas, active, activeModule }: {
  areas: VisibleCoordArea[];
  active: VisibleCoordArea;
  activeModule: ModuleKey | null;
}) {
  const qc = useQueryClient();
  const { profile } = useApp();
  const ctx = React.useMemo(() => ({ clubId: profile?.club_id ?? null, teamId: null }), [profile?.club_id]);

  return (
    <div className="space-y-3">
      <PageHeader title={`Coordinación · ${active.area.label}`} subtitle={active.area.subtitle} />

      {areas.length > 1 ? (
        <div
          role="tablist"
          aria-label="Áreas de Coordinación"
          className="-mx-4 flex min-w-0 gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:mx-0 sm:px-0"
        >
          {areas.map((a) => {
            const isActive = a.area.key === active.area.key;
            const Icon = a.area.icon;
            return (
              <Link
                key={a.area.key}
                to={a.modules[0].to}
                role="tab"
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "flex shrink-0 items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition-colors",
                  isActive
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-card/60 text-muted-foreground hover:text-foreground",
                )}
              >
                <Icon className="h-4 w-4" />
                <span>{a.area.label}</span>
              </Link>
            );
          })}
        </div>
      ) : null}

      {active.modules.length > 1 ? (
        <div className="sticky top-14 z-20 -mx-4 max-w-[calc(100%+2rem)] overflow-hidden border-b border-border/60 bg-background/85 px-4 backdrop-blur-xl sm:-mx-6 sm:max-w-[calc(100%+3rem)] sm:px-6">
          <div
            role="tablist"
            aria-label="Módulos del área"
            className="flex w-full min-w-0 max-w-full gap-1 overflow-x-auto overflow-y-hidden touch-pan-x overscroll-x-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
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
                    "relative flex shrink-0 items-center gap-2 whitespace-nowrap px-3 py-3 text-sm font-medium transition-colors",
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
        </div>
      ) : null}
    </div>
  );
}

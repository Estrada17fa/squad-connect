import * as React from "react";
import { Link } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { Building2, Plane, Settings2, type LucideIcon } from "lucide-react";
import { useApp } from "./AppLayout";
import { MODULE_MAP, type ModuleKey } from "@/lib/modules";
import { findHubForModule, type PageKey } from "@/lib/rolePages";
import { prefetchModule } from "@/lib/prefetch";
import { cn } from "@/lib/utils";

interface ExtraTab {
  key: string;
  label: string;
  icon: LucideIcon;
  to: string;
  active?: boolean;
}

interface ModuleTabsProps {
  /** Módulo activo — se usa para resolver el hub y las pestañas hermanas. */
  activeKey?: ModuleKey;
  /**
   * Fuerza el hub cuando no hay `activeKey` (p. ej. en rutas que no son de módulo
   * pero pertenecen a un hub, como `/admin/clubs`).
   */
  hubKey?: PageKey;
  /** Clave de una pestaña extra activa (para rutas fuera de `/m/...`). */
  extraActiveKey?: string;
}

/**
 * Barra de pestañas horizontal sticky para módulos dentro de un hub
 * (Mi Club, Coordinación, Admin). Cada pestaña navega a la ruta real
 * del módulo, preservando URL, back button y deep-linking.
 */
export function ModuleTabs({ activeKey, hubKey, extraActiveKey }: ModuleTabsProps) {
  const { visiblePages, isSuperAdmin, profile, accessibleModules, permissions } = useApp();
  const qc = useQueryClient();
  const prefetchCtx = React.useMemo(
    () => ({ clubId: profile?.club_id ?? null, teamId: null }),
    [profile?.club_id],
  );
  const hub = activeKey
    ? findHubForModule(visiblePages, activeKey)
    : hubKey
      ? visiblePages.find((p) => p.page.key === hubKey) ?? null
      : null;

  const modules = hub?.modules ?? [];

  const extras: ExtraTab[] = React.useMemo(() => {
    const out: ExtraTab[] = [];
    const isEditorGlobal = isSuperAdmin || permissions["usuarios"] === "editor_global";
    if (hub?.page.key === "admin" && isEditorGlobal) {
      out.push({
        key: "admin-config",
        label: "Configuración del club",
        icon: Settings2,
        to: "/admin/configuracion",
        active: extraActiveKey === "admin-config",
      });
    }
    if (hub?.page.key === "admin" && (isSuperAdmin || accessibleModules.includes("torneo"))) {
      out.push({
        key: "admin-torneo",
        label: "Torneos",
        icon: Trophy,
        to: "/admin/torneo",
        active: extraActiveKey === "admin-torneo",
      });
    }
    if (hub?.page.key === "admin" && isSuperAdmin) {
      out.push({
        key: "admin-clubs",
        label: "Administrar clubes",
        icon: Building2,
        to: "/admin/clubs",
        active: extraActiveKey === "admin-clubs",
      });
    }


    // Consulta de viajes desde Agenda (solo lectura).
    if (hub?.page.key === "agenda" && (isSuperAdmin || accessibleModules.includes("viajes"))) {
      out.push({
        key: "agenda-viajes",
        label: "Viajes",
        icon: Plane,
        to: "/agenda-viajes",
        active: extraActiveKey === "agenda-viajes",
      });
    }
    return out;
  }, [hub?.page.key, isSuperAdmin, accessibleModules, extraActiveKey, permissions]);


  const total = modules.length + extras.length;
  if (total <= 1) return null;

  return (
    <div className="sticky top-14 z-20 -mx-4 border-b border-border/60 bg-background/85 px-4 backdrop-blur-xl sm:-mx-6 sm:px-6">
      <div
        role="tablist"
        aria-label="Módulos del hub"
        className="flex gap-1 overflow-x-auto overflow-y-hidden touch-pan-x overscroll-x-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {modules.map((key: ModuleKey) => {
          const m = MODULE_MAP[key];
          const active = key === activeKey;
          return (
            <Link
              key={key}
              to="/m/$module"
              params={{ module: key }}
              role="tab"
              aria-current={active ? "page" : undefined}
              onMouseEnter={() => prefetchModule(qc, key, prefetchCtx)}
              onFocus={() => prefetchModule(qc, key, prefetchCtx)}
              onTouchStart={() => prefetchModule(qc, key, prefetchCtx)}
              className={cn(
                "relative flex shrink-0 items-center gap-2 whitespace-nowrap px-3 py-3 text-sm font-medium transition-colors",
                active ? "text-foreground" : "text-muted-foreground hover:text-foreground",
              )}
            >
              <m.icon className="h-4 w-4" />
              <span>{m.label}</span>
              {active ? (
                <span className="absolute inset-x-2 -bottom-px h-[2px] rounded-full bg-primary" />
              ) : null}
            </Link>
          );
        })}
        {extras.map((t) => {
          const Icon = t.icon;
          const active = !!t.active;
          return (
            <Link
              key={t.key}
              to={t.to as unknown as "/"}
              role="tab"
              aria-current={active ? "page" : undefined}
              className={cn(
                "relative flex shrink-0 items-center gap-2 whitespace-nowrap px-3 py-3 text-sm font-medium transition-colors",
                active ? "text-foreground" : "text-muted-foreground hover:text-foreground",
              )}
            >
              <Icon className="h-4 w-4" />
              <span>{t.label}</span>
              {active ? (
                <span className="absolute inset-x-2 -bottom-px h-[2px] rounded-full bg-primary" />
              ) : null}
            </Link>
          );
        })}
      </div>
    </div>
  );
}

import * as React from "react";
import { Link } from "@tanstack/react-router";
import type { LucideIcon } from "lucide-react";
import { useApp } from "./AppLayout";
import { MODULE_MAP, type ModuleKey } from "@/lib/modules";
import { findHubForModule } from "@/lib/rolePages";
import { cn } from "@/lib/utils";

export interface ExtraTab {
  key: string;
  label: string;
  icon: LucideIcon;
  to: string;
  active?: boolean;
}

interface ModuleTabsProps {
  /** Módulo activo — se usa para resolver el hub y las pestañas hermanas. */
  activeKey?: ModuleKey;
  /** Pestañas adicionales (p. ej. "Administrar clubes" para super admin). */
  extraTabs?: ExtraTab[];
  /** Fuerza mostrar la barra aunque solo haya una pestaña. */
  alwaysShow?: boolean;
}

/**
 * Barra de pestañas horizontal sticky para módulos dentro de un hub
 * (Mi Club, Coordinación, Admin). Cada pestaña navega a la ruta real
 * del módulo (`/m/$module`), preservando URL, back button y deep-linking.
 */
export function ModuleTabs({ activeKey, extraTabs = [], alwaysShow = false }: ModuleTabsProps) {
  const { visiblePages } = useApp();
  const hub = activeKey ? findHubForModule(visiblePages, activeKey) : null;
  const modules = hub?.modules ?? [];
  const total = modules.length + extraTabs.length;
  if (!alwaysShow && total <= 1) return null;

  return (
    <div className="sticky top-14 z-20 -mx-4 border-b border-border/60 bg-background/85 px-4 backdrop-blur-xl sm:-mx-6 sm:px-6">
      <div
        role="tablist"
        aria-label="Módulos del hub"
        className="squad-tabs-scroll flex gap-1 overflow-x-auto"
      >
        {modules.map((key) => {
          const m = MODULE_MAP[key];
          const active = key === activeKey;
          return (
            <Link
              key={key}
              to="/m/$module"
              params={{ module: key }}
              role="tab"
              aria-current={active ? "page" : undefined}
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
        {extraTabs.map((t) => {
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

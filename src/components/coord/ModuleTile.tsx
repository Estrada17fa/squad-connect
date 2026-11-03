import { Link } from "@tanstack/react-router";
import { Lock } from "lucide-react";
import { cn } from "@/lib/utils";
import type { CoordArea, CoordModule } from "@/lib/coordAreas";

/** Módulo como ícono de app. */
export function ModuleTile({ area, module, badge }: { area: CoordArea; module: CoordModule; badge?: number }) {
  const Icon = module.icon;
  const body = (
    <>
      <span className="relative flex h-[52px] w-[52px] items-center justify-center rounded-2xl bg-card">
        <Icon className={cn("h-6 w-6", area.text)} />
        {module.comingSoon ? (
          <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-muted">
            <Lock className="h-3 w-3 text-muted-foreground" />
          </span>
        ) : badge ? (
          <span className={cn("absolute -right-1.5 -top-1.5 flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-[11px] font-bold text-background", area.bg)}>
            {badge}
          </span>
        ) : null}
      </span>
      <span className="mt-1.5 block text-center text-xs leading-tight">{module.short ?? module.name}</span>
    </>
  );
  const cls = "flex flex-col items-center py-1";
  if (module.comingSoon) return <div className={cn(cls, "opacity-45")} aria-label={`${module.name} (próximamente)`}>{body}</div>;
  return (
    <Link to="/coordinacion/$area/$module" params={{ area: area.key, module: module.key }} className={cn(cls, "coord-press")}>
      {body}
    </Link>
  );
}

import { Link } from "@tanstack/react-router";
import { cn } from "@/lib/utils";
import type { CoordArea, CoordModule } from "@/lib/coordAreas";

export function ModuleTile({
  area, module, hint, badge,
}: { area: CoordArea; module: CoordModule; hint?: string; badge?: number }) {
  const Icon = module.icon;
  const body = (
    <>
      {badge ? (
        <span className="absolute right-3 top-3 flex h-6 min-w-6 items-center justify-center rounded-full bg-primary px-1.5 text-xs font-bold text-primary-foreground">
          {badge}
        </span>
      ) : null}
      <span className={cn("flex h-12 w-12 items-center justify-center rounded-2xl", area.bgSoft)}>
        <Icon className={cn("h-6 w-6", area.text)} />
      </span>
      <span className="mt-4 block truncate text-[15px] font-semibold">{module.name}</span>
      <span className="mt-0.5 block truncate text-xs text-muted-foreground">
        {module.comingSoon ? "Próximamente" : hint}
      </span>
    </>
  );
  const cls = "coord-card relative block p-4 text-left";
  if (module.comingSoon) return <div className={cn(cls, "opacity-45")}>{body}</div>;
  return (
    <Link
      to="/coordinacion/$area/$module"
      params={{ area: area.key, module: module.key }}
      className={cn(cls, "coord-press")}
    >
      {body}
    </Link>
  );
}

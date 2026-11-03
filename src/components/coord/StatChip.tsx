import { cn } from "@/lib/utils";
import type { CoordArea } from "@/lib/coordAreas";

/** Datos del módulo como números grandes en línea, sin cajas. */
export function AreaSummary({ stats, area }: { stats: { value: string; label: string }[]; area: CoordArea }) {
  if (!stats.length) return null;
  return (
    <div className="flex flex-wrap gap-x-8 gap-y-3">
      {stats.map((s) => (
        <div key={s.label}>
          <div className={cn("text-[28px] font-bold leading-none tracking-tight", area.text)}>{s.value}</div>
          <div className="mt-1 text-xs text-muted-foreground">{s.label}</div>
        </div>
      ))}
    </div>
  );
}

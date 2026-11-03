import { cn } from "@/lib/utils";
import type { CoordArea } from "@/lib/coordAreas";

export function StatChip({ value, label, area }: { value: string; label: string; area: CoordArea }) {
  return (
    <div className="coord-card min-w-0 flex-1 px-4 py-3">
      <div className={cn("truncate text-2xl font-bold leading-none tracking-tight sm:text-[28px]", area.text)}>
        {value}
      </div>
      <div className="mt-1.5 truncate text-xs text-muted-foreground">{label}</div>
    </div>
  );
}

export function AreaSummary({ stats, area }: { stats: { value: string; label: string }[]; area: CoordArea }) {
  if (!stats.length) return null;
  return (
    <div className="flex gap-2.5">
      {stats.map((s) => <StatChip key={s.label} {...s} area={area} />)}
    </div>
  );
}

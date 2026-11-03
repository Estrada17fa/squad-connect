import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export interface SegmentItem { key: string; label: string; icon?: LucideIcon }

/** Control segmentado con indicador deslizante. Sirve para áreas y pestañas internas. */
export function AreaSwitcher({
  items, active, onChange, indicatorClass = "bg-primary", activeTextClass = "text-foreground",
}: {
  items: SegmentItem[];
  active: string;
  onChange: (key: string) => void;
  indicatorClass?: string;
  activeTextClass?: string;
}) {
  const idx = Math.max(0, items.findIndex((i) => i.key === active));
  return (
    <div className="coord-card relative flex p-1" role="tablist">
      {items.map((it) => {
        const on = it.key === active;
        const Icon = it.icon;
        return (
          <button
            key={it.key}
            role="tab"
            aria-selected={on}
            onClick={() => onChange(it.key)}
            className={cn(
              "relative z-10 flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl text-sm font-semibold transition-colors",
              on ? activeTextClass : "text-muted-foreground",
            )}
          >
            {Icon && <Icon className="h-4 w-4" />}
            {it.label}
          </button>
        );
      })}
      <span
        aria-hidden
        className="absolute inset-y-1 left-1 rounded-xl bg-muted transition-transform duration-300 ease-out"
        style={{ width: `calc((100% - 0.5rem) / ${items.length})`, transform: `translateX(${idx * 100}%)` }}
      >
        <span className={cn("absolute bottom-1 left-1/2 h-1 w-8 -translate-x-1/2 rounded-full", indicatorClass)} />
      </span>
    </div>
  );
}

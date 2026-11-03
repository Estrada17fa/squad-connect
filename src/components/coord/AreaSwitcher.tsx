import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export interface SegmentItem { key: string; label: string; icon?: LucideIcon }

/** Pestañas de texto sin marco con línea inferior deslizante. */
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
    <div className="relative flex border-b border-border/50" role="tablist">
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
              "flex h-10 flex-1 items-center justify-center gap-1.5 rounded-md text-sm font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              on ? activeTextClass : "text-muted-foreground hover:text-foreground",
            )}
          >
            {Icon && <Icon className="h-4 w-4" />}
            {it.label}
          </button>
        );
      })}
      <span
        aria-hidden
        className="absolute -bottom-px left-0 flex justify-center transition-transform duration-300 ease-out"
        style={{ width: `${100 / items.length}%`, transform: `translateX(${idx * 100}%)` }}
      >
        <span className={cn("h-0.5 w-3/5 rounded-full", indicatorClass)} />
      </span>
    </div>
  );
}

import type { LucideIcon } from "lucide-react";
import * as React from "react";
import { cn } from "@/lib/utils";

export interface SegmentItem { key: string; label: string; icon?: LucideIcon; dot?: boolean }

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
  const [kb, setKb] = React.useState(false);
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
            onFocus={(e) => setKb(e.currentTarget.matches(":focus-visible"))}
            onBlur={() => setKb(false)}
            className={cn(
              "flex h-10 flex-1 items-center justify-center gap-1.5 text-sm font-semibold transition-colors outline-none ring-0 border-0 bg-transparent [-webkit-tap-highlight-color:transparent] focus:outline-none focus:ring-0",
              on ? activeTextClass : "text-muted-foreground hover:text-foreground",
            )}
          >
            {Icon && <Icon className="h-4 w-4" />}
            {it.label}
            {it.dot && <span aria-label="Urgente" className="h-1.5 w-1.5 rounded-full bg-urgency-red" />}
          </button>
        );
      })}
      <span
        aria-hidden
        className="absolute -bottom-px left-0 flex justify-center transition-transform duration-300 ease-out"
        style={{ width: `${100 / items.length}%`, transform: `translateX(${idx * 100}%)` }}
      >
        <span className={cn("w-3/5 rounded-full transition-all", kb ? "h-1" : "h-0.5", indicatorClass)} />
      </span>
    </div>
  );
}

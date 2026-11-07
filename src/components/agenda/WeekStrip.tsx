import * as React from "react";
import { dayDots, sameDay, weekDays, weekStart } from "@/lib/agenda";
import { cn } from "@/lib/utils";

const dowFmt = new Intl.DateTimeFormat("es-MX", { weekday: "short" });
const monthFmt = new Intl.DateTimeFormat("es-MX", { month: "long", year: "numeric" });

/** Tira de 7 días con puntos por evento; deslizar cambia de semana. */
export function WeekStrip({
  events, selected, onSelect,
}: {
  events: { event_type: string; trip_id?: string | null; starts_at: string }[];
  selected: Date | null;
  onSelect: (d: Date) => void;
}) {
  const today = new Date();
  const [start, setStart] = React.useState(() => weekStart(today));
  const touch = React.useRef<number | null>(null);
  const days = weekDays(start);
  const isCurrent = sameDay(start, weekStart(today));
  const shift = (n: number) => setStart((s) => new Date(s.getFullYear(), s.getMonth(), s.getDate() + 7 * n));
  const month = monthFmt.format(days[3]);

  return (
    <div
      className="select-none"
      onTouchStart={(e) => (touch.current = e.touches[0].clientX)}
      onTouchEnd={(e) => {
        if (touch.current == null) return;
        const dx = e.changedTouches[0].clientX - touch.current;
        touch.current = null;
        if (Math.abs(dx) > 40) shift(dx < 0 ? 1 : -1);
      }}
    >
      <div className="mb-1.5 flex items-center justify-between px-1 text-xs">
        <span className="font-semibold capitalize text-muted-foreground">{month}</span>
        {!isCurrent ? (
          <button type="button" className="font-semibold text-primary" onClick={() => { setStart(weekStart(today)); onSelect(today); }}>
            Hoy
          </button>
        ) : null}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {days.map((d) => {
          const on = (selected && sameDay(d, selected)) || sameDay(d, today);
          const dots = dayDots(events, d);
          return (
            <button
              key={d.toISOString()}
              type="button"
              onClick={() => onSelect(d)}
              aria-label={d.toDateString()}
              className={cn("flex flex-col items-center rounded-2xl py-2", on ? "bg-foreground/10" : "active:bg-muted")}
            >
              <span className="text-[11px] font-medium capitalize text-muted-foreground">{dowFmt.format(d).replace(".", "").slice(0, 3)}</span>
              <span className={cn("mt-0.5 text-lg font-bold leading-none", sameDay(d, today) && "text-primary")}>{d.getDate()}</span>
              <span className="mt-1.5 flex h-1.5 gap-0.5">
                {dots.map((k, i) => (
                  <span key={i} className={cn("h-1.5 w-1.5 rounded-full", k === "partido" ? "bg-primary" : "bg-muted-foreground/60")} />
                ))}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

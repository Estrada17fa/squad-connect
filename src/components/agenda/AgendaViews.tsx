import * as React from "react";
import { CalendarDays, CalendarRange, ChevronLeft, ChevronRight, List } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { agendaDayKey, dayDots, sameDay, weekDays, weekLabel, type AgendaView } from "@/lib/agenda";
import { cn } from "@/lib/utils";

const dowFmt = new Intl.DateTimeFormat("es-MX", { weekday: "short" });
const longDayFmt = new Intl.DateTimeFormat("es-MX", { weekday: "long", day: "numeric", month: "long" });
const dayNumFmt = new Intl.DateTimeFormat("es-MX", { weekday: "long", day: "numeric" });
const monthFmt = new Intl.DateTimeFormat("es-MX", { month: "long", year: "numeric" });
const shortFmt = new Intl.DateTimeFormat("es-MX", { weekday: "short", day: "numeric", month: "short" });
export const cap = (x: string) => x.charAt(0).toUpperCase() + x.slice(1);
export const longDay = (d: Date) => cap(longDayFmt.format(d).replace(",", ""));
export const monthTitle = (d: Date) => cap(monthFmt.format(d).replace(" de ", " "));
export const dayTitle = (d: Date) => cap(dayNumFmt.format(d).replace(",", ""));
export const shortDay = (d: Date) => cap(shortFmt.format(d).replace(/\./g, ""));

type DotItem = { event_type: string; trip_id?: string | null; starts_at: string };

const VIEWS: { key: AgendaView; label: string; icon: typeof List }[] = [
  { key: "semana", label: "Semana", icon: CalendarRange },
  { key: "mes", label: "Mes", icon: CalendarDays },
  { key: "lista", label: "Lista", icon: List },
];

export function ViewSwitch({ value, onChange }: { value: AgendaView; onChange: (v: AgendaView) => void }) {
  return (
    <div role="tablist" aria-label="Vista" className="grid grid-cols-3 gap-1 rounded-xl bg-muted p-1">
      {VIEWS.map((v) => (
        <button key={v.key} type="button" role="tab" aria-selected={value === v.key} onClick={() => onChange(v.key)}
          className={cn("flex h-8 items-center justify-center gap-1.5 rounded-lg text-xs font-semibold transition-colors", value === v.key ? "bg-background text-foreground shadow-sm" : "text-muted-foreground")}>
          <v.icon className="h-3.5 w-3.5" />{v.label}
        </button>
      ))}
    </div>
  );
}

/** Deslizar a los lados: -1 / +1. */
function useSwipe(onShift: (n: number) => void) {
  const x = React.useRef<number | null>(null);
  return {
    onTouchStart: (e: React.TouchEvent) => (x.current = e.touches[0].clientX),
    onTouchEnd: (e: React.TouchEvent) => {
      if (x.current == null) return;
      const dx = e.changedTouches[0].clientX - x.current;
      x.current = null;
      if (Math.abs(dx) > 40) onShift(dx < 0 ? 1 : -1);
    },
  };
}

export function PeriodNav({ label, onShift, showToday, onToday, prevLabel, nextLabel }: { label: string; onShift: (n: number) => void; showToday: boolean; onToday: () => void; prevLabel: string; nextLabel: string }) {
  return (
    <div className="flex items-center justify-between">
      <button type="button" aria-label={prevLabel} onClick={() => onShift(-1)} className="flex h-10 w-10 items-center justify-center rounded-full hover:bg-muted"><ChevronLeft className="h-5 w-5" /></button>
      <div className="flex items-center gap-2">
        <span className="text-sm font-semibold">{label}</span>
        {showToday ? <button type="button" onClick={onToday} className="rounded-full bg-primary/15 px-2.5 py-0.5 text-xs font-semibold text-primary">Hoy</button> : null}
      </div>
      <button type="button" aria-label={nextLabel} onClick={() => onShift(1)} className="flex h-10 w-10 items-center justify-center rounded-full hover:bg-muted"><ChevronRight className="h-5 w-5" /></button>
    </div>
  );
}

function Dots({ kinds }: { kinds: ("partido" | "otro")[] }) {
  return (
    <span className="mt-1 flex h-1.5 gap-0.5">
      {kinds.map((k, i) => <span key={i} className={cn("h-1.5 w-1.5 rounded-full", k === "partido" ? "bg-primary" : "bg-muted-foreground/60")} />)}
    </span>
  );
}

export function WeekStrip({ start, items, selected, onSelect, onShift, onToday }: {
  start: Date; items: DotItem[]; selected: Date | null; onSelect: (d: Date) => void; onShift: (n: number) => void; onToday: () => void;
}) {
  const today = new Date();
  const swipe = useSwipe(onShift);
  return (
    <div className="select-none space-y-1" {...swipe}>
      <PeriodNav label={weekLabel(start)} onShift={onShift} showToday={!weekDays(start).some((d) => sameDay(d, today))} onToday={onToday} prevLabel="Semana anterior" nextLabel="Semana siguiente" />
      <div className="grid grid-cols-7 gap-1">
        {weekDays(start).map((d) => {
          const isSel = !!selected && sameDay(d, selected);
          return (
            <button key={d.toISOString()} type="button" onClick={() => onSelect(d)} aria-pressed={isSel} aria-label={longDay(d)} data-day={agendaDayKey(d)}
              className={cn("flex flex-col items-center rounded-2xl py-2", isSel ? "bg-foreground/10" : "active:bg-muted")}>
              <span className="text-[11px] font-medium capitalize text-muted-foreground">{dowFmt.format(d).replace(".", "").slice(0, 3)}</span>
              <span className={cn("mt-0.5 text-lg font-bold leading-none", sameDay(d, today) && "text-primary")}>{d.getDate()}</span>
              <Dots kinds={dayDots(items, d)} />
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function MonthGrid({ month, days, items, selected, onSelect, onShift, onToday }: {
  month: Date; days: Date[]; items: DotItem[]; selected: Date; onSelect: (d: Date) => void; onShift: (n: number) => void; onToday: () => void;
}) {
  const today = new Date();
  const swipe = useSwipe(onShift);
  const isCurrent = month.getFullYear() === today.getFullYear() && month.getMonth() === today.getMonth();
  return (
    <div className="select-none space-y-1" {...swipe}>
      <PeriodNav label={monthTitle(month)} onShift={onShift} showToday={!isCurrent} onToday={onToday} prevLabel="Mes anterior" nextLabel="Mes siguiente" />
      <div className="grid grid-cols-7 text-center text-[11px] font-medium text-muted-foreground">
        {["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"].map((d) => <span key={d}>{d}</span>)}
      </div>
      <div className="grid grid-cols-7 gap-y-0.5" style={{ gridAutoRows: `min(2.75rem, calc((45vh - 3.5rem) / ${days.length / 7}))` }}>
        {days.map((d) => {
          const out = d.getMonth() !== month.getMonth();
          const isSel = sameDay(d, selected);
          return (
            <button key={d.toISOString()} type="button" onClick={() => onSelect(d)} aria-pressed={isSel} aria-label={longDay(d)} data-day={agendaDayKey(d)}
              className={cn("flex min-h-0 flex-col items-center justify-center rounded-xl", isSel ? "bg-foreground/10" : "active:bg-muted", out && "opacity-35")}>
              <span className={cn("text-sm font-semibold leading-none", sameDay(d, today) && "text-primary")}>{d.getDate()}</span>
              <Dots kinds={dayDots(items, d)} />
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function PastToggle({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center justify-between rounded-xl bg-card px-3 py-2 text-sm font-medium">
      Incluir pasados
      <Switch checked={on} onCheckedChange={onChange} aria-label="Incluir pasados" />
    </label>
  );
}

/** Dispara `onHit` cuando el centinela entra en pantalla. */
export function LoadMore({ onHit, active }: { onHit: () => void; active: boolean }) {
  const ref = React.useRef<HTMLDivElement>(null);
  const cb = React.useRef(onHit);
  cb.current = onHit;
  React.useEffect(() => {
    if (!active || !ref.current) return;
    const io = new IntersectionObserver((es) => es.some((e) => e.isIntersecting) && cb.current(), { rootMargin: "300px" });
    io.observe(ref.current);
    return () => io.disconnect();
  }, [active]);
  return <div ref={ref} className="h-8" />;
}

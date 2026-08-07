import * as React from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { StandardCard } from "@/components/squad/StandardCard";
import { EmptyState } from "@/components/squad/EmptyState";
import { EVENT_TYPE_MAP } from "@/lib/eventTypes";
import { formatDayLabel, formatTime } from "@/lib/calendar-utils";
import type { CalendarEventRow } from "@/hooks/useCalendarEvents";

interface Props {
  day: Date | null;
  events: CalendarEventRow[];
  onClose: () => void;
  onSelect: (event: CalendarEventRow) => void;
}

export function DaySheet({ day, events, onClose, onSelect }: Props) {
  const open = !!day;
  return (
    <Sheet open={open} onOpenChange={(v) => (!v ? onClose() : null)}>
      <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="font-display capitalize">
            {day ? formatDayLabel(day) : ""}
          </SheetTitle>
          <SheetDescription>
            {events.length} {events.length === 1 ? "evento" : "eventos"}
          </SheetDescription>
        </SheetHeader>
        <div className="mt-4 space-y-3">
          {events.length === 0 ? (
            <EmptyState title="Sin eventos" message="Este día no tiene eventos programados." />
          ) : (
            events.map((e) => {
              const def = EVENT_TYPE_MAP[e.event_type];
              return (
                <div key={e.id}>
                <StandardCard
                  key={e.id}
                  interactive
                  onClick={() => onSelect(e)}
                  icon={def.icon}
                  title={e.title}
                  subtitle={`${formatTime(e.starts_at)}${e.location ? ` · ${e.location}` : ""}`}
                >
                  <span
                    className="inline-block rounded-full px-2 py-0.5 text-xs"
                    style={{ backgroundColor: `${def.cssVar}20`, color: def.cssVar }}
                  >
                    {def.label}
                  </span>
                </StandardCard>
                </div>
              );
            })
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

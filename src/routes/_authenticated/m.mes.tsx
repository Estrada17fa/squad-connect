import * as React from "react";
import { createFileRoute } from "@tanstack/react-router";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { AgendaHeader } from "@/components/agenda/AgendaHeader";
import { filterAgenda, type AgendaKind } from "@/lib/agenda";
import { EmptyState } from "@/components/squad/EmptyState";
import { Button } from "@/components/ui/button";
import { useApp } from "@/components/squad/AppLayout";
import { useTeamFilter } from "@/hooks/useTeamFilter";
import { useCalendarEvents, type CalendarEventRow } from "@/hooks/useCalendarEvents";
import { EVENT_TYPES, EVENT_TYPE_MAP } from "@/lib/eventTypes";
import { addMonths, formatRelativeDayLabel, formatDayLabel, isSameDay, monthGrid, monthLabel, startOfDay, weekdayLabels } from "@/lib/calendar-utils";
import { useClubPrefs } from "@/hooks/useClubPrefs";
import { EventCard } from "@/components/calendar/EventCard";
import { EventDetailSheet } from "@/components/calendar/EventDetailSheet";
import { cn } from "@/lib/utils";
import { useEditableTeams } from "@/hooks/useEditableTeams";
import { useTeamAccess } from "@/hooks/useTeamAccess";

export const Route = createFileRoute("/_authenticated/m/mes")({
  head: () => ({
    meta: [
      { title: "Squad — Mes" },
      { name: "description", content: "Vista mensual del calendario del equipo." },
    ],
  }),
  component: MesModulePage,
});

function MesModulePage() {
  const { user, profile, teamOptions } = useApp();
  const { weekStart } = useClubPrefs();
  const editableTeams = useEditableTeams("mes");
  const { canEditTeam } = useTeamAccess("mes");
  const [anchor, setAnchor] = React.useState(() => startOfDay(new Date()));
  const [selectedDay, setSelectedDay] = React.useState<Date | null>(null);
  const [detailEvent, setDetailEvent] = React.useState<CalendarEventRow | null>(null);
  const [teamFilter, setTeamFilter] = useTeamFilter();
  const [kinds, setKinds] = React.useState<AgendaKind[]>([]);
  const clubId = profile?.club_id ?? null;

  const { data: allEvents } = useCalendarEvents({ mode: "club", clubId });
  const events = React.useMemo(
    () =>
      filterAgenda(allEvents ?? [], teamOptions.map((t) => t.id).filter(Boolean) as string[], teamFilter, kinds),
    [allEvents, teamOptions, teamFilter, kinds],
  );

  const eventsByDay = React.useMemo(() => {
    const map = new Map<string, CalendarEventRow[]>();
    for (const e of events ?? []) {
      const d = startOfDay(new Date(e.starts_at)).toISOString();
      const arr = map.get(d) ?? [];
      arr.push(e);
      map.set(d, arr);
    }
    return map;
  }, [events]);

  const grid = React.useMemo(() => monthGrid(anchor), [anchor, weekStart]);
  const weekdays = React.useMemo(() => weekdayLabels(), [weekStart]);
  const today = startOfDay(new Date());
  const selectedEvents = selectedDay
    ? eventsByDay.get(startOfDay(selectedDay).toISOString()) ?? []
    : [];

  return (
    <div className="space-y-6">
      <AgendaHeader tab="mes" category={teamFilter} onCategory={setTeamFilter} kinds={kinds} onKinds={setKinds} defaultDate={selectedDay ?? undefined} />

      <div className="glass p-4">
        <div className="mb-3 flex items-center justify-between">
          <div className="font-display text-lg font-semibold capitalize text-foreground">
            {monthLabel(anchor)}
          </div>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" onClick={() => setAnchor(addMonths(anchor, -1))} aria-label="Mes anterior">
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setAnchor(startOfDay(new Date()))}>Hoy</Button>
            <Button variant="ghost" size="icon" onClick={() => setAnchor(addMonths(anchor, 1))} aria-label="Mes siguiente">
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-7 gap-1 text-center text-xs text-muted-foreground">
          {weekdays.map((d) => <div key={d} className="py-1">{d}</div>)}
        </div>
        <div className="mt-1 grid grid-cols-7 gap-1">
          {grid.map((day) => {
            const inMonth = day.getMonth() === anchor.getMonth();
            const isToday = isSameDay(day, today);
            const dayEvents = eventsByDay.get(startOfDay(day).toISOString()) ?? [];
            const types = Array.from(new Set(dayEvents.map((e) => e.event_type)));
            const isSelected = !!selectedDay && isSameDay(day, selectedDay);
            return (
              <button
                key={day.toISOString()}
                type="button"
                onClick={() => setSelectedDay(isSelected ? null : day)}
                className={cn(
                  "flex aspect-square flex-col items-center justify-center gap-1 rounded-xl border text-xs transition-colors",
                  inMonth ? "text-foreground" : "text-muted-foreground/35",
                  isSelected
                    ? "border-primary bg-primary/15 text-primary"
                    : isToday
                      ? "border-primary/50 bg-primary/[0.07] text-primary"
                      : "border-transparent hover:bg-white/[0.05]",
                )}
              >
                <span className={cn("font-display leading-none", (isToday || isSelected) && "font-bold")}>
                  {day.getDate()}
                </span>
                <span className="flex h-1.5 items-center justify-center gap-0.5">
                  {types.slice(0, 4).map((t) => (
                    <span
                      key={t}
                      className="h-1.5 w-1.5 rounded-full"
                      style={{ backgroundColor: EVENT_TYPE_MAP[t].cssVar }}
                    />
                  ))}
                </span>
              </button>
            );
          })}
        </div>

        <div className="mt-4 flex flex-wrap gap-2 border-t border-border/60 pt-3 text-xs">
          {EVENT_TYPES.map((t) => {
            return (
              <span key={t.key} className="inline-flex items-center gap-1.5 px-2.5 py-1 text-muted-foreground">
                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: t.cssVar }} />
                {t.label}
              </span>
            );
          })}
        </div>
      </div>

      {selectedDay ? (
        <section className="space-y-2.5">
          <div className="flex items-center gap-3">
            <h2 className="font-display text-xs font-bold uppercase tracking-[0.14em] text-primary">
              {formatRelativeDayLabel(selectedDay)}
            </h2>
            <span className="truncate text-[11px] capitalize text-muted-foreground/70">
              {formatDayLabel(selectedDay)}
            </span>
            <span className="h-px flex-1 bg-white/5" />
            <span className="shrink-0 rounded-full bg-white/[0.06] px-2 py-0.5 text-[11px] text-muted-foreground">
              {selectedEvents.length}
            </span>
          </div>
          {selectedEvents.length === 0 ? (
            <EmptyState title="Sin eventos" message="No hay nada agendado este día." />
          ) : (
            selectedEvents.map((e, i) => (
              <EventCard
                key={e.id}
                event={e}
                index={i}
                teamLabel={e.team_id ? teamOptions.find((t) => t.id === e.team_id)?.name ?? null : "Todo el club"}
                onClick={() => setDetailEvent(e)}
              />
            ))
          )}
        </section>
      ) : null}

      <EventDetailSheet
        open={!!detailEvent}
        onOpenChange={(v) => !v && setDetailEvent(null)}
        event={detailEvent}
        canEdit={!!detailEvent && canEditTeam(detailEvent.team_id)}
        clubId={clubId}
        userId={user.id}
        teams={editableTeams}
        teamName={(id) => teamOptions.find((t) => t.id === id)?.name ?? null}
      />
    </div>
  );
}

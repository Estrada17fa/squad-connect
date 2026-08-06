import * as React from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Plus, ChevronLeft, ChevronRight } from "lucide-react";
import { PageHeader } from "@/components/squad/PageHeader";
import { EmptyState } from "@/components/squad/EmptyState";
import { Button } from "@/components/ui/button";
import { useApp } from "@/components/squad/AppLayout";
import { useCalendarEvents, type CalendarEventRow } from "@/hooks/useCalendarEvents";
import { EVENT_TYPES, EVENT_TYPE_MAP } from "@/lib/eventTypes";
import { addMonths, isSameDay, monthGrid, monthLabel, startOfDay } from "@/lib/calendar-utils";
import { EventFormDialog } from "@/components/calendar/EventFormDialog";
import { DaySheet } from "@/components/calendar/DaySheet";
import { ModuleTabs } from "@/components/squad/ModuleTabs";
import { cn } from "@/lib/utils";
import { TeamFilter } from "@/components/squad/TeamFilter";
import { useEditableTeams } from "@/hooks/useEditableTeams";

export const Route = createFileRoute("/_authenticated/m/mes")({
  head: () => ({
    meta: [
      { title: "Squad — Mes" },
      { name: "description", content: "Vista mensual del calendario del equipo." },
    ],
  }),
  component: MesModulePage,
});

const WEEKDAYS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

function MesModulePage() {
  const { getModuleAccess, user, isSuperAdmin, profile, teamOptions } = useApp();
  const canEdit = isSuperAdmin || getModuleAccess("mes") === "editor" || getModuleAccess("mes") === "approver";
  const editableTeams = useEditableTeams("mes");

  const [anchor, setAnchor] = React.useState(() => startOfDay(new Date()));
  const [selectedDay, setSelectedDay] = React.useState<Date | null>(null);
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<CalendarEventRow | null>(null);
  const [teamFilter, setTeamFilter] = React.useState<string | null>(null);
  const clubId = profile?.club_id ?? null;

  const { data: allEvents } = useCalendarEvents({ mode: "club", clubId });
  const events = React.useMemo(
    () => (allEvents ?? []).filter((e) => !teamFilter || e.team_id === teamFilter),
    [allEvents, teamFilter],
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

  const grid = monthGrid(anchor);
  const today = startOfDay(new Date());
  const selectedEvents = selectedDay
    ? eventsByDay.get(startOfDay(selectedDay).toISOString()) ?? []
    : [];

  function openCreate(date?: Date) {
    setEditing(null);
    if (date) setSelectedDay(date);
    setDialogOpen(true);
  }

  function openEdit(ev: CalendarEventRow) {
    setEditing(ev);
    setSelectedDay(null);
    setDialogOpen(true);
  }

  return (
    <div className="space-y-6">
      <PageHeader hideTitle title="Mes" subtitle="Todos tus equipos" />
      <ModuleTabs activeKey="mes" />
      <TeamFilter teams={teamOptions} value={teamFilter} onChange={setTeamFilter} />

      {canEdit && editableTeams.length > 0 ? (
        <Button onClick={() => openCreate()} className="w-full glow-primary">
          <Plus className="mr-2 h-4 w-4" /> Nuevo evento
        </Button>
      ) : null}

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
          {WEEKDAYS.map((d) => <div key={d} className="py-1">{d}</div>)}
        </div>
        <div className="mt-1 grid grid-cols-7 gap-1">
          {grid.map((day) => {
            const inMonth = day.getMonth() === anchor.getMonth();
            const isToday = isSameDay(day, today);
            const dayEvents = eventsByDay.get(startOfDay(day).toISOString()) ?? [];
            const types = Array.from(new Set(dayEvents.map((e) => e.event_type)));
            return (
              <button
                key={day.toISOString()}
                type="button"
                onClick={() => setSelectedDay(day)}
                className={cn(
                  "flex aspect-square flex-col items-center justify-start gap-1 rounded-lg p-1.5 text-xs transition-colors",
                  inMonth ? "text-foreground" : "text-muted-foreground/40",
                  isToday
                    ? "bg-primary/10 ring-1 ring-primary/60 text-primary"
                    : "hover:bg-white/[0.04]",
                )}
              >
                <span className="font-medium">{day.getDate()}</span>
                <span className="flex flex-wrap justify-center gap-0.5">
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

        <div className="mt-4 flex flex-wrap gap-3 border-t border-border/60 pt-3 text-xs text-muted-foreground">
          {EVENT_TYPES.map((t) => (
            <span key={t.key} className="inline-flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full" style={{ backgroundColor: t.cssVar }} />
              {t.label}
            </span>
          ))}
        </div>
      </div>

      <DaySheet
        day={selectedDay}
        events={selectedEvents}
        onClose={() => setSelectedDay(null)}
        onSelect={(e) => (canEdit ? openEdit(e) : null)}
      />

      {clubId ? (
        <EventFormDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          clubId={clubId}
          teams={editableTeams}
          defaultTeamId={editing?.team_id ?? teamFilter ?? null}
          userId={user.id}
          defaultDate={selectedDay ?? undefined}
          event={editing}
        />
      ) : null}
    </div>
  );
}

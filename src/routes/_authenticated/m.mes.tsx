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
import { supabase } from "@/integrations/supabase/client";

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
  const { activeTeam, getModuleAccess, user, isSuperAdmin, viewsAllClub, profile } = useApp();
  const canEdit = isSuperAdmin || getModuleAccess("mes") === "editor" || getModuleAccess("mes") === "approver";

  const [anchor, setAnchor] = React.useState(() => startOfDay(new Date()));
  const [selectedDay, setSelectedDay] = React.useState<Date | null>(null);
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<CalendarEventRow | null>(null);
  const [clubId, setClubId] = React.useState<string | null>(profile?.club_id ?? null);
  const [clubTeams, setClubTeams] = React.useState<{ id: string; name: string }[]>([]);
  const [createTeamId, setCreateTeamId] = React.useState<string | null>(activeTeam?.id ?? null);

  const { data: events } = useCalendarEvents(
    viewsAllClub
      ? { mode: "club", clubId: profile?.club_id ?? null }
      : { mode: "team", teamId: activeTeam?.id ?? null },
  );

  React.useEffect(() => {
    if (!viewsAllClub || !profile?.club_id) return;
    supabase
      .from("teams")
      .select("id, name")
      .eq("club_id", profile.club_id)
      .order("name")
      .then(({ data }) => {
        const list = (data ?? []) as { id: string; name: string }[];
        setClubTeams(list);
        setCreateTeamId((cur) => cur ?? list[0]?.id ?? null);
      });
  }, [viewsAllClub, profile?.club_id]);

  React.useEffect(() => {
    if (!viewsAllClub) setCreateTeamId(activeTeam?.id ?? null);
  }, [viewsAllClub, activeTeam?.id]);

  React.useEffect(() => {
    if (profile?.club_id) {
      setClubId(profile.club_id);
      return;
    }
    if (!activeTeam?.id) {
      setClubId(null);
      return;
    }
    supabase
      .from("teams")
      .select("club_id")
      .eq("id", activeTeam.id)
      .maybeSingle()
      .then(({ data }) => setClubId(data?.club_id ?? null));
  }, [profile?.club_id, activeTeam?.id]);

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

  if (!viewsAllClub && !activeTeam) {
    return <EmptyState title="Sin equipo activo" message="Selecciona un equipo desde el encabezado." />;
  }

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
      <PageHeader hideTitle title="Mes" subtitle={activeTeam?.name ?? "Todo el club"} />

      {canEdit ? (
        <div className="flex items-center gap-2">
          {viewsAllClub && clubTeams.length > 0 ? (
            <select
              value={createTeamId ?? ""}
              onChange={(e) => setCreateTeamId(e.target.value)}
              className="rounded-md border border-border/60 bg-background/60 px-2 py-2 text-sm text-foreground"
              aria-label="Categoría para nuevo evento"
            >
              {clubTeams.map((t) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          ) : null}
          <Button
            onClick={() => openCreate()}
            className="flex-1 glow-primary"
            disabled={!createTeamId}
          >
            <Plus className="mr-2 h-4 w-4" /> Nuevo evento
          </Button>
        </div>
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

      {clubId && (editing?.team_id ?? createTeamId) ? (
        <EventFormDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          clubId={clubId}
          teamId={(editing?.team_id ?? createTeamId)!}
          userId={user.id}
          defaultDate={selectedDay ?? undefined}
          event={editing}
        />
      ) : null}
    </div>
  );
}

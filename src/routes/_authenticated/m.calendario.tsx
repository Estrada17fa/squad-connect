import * as React from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Plus, ChevronLeft, ChevronRight } from "lucide-react";
import { PageHeader } from "@/components/squad/PageHeader";
import { EmptyState } from "@/components/squad/EmptyState";
import { AgendaSkeleton } from "@/components/squad/LoadingState";
import { StandardCard } from "@/components/squad/StandardCard";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useApp } from "@/components/squad/AppLayout";
import { useCalendarEvents, type CalendarEventRow } from "@/hooks/useCalendarEvents";
import { EVENT_TYPES, EVENT_TYPE_MAP } from "@/lib/eventTypes";
import {
  addMonths, formatDayLabel, formatTime, isSameDay, monthGrid, monthLabel, startOfDay,
} from "@/lib/calendar-utils";
import { EventFormDialog } from "@/components/calendar/EventFormDialog";
import { DaySheet } from "@/components/calendar/DaySheet";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/m/calendario")({
  head: () => ({
    meta: [
      { title: "Squad — Calendario" },
      { name: "description", content: "Partidos, entrenamientos, viajes y eventos del equipo." },
    ],
  }),
  component: CalendarPage,
});

const WEEKDAYS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

function CalendarPage() {
  const { activeTeam, getModuleAccess, user, isSuperAdmin, viewsAllClub, profile } = useApp();
  const canEdit = isSuperAdmin || getModuleAccess("calendario") === "editor" || getModuleAccess("calendario") === "approver";


  const [anchor, setAnchor] = React.useState(() => startOfDay(new Date()));
  const [selectedDay, setSelectedDay] = React.useState<Date | null>(null);
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<CalendarEventRow | null>(null);
  const [clubId, setClubId] = React.useState<string | null>(profile?.club_id ?? null);
  const [clubTeams, setClubTeams] = React.useState<{ id: string; name: string }[]>([]);
  const [createTeamId, setCreateTeamId] = React.useState<string | null>(activeTeam?.id ?? null);

  const { data: events, isLoading } = useCalendarEvents(
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

  const upcoming = React.useMemo(() => {
    const now = new Date();
    return (events ?? []).filter((e) => new Date(e.starts_at) >= startOfDay(now));
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
      <PageHeader
        hideTitle
        title="Calendario"
        subtitle={activeTeam?.name ?? "Todo el club"}
        action={
          canEdit ? (
            <Button onClick={() => openCreate()} className="glow-primary">
              <Plus className="mr-2 h-4 w-4" /> Nuevo evento
            </Button>
          ) : null
        }
      />

      <Tabs defaultValue="agenda" className="w-full">
        <TabsList>
          <TabsTrigger value="agenda">Agenda</TabsTrigger>
          <TabsTrigger value="mes">Mes</TabsTrigger>
        </TabsList>

        <TabsContent value="agenda" className="mt-4 space-y-3">
          {isLoading && !events ? (
            <AgendaSkeleton count={4} />
          ) : upcoming.length === 0 ? (
            <EmptyState
              title="Sin próximos eventos"
              message={canEdit ? "Crea el primer evento del equipo." : "Aún no hay eventos programados."}
            />
          ) : (
            upcoming.map((e, i) => {
              const def = EVENT_TYPE_MAP[e.event_type];
              return (
                <div key={e.id} className="animate-card-in" style={{ animationDelay: `${i * 30}ms` }}>
                  <StandardCard
                    interactive={canEdit}
                    onClick={canEdit ? () => openEdit(e) : undefined}
                    icon={def.icon}
                    title={e.title}
                    subtitle={`${new Date(e.starts_at).toLocaleDateString("es-MX", { weekday: "short", day: "numeric", month: "short" })} · ${formatTime(e.starts_at)}${e.location ? ` · ${e.location}` : ""}`}
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
        </TabsContent>

        <TabsContent value="mes" className="mt-4">
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
        </TabsContent>
      </Tabs>

      <DaySheet
        day={selectedDay}
        events={selectedEvents}
        onClose={() => setSelectedDay(null)}
        onSelect={(e) => (canEdit ? openEdit(e) : null)}
      />

      {clubId && activeTeam?.id ? (
        <EventFormDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          clubId={clubId}
          teamId={activeTeam.id}
          userId={user.id}
          defaultDate={selectedDay ?? undefined}
          event={editing}
        />
      ) : null}
    </div>
  );
}

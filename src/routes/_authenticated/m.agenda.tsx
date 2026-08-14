import * as React from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Plus } from "lucide-react";
import { PageHeader } from "@/components/squad/PageHeader";
import { EmptyState } from "@/components/squad/EmptyState";
import { AgendaSkeleton } from "@/components/squad/LoadingState";
import { StandardCard } from "@/components/squad/StandardCard";
import { ModuleTabs } from "@/components/squad/ModuleTabs";
import { Button } from "@/components/ui/button";
import { useApp } from "@/components/squad/AppLayout";
import { useCalendarEvents, type CalendarEventRow } from "@/hooks/useCalendarEvents";
import { EVENT_TYPES, EVENT_TYPE_MAP, type EventType } from "@/lib/eventTypes";
import { formatDayLabel, formatTime, startOfDay } from "@/lib/calendar-utils";
import { useEditableTeams } from "@/hooks/useEditableTeams";
import { useTeamAccess } from "@/hooks/useTeamAccess";
import { EventFormDialog } from "@/components/calendar/EventFormDialog";
import { EventDetailSheet } from "@/components/calendar/EventDetailSheet";
import { TeamFilter, TeamBadge } from "@/components/squad/TeamFilter";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/m/agenda")({
  head: () => ({
    meta: [
      { title: "Squad — Agenda" },
      { name: "description", content: "Próximos eventos: partidos, entrenamientos, viajes, juntas y citas." },
      { property: "og:title", content: "Squad — Agenda" },
      {
        property: "og:description",
        content: "Tu agenda unificada: cada evento visible según el permiso de su módulo de origen.",
      },
    ],
  }),
  component: AgendaModulePage,
});

function AgendaModulePage() {
  const { user, profile, teamOptions } = useApp();
  const editableTeams = useEditableTeams("agenda");
  const { canEditTeam } = useTeamAccess("agenda");
  const canEdit = editableTeams.length > 0;

  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<CalendarEventRow | null>(null);
  const [detailEvent, setDetailEvent] = React.useState<CalendarEventRow | null>(null);
  const [teamFilter, setTeamFilter] = React.useState<string | null>(null);
  const [typeFilter, setTypeFilter] = React.useState<EventType | null>(null);
  const clubId = profile?.club_id ?? null;

  const teamNames = React.useMemo(() => {
    const m: Record<string, string> = {};
    for (const t of teamOptions) if (t.id) m[t.id] = t.name;
    return m;
  }, [teamOptions]);

  // La RLS limita las filas al permiso del módulo de origen de cada evento.
  const { data: events, isLoading } = useCalendarEvents({ mode: "club", clubId });

  /** Tipos realmente presentes, para no mostrar chips vacíos. */
  const presentTypes = React.useMemo(() => {
    const set = new Set<EventType>();
    for (const e of events ?? []) set.add(e.event_type);
    return EVENT_TYPES.filter((t) => set.has(t.key));
  }, [events]);

  const upcoming = React.useMemo(() => {
    const from = startOfDay(new Date());
    return (events ?? [])
      .filter((e) => new Date(e.starts_at) >= from)
      .filter((e) => !teamFilter || e.team_id === teamFilter)
      .filter((e) => !typeFilter || e.event_type === typeFilter);
  }, [events, teamFilter, typeFilter]);

  /** Agrupado por día para una lista escaneable. */
  const days = React.useMemo(() => {
    const map = new Map<string, CalendarEventRow[]>();
    for (const e of upcoming) {
      const key = startOfDay(new Date(e.starts_at)).toISOString();
      const arr = map.get(key) ?? [];
      arr.push(e);
      map.set(key, arr);
    }
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [upcoming]);

  return (
    <div className="space-y-6">
      <PageHeader hideTitle title="Agenda" subtitle="Todos tus equipos" />
      <ModuleTabs activeKey="agenda" />
      <TeamFilter teams={teamOptions} value={teamFilter} onChange={setTeamFilter} />

      {presentTypes.length > 1 ? (
        <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] sm:mx-0 sm:px-0 [&::-webkit-scrollbar]:hidden">
          <button
            type="button"
            onClick={() => setTypeFilter(null)}
            className={cn(
              "shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
              typeFilter === null
                ? "border-primary/60 bg-primary/10 text-primary"
                : "border-border/60 text-muted-foreground hover:text-foreground",
            )}
          >
            Todos
          </button>
          {presentTypes.map((t) => {
            const active = typeFilter === t.key;
            return (
              <button
                key={t.key}
                type="button"
                onClick={() => setTypeFilter(active ? null : t.key)}
                className={cn(
                  "inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                  active ? "text-foreground" : "text-muted-foreground hover:text-foreground",
                )}
                style={{
                  borderColor: active ? t.cssVar : undefined,
                  backgroundColor: active ? `${t.cssVar}1f` : undefined,
                }}
              >
                <t.icon className="h-3.5 w-3.5" style={{ color: t.cssVar }} />
                {t.label}
              </button>
            );
          })}
        </div>
      ) : null}

      {canEdit ? (
        <Button
          onClick={() => {
            setEditing(null);
            setDialogOpen(true);
          }}
          className="w-full glow-primary"
        >
          <Plus className="mr-2 h-4 w-4" /> Nuevo evento
        </Button>
      ) : null}

      <div className="space-y-6">
        {isLoading && !events ? (
          <AgendaSkeleton count={4} />
        ) : days.length === 0 ? (
          <EmptyState
            title="Sin próximos eventos"
            message={
              typeFilter || teamFilter
                ? "No hay eventos con estos filtros."
                : "Los eventos aparecen aquí cuando los crean Entrenamientos, Partidos, Viajes, Juntas o Salud."
            }
          />
        ) : (
          days.map(([dayIso, dayEvents]) => (
            <section key={dayIso} className="space-y-3">
              <h2 className="font-display text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {formatDayLabel(new Date(dayIso))}
              </h2>
              {dayEvents.map((e, i) => {
                const def = EVENT_TYPE_MAP[e.event_type];
                return (
                  <div key={e.id} className="animate-card-in" style={{ animationDelay: `${i * 30}ms` }}>
                    <StandardCard
                      interactive
                      onClick={() => setDetailEvent(e)}
                      icon={def.icon}
                      title={e.title}
                      subtitle={`${formatTime(e.starts_at)}${e.location ? ` · ${e.location}` : ""}`}
                    >
                      <TeamBadge name={e.team_id ? teamNames[e.team_id] : "Todo el club"} className="mr-2" />
                      <span
                        className="inline-block rounded-full px-2 py-0.5 text-xs"
                        style={{ backgroundColor: `${def.cssVar}20`, color: def.cssVar }}
                      >
                        {def.label}
                      </span>
                    </StandardCard>
                  </div>
                );
              })}
            </section>
          ))
        )}
      </div>

      {clubId ? (
        <EventFormDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          clubId={clubId}
          teams={editableTeams}
          defaultTeamId={editing?.team_id ?? teamFilter ?? null}
          userId={user.id}
          event={editing}
        />
      ) : null}

      <EventDetailSheet
        open={!!detailEvent}
        onOpenChange={(v) => !v && setDetailEvent(null)}
        event={detailEvent}
        canEdit={!!detailEvent && canEditTeam(detailEvent.team_id)}
        clubId={clubId}
        userId={user.id}
        teams={editableTeams}
        teamName={(id) => (id ? teamNames[id] ?? null : "Todo el club")}
      />
    </div>
  );
}

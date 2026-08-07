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
import { EVENT_TYPE_MAP } from "@/lib/eventTypes";
import { formatTime, startOfDay } from "@/lib/calendar-utils";
import { useEditableTeams } from "@/hooks/useEditableTeams";
import { useTeamAccess } from "@/hooks/useTeamAccess";
import { EventFormDialog } from "@/components/calendar/EventFormDialog";

import { EventDetailSheet } from "@/components/calendar/EventDetailSheet";
import { TeamFilter, TeamBadge } from "@/components/squad/TeamFilter";

export const Route = createFileRoute("/_authenticated/m/agenda")({
  head: () => ({
    meta: [
      { title: "Squad — Agenda" },
      { name: "description", content: "Próximos eventos: partidos, entrenamientos, viajes y juntas." },
    ],
  }),
  component: AgendaModulePage,
});

function AgendaModulePage() {
  const { user, profile, teamOptions } = useApp();
  const editableTeams = useEditableTeams("agenda");
  const { canEditTeam } = useTeamAccess("agenda");
  const canEdit = editableTeams.length > 0;
  const [locationsOpen, setLocationsOpen] = React.useState(false);


  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<CalendarEventRow | null>(null);
  const [detailEvent, setDetailEvent] = React.useState<CalendarEventRow | null>(null);
  const [teamFilter, setTeamFilter] = React.useState<string | null>(null);
  const clubId = profile?.club_id ?? null;

  const teamNames = React.useMemo(() => {
    const m: Record<string, string> = {};
    for (const t of teamOptions) if (t.id) m[t.id] = t.name;
    return m;
  }, [teamOptions]);

  // La RLS limita las filas: se traen todos los eventos accesibles del club.
  const { data: events, isLoading } = useCalendarEvents({ mode: "club", clubId });

  const upcoming = React.useMemo(() => {
    const now = new Date();
    return (events ?? [])
      .filter((e) => new Date(e.starts_at) >= startOfDay(now))
      .filter((e) => !teamFilter || e.team_id === teamFilter);
  }, [events, teamFilter]);

  function openEdit(ev: CalendarEventRow) {
    setEditing(ev);
    setDialogOpen(true);
  }

  return (
    <div className="space-y-6">
      <PageHeader hideTitle title="Agenda" subtitle="Todos tus equipos" />
      <ModuleTabs activeKey="agenda" />
      <TeamFilter teams={teamOptions} value={teamFilter} onChange={setTeamFilter} />

      {canEdit ? (
        <Button
          onClick={() => { setEditing(null); setDialogOpen(true); }}
          className="w-full glow-primary"
        >
          <Plus className="mr-2 h-4 w-4" /> Nuevo evento
        </Button>
      ) : null}


      <div className="space-y-3">
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
            const rowEditable = canEditTeam(e.team_id);
            return (
              <div key={e.id} className="animate-card-in" style={{ animationDelay: `${i * 30}ms` }}>
                <StandardCard
                  interactive
                  onClick={() => setDetailEvent(e)}
                  icon={def.icon}
                  title={e.title}
                  subtitle={`${new Date(e.starts_at).toLocaleDateString("es-MX", { weekday: "short", day: "numeric", month: "short" })} · ${formatTime(e.starts_at)}${e.location ? ` · ${e.location}` : ""}`}
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
          })
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

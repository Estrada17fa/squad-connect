import * as React from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Plus } from "lucide-react";
import { PageHeader } from "@/components/squad/PageHeader";
import { EmptyState } from "@/components/squad/EmptyState";
import { AgendaSkeleton } from "@/components/squad/LoadingState";
import { StandardCard } from "@/components/squad/StandardCard";
import { Button } from "@/components/ui/button";
import { useApp } from "@/components/squad/AppLayout";
import { useCalendarEvents, type CalendarEventRow } from "@/hooks/useCalendarEvents";
import { EVENT_TYPE_MAP } from "@/lib/eventTypes";
import { formatTime, startOfDay } from "@/lib/calendar-utils";
import { EventFormDialog } from "@/components/calendar/EventFormDialog";
import { supabase } from "@/integrations/supabase/client";

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
  const { activeTeam, getModuleAccess, user, isSuperAdmin, viewsAllClub, profile } = useApp();
  const canEdit = isSuperAdmin || getModuleAccess("agenda") === "editor" || getModuleAccess("agenda") === "approver";

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

  const upcoming = React.useMemo(() => {
    const now = new Date();
    return (events ?? []).filter((e) => new Date(e.starts_at) >= startOfDay(now));
  }, [events]);

  if (!viewsAllClub && !activeTeam) {
    return <EmptyState title="Sin equipo activo" message="Selecciona un equipo desde el encabezado." />;
  }

  function openEdit(ev: CalendarEventRow) {
    setEditing(ev);
    setDialogOpen(true);
  }

  return (
    <div className="space-y-6">
      <PageHeader hideTitle title="Agenda" subtitle={activeTeam?.name ?? "Todo el club"} />

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
            onClick={() => { setEditing(null); setDialogOpen(true); }}
            className="flex-1 glow-primary"
            disabled={!createTeamId}
          >
            <Plus className="mr-2 h-4 w-4" /> Nuevo evento
          </Button>
        </div>
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
      </div>

      {clubId && (editing?.team_id ?? createTeamId) ? (
        <EventFormDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          clubId={clubId}
          teamId={(editing?.team_id ?? createTeamId)!}
          userId={user.id}
          event={editing}
        />
      ) : null}
    </div>
  );
}

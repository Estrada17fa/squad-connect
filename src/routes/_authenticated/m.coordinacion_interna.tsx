import * as React from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { Plus, CalendarClock, MapPin, MessagesSquare, ClipboardList } from "lucide-react";
import { PageHeader } from "@/components/squad/PageHeader";
import { ModuleTabs } from "@/components/squad/ModuleTabs";
import { EmptyState } from "@/components/squad/EmptyState";
import { LoadingState, CardGridSkeleton } from "@/components/squad/LoadingState";
import { StatusBadge, type StatusVariant } from "@/components/squad/StatusBadge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useApp } from "@/components/squad/AppLayout";
import {
  useTasks,
  useMeetings,
  type TaskRow,
  type TaskStatus,
  type MeetingRow,
  type MeetingStatus,
} from "@/hooks/useCoordinacion";
import { useTeamAccess } from "@/hooks/useTeamAccess";
import { useEditableTeams } from "@/hooks/useEditableTeams";
import { formatDateTime } from "@/lib/calendar-utils";
import { MEETING_STATUS_LABEL } from "@/lib/coordinacion";
import { TaskFormDialog } from "@/components/coordinacion/TaskFormDialog";
import { MeetingFormDialog } from "@/components/coordinacion/MeetingFormDialog";
import { TaskDetailSheet } from "@/components/coordinacion/TaskDetailSheet";
import { MeetingDetailSheet } from "@/components/coordinacion/MeetingDetailSheet";
import { TaskBoard } from "@/components/coordinacion/TaskBoard";
import { AvatarStack } from "@/components/coordinacion/AvatarStack";
import { CoordFilters, EMPTY_COORD_FILTERS, type CoordFilterState } from "@/components/coordinacion/CoordFilters";
import { MediaManagerPanel } from "@/components/multimedia/MediaManagerPanel";
import { supabase } from "@/integrations/supabase/client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/m/coordinacion_interna")({
  validateSearch: (search: Record<string, unknown>) => ({
    open: typeof search.open === "string" ? search.open : undefined,
    kind: search.kind === "junta" ? ("junta" as const) : search.kind === "tarea" ? ("tarea" as const) : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Squad — Coordinación" },
      { name: "description", content: "Tareas y juntas del staff a nivel club." },
    ],
  }),
  component: CoordinacionPage,
});

const MEETING_STATUS_VARIANT: Record<MeetingStatus, StatusVariant> = {
  programada: "info",
  en_curso: "pending",
  en_pausa: "info",
  finalizada: "approved",
  cancelada: "rejected",
};

function CoordinacionPage() {
  const { isSuperAdmin, user, accessibleModules, profile, teamOptions } = useApp();
  const clubId = profile?.club_id ?? null;
  const { canEditTeam, isPlayerScoped } = useTeamAccess("coordinacion_interna");
  const editableTeams = useEditableTeams("coordinacion_interna");
  const canCreate = editableTeams.length > 0 || canEditTeam(null);
  const playerScoped = isPlayerScoped(null);
  const canAccess = isSuperAdmin || accessibleModules.includes("coordinacion_interna");

  // La pestaña Multimedia (gestión) es para lectores y editores; Vista Jugador no entra.
  const mediaAccess = useTeamAccess("multimedia");
  const canSeeMedia =
    isSuperAdmin ||
    (accessibleModules.includes("multimedia") && !mediaAccess.isPlayerScoped(null));

  const tasksQ = useTasks(clubId);
  const meetingsQ = useMeetings(clubId);
  const qc = useQueryClient();

  const [taskDialog, setTaskDialog] = React.useState(false);
  const [editingTask, setEditingTask] = React.useState<TaskRow | null>(null);
  const [detailTaskId, setDetailTaskId] = React.useState<string | null>(null);
  const [meetingDialog, setMeetingDialog] = React.useState(false);
  const [editingMeeting, setEditingMeeting] = React.useState<MeetingRow | null>(null);
  const [detailMeetingId, setDetailMeetingId] = React.useState<string | null>(null);
  const [tab, setTab] = React.useState<"tareas" | "juntas" | "multimedia">("tareas");
  const [taskFilters, setTaskFilters] = React.useState<CoordFilterState>({
    ...EMPTY_COORD_FILTERS,
    mine: true,
  });
  const [meetingFilters, setMeetingFilters] = React.useState<CoordFilterState>(EMPTY_COORD_FILTERS);

  const setTaskStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: TaskStatus }) => {
      const { error } = await supabase.from("tasks").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["coord-tasks", clubId] });
      qc.invalidateQueries({ queryKey: ["home-my-tasks"] });
    },
    onError: (e: any) => toast.error(e.message ?? "No se pudo actualizar"),
  });

  // Deep-link desde el centro de notificaciones: ?open=<id>&kind=tarea|junta
  const { open: openParam, kind: kindParam } = Route.useSearch();
  const navigate = useNavigate();
  React.useEffect(() => {
    if (!openParam) return;
    if (kindParam === "junta") {
      setTab("juntas");
      setMeetingFilters(EMPTY_COORD_FILTERS);
      setDetailMeetingId(openParam);
    } else {
      setTab("tareas");
      setTaskFilters(EMPTY_COORD_FILTERS);
      setDetailTaskId(openParam);
    }
    navigate({ to: "/m/coordinacion_interna", search: () => ({ open: undefined, kind: undefined }), replace: true });
  }, [openParam, kindParam, navigate]);

  const realTeams = React.useMemo(
    () => teamOptions.filter((t) => !!t.id).map((t) => ({ id: t.id as string, name: t.name })),
    [teamOptions],
  );

  const people = React.useMemo(() => {
    const map = new Map<string, { id: string; full_name: string | null; email: string | null }>();
    for (const t of tasksQ.data ?? []) for (const a of t.assignees) map.set(a.id, a);
    for (const m of meetingsQ.data ?? []) for (const a of m.attendees) if (a.profile) map.set(a.profile.id, a.profile);
    return [...map.values()].sort((a, b) => (a.full_name ?? "").localeCompare(b.full_name ?? ""));
  }, [tasksQ.data, meetingsQ.data]);

  const tasks = React.useMemo(() => {
    const f = taskFilters;
    const q = f.search.trim().toLowerCase();
    return (tasksQ.data ?? []).filter((t) => {
      if (playerScoped && !t.assignees.some((a) => a.id === user.id)) return false;
      if (f.mine && !t.assignees.some((a) => a.id === user.id)) return false;
      if (f.priority && t.priority !== f.priority) return false;
      if (f.teamId === "__club__" ? t.team_id !== null : f.teamId && t.team_id !== f.teamId) return false;
      if (f.assigneeId && !t.assignees.some((a) => a.id === f.assigneeId)) return false;
      if (q && !(t.title.toLowerCase().includes(q) || (t.description ?? "").toLowerCase().includes(q))) return false;
      return true;
    });
  }, [tasksQ.data, taskFilters, user.id, playerScoped]);

  const meetings = React.useMemo(() => {
    const f = meetingFilters;
    const q = f.search.trim().toLowerCase();
    return (meetingsQ.data ?? []).filter((m) => {
      if (playerScoped && !m.attendees.some((a) => a.user_id === user.id)) return false;
      if (f.mine && !m.attendees.some((a) => a.user_id === user.id)) return false;
      if (f.teamId === "__club__" ? m.team_id !== null : f.teamId && m.team_id !== f.teamId) return false;
      if (f.assigneeId && !m.attendees.some((a) => a.user_id === f.assigneeId)) return false;
      if (q && !(m.title.toLowerCase().includes(q) || (m.agenda ?? "").toLowerCase().includes(q))) return false;
      return true;
    });
  }, [meetingsQ.data, meetingFilters, user.id, playerScoped]);

  const now = Date.now();
  const upcoming = meetings.filter((m) => new Date(m.starts_at).getTime() >= now);
  const past = meetings
    .filter((m) => new Date(m.starts_at).getTime() < now)
    .sort((a, b) => new Date(b.starts_at).getTime() - new Date(a.starts_at).getTime());

  if (!canAccess) {
    return (
      <div className="space-y-6">
        <PageHeader hideTitle title="Coordinación" subtitle="Staff del club" />
        <EmptyState icon={MessagesSquare} title="Sin acceso" message="Tu rol actual no tiene permisos para este módulo." />
      </div>
    );
  }

  if (!clubId) return <LoadingState />;

  const detailTask = detailTaskId ? tasks.find((t) => t.id === detailTaskId) ?? (tasksQ.data ?? []).find((t) => t.id === detailTaskId) ?? null : null;
  const detailMeeting = detailMeetingId
    ? meetings.find((m) => m.id === detailMeetingId) ?? (meetingsQ.data ?? []).find((m) => m.id === detailMeetingId) ?? null
    : null;

  return (
    <div className="space-y-6">
      <ModuleTabs activeKey="coordinacion_interna" />
      <PageHeader hideTitle title="Coordinación" subtitle="Ámbito club · staff sin importar equipo" />

      <Tabs value={tab} onValueChange={(v) => setTab(v as any)} className="w-full">
        <TabsList>
          <TabsTrigger value="tareas">Tareas</TabsTrigger>
          <TabsTrigger value="juntas">Juntas</TabsTrigger>
          {canSeeMedia ? <TabsTrigger value="multimedia">Multimedia</TabsTrigger> : null}
        </TabsList>

        {canSeeMedia ? (
          <TabsContent value="multimedia" className="mt-4">
            <MediaManagerPanel />
          </TabsContent>
        ) : null}

        <TabsContent value="tareas" className="mt-4 space-y-4">
          {canCreate ? (
            <Button
              onClick={() => {
                setEditingTask(null);
                setTaskDialog(true);
              }}
              className="w-full glow-primary"
            >
              <Plus className="mr-2 h-4 w-4" /> Nueva tarea
            </Button>
          ) : null}

          <CoordFilters
            value={taskFilters}
            onChange={setTaskFilters}
            teams={realTeams}
            people={people}
            count={tasks.length}
            searchPlaceholder="Buscar tarea"
            mineLabel="Mías"
          />

          {tasksQ.isLoading ? (
            <CardGridSkeleton />
          ) : tasks.length === 0 ? (
            <EmptyState
              icon={ClipboardList}
              title="Sin tareas"
              message="No hay tareas con estos filtros."
              action={
                canCreate ? (
                  <Button
                    onClick={() => {
                      setEditingTask(null);
                      setTaskDialog(true);
                    }}
                  >
                    <Plus className="mr-2 h-4 w-4" /> Nueva tarea
                  </Button>
                ) : undefined
              }
            />
          ) : (
            <TaskBoard
              tasks={tasks}
              userId={user.id}
              canEdit={canEditTeam(null)}
              onOpen={(t) => setDetailTaskId(t.id)}
              onStatus={(t, status) => setTaskStatus.mutate({ id: t.id, status })}
            />
          )}
        </TabsContent>

        <TabsContent value="juntas" className="mt-4 space-y-4">
          {canCreate ? (
            <Button
              onClick={() => {
                setEditingMeeting(null);
                setMeetingDialog(true);
              }}
              className="w-full glow-primary"
            >
              <Plus className="mr-2 h-4 w-4" /> Nueva junta
            </Button>
          ) : null}

          <CoordFilters
            value={meetingFilters}
            onChange={setMeetingFilters}
            teams={realTeams}
            people={people}
            count={meetings.length}
            showPriority={false}
            searchPlaceholder="Buscar junta"
            mineLabel="Mis juntas"
          />

          {meetingsQ.isLoading ? (
            <CardGridSkeleton />
          ) : meetings.length === 0 ? (
            <EmptyState
              icon={MessagesSquare}
              title="Sin juntas"
              message="No hay juntas con estos filtros."
              action={
                canCreate ? (
                  <Button
                    onClick={() => {
                      setEditingMeeting(null);
                      setMeetingDialog(true);
                    }}
                  >
                    <Plus className="mr-2 h-4 w-4" /> Nueva junta
                  </Button>
                ) : undefined
              }
            />
          ) : (
            <div className="space-y-5">
              <MeetingGroup title="Próximas" meetings={upcoming} onOpen={(m) => setDetailMeetingId(m.id)} />
              <MeetingGroup title="Pasadas" meetings={past} onOpen={(m) => setDetailMeetingId(m.id)} />
            </div>
          )}
        </TabsContent>
      </Tabs>

      <TaskFormDialog
        open={taskDialog}
        onOpenChange={setTaskDialog}
        clubId={clubId}
        userId={user.id}
        teams={editableTeams}
        task={editingTask}
        onSaved={({ isEdit, assigneeIds }) => {
          if (isEdit) return;
          if (taskFilters.mine && !assigneeIds.includes(user.id)) {
            setTaskFilters((f) => ({ ...f, mine: false }));
            toast.info("Ajusté los filtros para que veas la tarea que acabas de crear");
          }
        }}
      />
      <MeetingFormDialog
        open={meetingDialog}
        onOpenChange={setMeetingDialog}
        clubId={clubId}
        userId={user.id}
        teams={editableTeams}
        meeting={editingMeeting}
      />
      <TaskDetailSheet
        open={!!detailTask}
        onOpenChange={(o) => {
          if (!o) setDetailTaskId(null);
        }}
        task={detailTask}
        userId={user.id}
        clubId={clubId}
        canEdit={canEditTeam(detailTask?.team_id ?? null)}
        onEdit={() => {
          if (!detailTask) return;
          setEditingTask(detailTask);
          setDetailTaskId(null);
          setTaskDialog(true);
        }}
      />
      <MeetingDetailSheet
        open={!!detailMeeting}
        onOpenChange={(o) => {
          if (!o) setDetailMeetingId(null);
        }}
        meeting={detailMeeting}
        userId={user.id}
        clubId={clubId}
        canEdit={canEditTeam(detailMeeting?.team_id ?? null)}
        onEdit={() => {
          if (!detailMeeting) return;
          setEditingMeeting(detailMeeting);
          setDetailMeetingId(null);
          setMeetingDialog(true);
        }}
      />
    </div>
  );
}

function MeetingGroup({
  title,
  meetings,
  onOpen,
}: {
  title: string;
  meetings: MeetingRow[];
  onOpen: (m: MeetingRow) => void;
}) {
  if (meetings.length === 0) return null;
  return (
    <section className="space-y-2">
      <div className="flex items-center gap-2 px-1">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{title}</h3>
        <span className="rounded-full bg-white/[0.06] px-2 py-0.5 text-[11px] tabular-nums text-muted-foreground">
          {meetings.length}
        </span>
      </div>
      <div className="space-y-2">
        {meetings.map((m) => (
          <MeetingCard key={m.id} meeting={m} onOpen={() => onOpen(m)} />
        ))}
      </div>
    </section>
  );
}

function MeetingCard({ meeting, onOpen }: { meeting: MeetingRow; onOpen: () => void }) {
  const confirmed = meeting.attendees.filter((a) => a.attendance_status === "confirmado").length;
  return (
    <button
      type="button"
      onClick={onOpen}
      className={cn(
        "flex w-full items-start gap-3 rounded-xl border border-border/60 bg-card/60 p-3 text-left backdrop-blur transition-colors hover:border-primary/40",
      )}
    >
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="truncate text-sm font-medium text-foreground">{meeting.title}</p>
          <StatusBadge variant={MEETING_STATUS_VARIANT[meeting.status]}>
            {MEETING_STATUS_LABEL[meeting.status]}
          </StatusBadge>
        </div>
        <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <CalendarClock className="h-3.5 w-3.5" /> {formatDateTime(meeting.starts_at)}
          </span>
          {meeting.location ? (
            <span className="inline-flex min-w-0 items-center gap-1">
              <MapPin className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">{meeting.location}</span>
            </span>
          ) : null}
          <span className="rounded-full bg-white/[0.06] px-2 py-0.5">{meeting.team?.name ?? "Todo el club"}</span>
          <span>
            {confirmed}/{meeting.attendees.length} confirmados
          </span>
        </div>
      </div>
      <AvatarStack people={meeting.attendees.map((a) => a.profile)} max={3} />
    </button>
  );
}

import * as React from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, CalendarDays, MapPin, Check, X as XIcon, AlertTriangle, MessagesSquare, ClipboardList } from "lucide-react";
import { PageHeader } from "@/components/squad/PageHeader";
import { ModuleTabs } from "@/components/squad/ModuleTabs";
import { EmptyState } from "@/components/squad/EmptyState";
import { LoadingState, CardGridSkeleton } from "@/components/squad/LoadingState";
import { StandardCard } from "@/components/squad/StandardCard";
import { StatusBadge, type StatusVariant } from "@/components/squad/StatusBadge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useApp } from "@/components/squad/AppLayout";
import { supabase } from "@/integrations/supabase/client";
import {
  useTasks, useMeetings, type TaskRow, type TaskStatus, type TaskPriority, type MeetingRow, type AttendanceStatus,
} from "@/hooks/useCoordinacion";
import { formatDateTime } from "@/lib/calendar-utils";
import { TaskFormDialog } from "@/components/coordinacion/TaskFormDialog";
import { MeetingFormDialog } from "@/components/coordinacion/MeetingFormDialog";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/m/coordinacion_interna")({
  head: () => ({
    meta: [
      { title: "Squad — Coordinación" },
      { name: "description", content: "Tareas y juntas del staff a nivel club." },
    ],
  }),
  component: CoordinacionPage,
});

const PRIORITY_LABEL: Record<TaskPriority, string> = { alta: "Alta", media: "Media", baja: "Baja" };
const PRIORITY_VARIANT: Record<TaskPriority, StatusVariant> = { alta: "rejected", media: "pending", baja: "info" };
const STATUS_LABEL: Record<TaskStatus, string> = {
  pendiente: "Pendiente",
  en_progreso: "En progreso",
  completada: "Completada",
};
const STATUS_ORDER: TaskStatus[] = ["pendiente", "en_progreso", "completada"];
const NEXT_STATUS: Record<TaskStatus, TaskStatus | null> = {
  pendiente: "en_progreso",
  en_progreso: "completada",
  completada: null,
};

type TaskFilter = "mias" | "todas" | "alta" | "media" | "baja";

function CoordinacionPage() {
  const { permissions, isSuperAdmin, user, accessibleModules, profile } = useApp();
  const clubId = profile?.club_id ?? null;
  const canEdit = isSuperAdmin || permissions.coordinacion_interna === "editor" || permissions.coordinacion_interna === "approver";
  const canAccess = isSuperAdmin || accessibleModules.includes("coordinacion_interna");

  const tasksQ = useTasks(clubId);
  const meetingsQ = useMeetings(clubId);

  const [taskDialog, setTaskDialog] = React.useState(false);
  const [editingTask, setEditingTask] = React.useState<TaskRow | null>(null);
  const [meetingDialog, setMeetingDialog] = React.useState(false);
  const [editingMeeting, setEditingMeeting] = React.useState<MeetingRow | null>(null);
  const [filter, setFilter] = React.useState<TaskFilter>("mias");
  const [tab, setTab] = React.useState<"tareas" | "juntas">("tareas");
  

  if (!canAccess) {
    return (
      <div className="space-y-6">
        <PageHeader hideTitle title="Coordinación" subtitle="Staff del club" />
        <EmptyState icon={MessagesSquare} title="Sin acceso" message="Tu rol actual no tiene permisos para este módulo." />
      </div>
    );
  }

  if (!clubId) return <LoadingState />;

  return (
    <div className="space-y-6">
      <ModuleTabs activeKey="coordinacion_interna" />
      <PageHeader
        hideTitle
        title="Coordinación"
        subtitle="Ámbito club · staff sin importar equipo"
        action={
          canEdit ? (
            <Button
              onClick={() => {
                if (tab === "tareas") { setEditingTask(null); setTaskDialog(true); }
                else { setEditingMeeting(null); setMeetingDialog(true); }
              }}
              className="glow-primary"
            >
              <Plus className="mr-2 h-4 w-4" /> {tab === "tareas" ? "Nueva tarea" : "Nueva junta"}
            </Button>
          ) : null
        }
      />



      <Tabs value={tab} onValueChange={(v) => setTab(v as any)} className="w-full">
        <TabsList>
          <TabsTrigger value="tareas">Tareas</TabsTrigger>
          <TabsTrigger value="juntas">Juntas</TabsTrigger>
        </TabsList>

        <TabsContent value="tareas" className="mt-4 space-y-4">
          <FilterChips filter={filter} setFilter={setFilter} />
          <TasksList
            tasks={tasksQ.data ?? []}
            isLoading={tasksQ.isLoading}
            userId={user.id}
            filter={filter}
            canEdit={canEdit}
            viewMode={viewMode}
            onEdit={(t) => { setEditingTask(t); setTaskDialog(true); }}
            onCreate={canEdit ? () => { setEditingTask(null); setTaskDialog(true); } : undefined}
            clubId={clubId}
          />
        </TabsContent>

        <TabsContent value="juntas" className="mt-4 space-y-4">
          <MeetingsList
            meetings={meetingsQ.data ?? []}
            isLoading={meetingsQ.isLoading}
            userId={user.id}
            canEdit={canEdit}
            viewMode={viewMode}
            onEdit={(m) => { setEditingMeeting(m); setMeetingDialog(true); }}
            onCreate={canEdit ? () => { setEditingMeeting(null); setMeetingDialog(true); } : undefined}
            clubId={clubId}
          />
        </TabsContent>
      </Tabs>

      {clubId ? (
        <>
          <TaskFormDialog
            open={taskDialog}
            onOpenChange={setTaskDialog}
            clubId={clubId}
            userId={user.id}
            task={editingTask}
            onSaved={({ isEdit, assigneeIds }) => {
              if (!isEdit && filter === "mias" && !assigneeIds.includes(user.id)) {
                setFilter("todas");
                toast.info("Mostrando todas las tareas para que veas la que acabas de crear");
              }
            }}
          />
          <MeetingFormDialog
            open={meetingDialog}
            onOpenChange={setMeetingDialog}
            clubId={clubId}
            userId={user.id}
            meeting={editingMeeting}
          />
        </>
      ) : null}
    </div>
  );
}

function FilterChips({ filter, setFilter }: { filter: TaskFilter; setFilter: (f: TaskFilter) => void }) {
  const chips: { key: TaskFilter; label: string }[] = [
    { key: "mias", label: "Mis tareas" },
    { key: "todas", label: "Todas" },
    { key: "alta", label: "Prioridad alta" },
    { key: "media", label: "Media" },
    { key: "baja", label: "Baja" },
  ];
  return (
    <div className="flex flex-wrap gap-2">
      {chips.map((c) => (
        <button
          key={c.key}
          type="button"
          onClick={() => setFilter(c.key)}
          className={cn(
            "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
            filter === c.key
              ? "border-primary bg-primary/10 text-primary"
              : "border-border/60 text-muted-foreground hover:bg-white/[0.04]",
          )}
        >
          {c.label}
        </button>
      ))}
    </div>
  );
}

function TasksList({
  tasks, isLoading, userId, filter, canEdit, viewMode, onEdit, onCreate, clubId,
}: {
  tasks: TaskRow[];
  isLoading: boolean;
  userId: string;
  filter: TaskFilter;
  canEdit: boolean;
  viewMode: ViewMode;
  onEdit: (t: TaskRow) => void;
  onCreate?: () => void;
  clubId: string;
}) {
  const filtered = React.useMemo(() => {
    return tasks.filter((t) => {
      if (filter === "mias") return t.assignees.some((a) => a.id === userId);
      if (filter === "alta" || filter === "media" || filter === "baja") return t.priority === filter;
      return true;
    });
  }, [tasks, filter, userId]);

  if (isLoading && tasks.length === 0) return <CardGridSkeleton variant={viewMode === "list" ? "list" : "grid"} count={4} />;
  if (filtered.length === 0) {
    return (
      <EmptyState
        icon={ClipboardList}
        title={filter === "mias" ? "Sin tareas asignadas" : "Sin tareas"}
        message={canEdit ? "Crea la primera tarea del staff." : "Aún no hay tareas registradas."}
        action={
          canEdit && onCreate ? (
            <Button onClick={onCreate}><Plus className="mr-2 h-4 w-4" /> Nueva tarea</Button>
          ) : undefined
        }
      />
    );
  }

  return (
    <div className="space-y-5">
      {STATUS_ORDER.map((status) => {
        const group = filtered.filter((t) => t.status === status);
        if (group.length === 0) return null;
        return (
          <section key={status} className="space-y-2">
            <h3 className="font-display text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              {STATUS_LABEL[status]} <span className="text-foreground/60">· {group.length}</span>
            </h3>
            <div className={cn(viewMode === "grid" ? "grid grid-cols-1 gap-3 sm:grid-cols-2" : "flex flex-col gap-2")}>
              {group.map((t, i) => (
                <div key={t.id} className="animate-card-in" style={{ animationDelay: `${i * 30}ms` }}>
                  <TaskCard task={t} userId={userId} canEdit={canEdit} onEdit={onEdit} clubId={clubId} />
                </div>
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}

function TaskCard({
  task, userId, canEdit, onEdit, clubId,
}: {
  task: TaskRow;
  userId: string;
  canEdit: boolean;
  onEdit: (t: TaskRow) => void;
  clubId: string;
}) {
  const qc = useQueryClient();
  const isMine = task.assignees.some((a) => a.id === userId);
  const overdue = !!task.due_at && task.status !== "completada" && new Date(task.due_at) < new Date();
  const next = NEXT_STATUS[task.status];

  const setStatus = useMutation({
    mutationFn: async (status: TaskStatus) => {
      const { error } = await supabase.from("tasks").update({ status }).eq("id", task.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["coord-tasks", clubId] });
      qc.invalidateQueries({ queryKey: ["home-my-tasks"] });
    },
    onError: (e: any) => toast.error(e.message ?? "No se pudo actualizar"),
  });

  const canChangeStatus = canEdit || isMine;
  const canOpen = canEdit;

  return (
    <StandardCard
      interactive={canOpen}
      onClick={canOpen ? () => onEdit(task) : undefined}
      title={task.title}
      subtitle={task.due_at ? `Vence ${formatDateTime(task.due_at)}` : "Sin fecha límite"}
      status={{ label: PRIORITY_LABEL[task.priority], variant: PRIORITY_VARIANT[task.priority] }}
      className={cn(overdue && "ring-1 ring-destructive/60")}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <AvatarStack people={task.assignees} />
          {overdue ? (
            <span className="inline-flex items-center gap-1 text-xs text-destructive">
              <AlertTriangle className="h-3.5 w-3.5" /> Vencida
            </span>
          ) : null}
        </div>
        {canChangeStatus && next ? (
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="h-7 px-2 text-xs"
            onClick={(e) => { e.stopPropagation(); setStatus.mutate(next); }}
            disabled={setStatus.isPending}
          >
            <Check className="mr-1 h-3.5 w-3.5" />
            {next === "en_progreso" ? "Iniciar" : "Completar"}
          </Button>
        ) : null}
      </div>
    </StandardCard>
  );
}

function AvatarStack({ people }: { people: { id: string; full_name: string | null; email: string | null }[] }) {
  if (people.length === 0) return <span className="text-xs text-muted-foreground">Sin asignados</span>;
  const shown = people.slice(0, 4);
  const extra = people.length - shown.length;
  return (
    <div className="flex -space-x-2">
      {shown.map((p) => {
        const label = (p.full_name ?? p.email ?? "?").slice(0, 1).toUpperCase();
        return (
          <span
            key={p.id}
            title={p.full_name ?? p.email ?? ""}
            className="flex h-7 w-7 items-center justify-center rounded-full border border-background bg-white/10 text-[11px] font-medium text-foreground"
          >
            {label}
          </span>
        );
      })}
      {extra > 0 ? (
        <span className="flex h-7 w-7 items-center justify-center rounded-full border border-background bg-white/5 text-[11px] font-medium text-muted-foreground">
          +{extra}
        </span>
      ) : null}
    </div>
  );
}

function MeetingsList({
  meetings, isLoading, userId, canEdit, viewMode, onEdit, onCreate, clubId,
}: {
  meetings: MeetingRow[];
  isLoading: boolean;
  userId: string;
  canEdit: boolean;
  viewMode: ViewMode;
  onEdit: (m: MeetingRow) => void;
  onCreate?: () => void;
  clubId: string;
}) {
  if (isLoading && meetings.length === 0) return <CardGridSkeleton variant={viewMode === "list" ? "list" : "grid"} count={3} />;
  if (meetings.length === 0) {
    return (
      <EmptyState
        icon={CalendarDays}
        title="Sin juntas"
        message={canEdit ? "Programa la primera junta del staff." : "Aún no hay juntas programadas."}
        action={
          canEdit && onCreate ? (
            <Button onClick={onCreate}><Plus className="mr-2 h-4 w-4" /> Nueva junta</Button>
          ) : undefined
        }
      />
    );
  }

  const now = Date.now();
  const upcoming = meetings.filter((m) => new Date(m.starts_at).getTime() >= now);
  const past = meetings.filter((m) => new Date(m.starts_at).getTime() < now).reverse();

  return (
    <div className="space-y-6">
      <Section title="Próximas" items={upcoming} userId={userId} canEdit={canEdit} viewMode={viewMode} onEdit={onEdit} clubId={clubId} />
      <Section title="Pasadas" items={past} userId={userId} canEdit={canEdit} viewMode={viewMode} onEdit={onEdit} clubId={clubId} isPast />
    </div>
  );
}

function Section({
  title, items, userId, canEdit, viewMode, onEdit, clubId, isPast,
}: {
  title: string;
  items: MeetingRow[];
  userId: string;
  canEdit: boolean;
  viewMode: ViewMode;
  onEdit: (m: MeetingRow) => void;
  clubId: string;
  isPast?: boolean;
}) {
  if (items.length === 0) return null;
  return (
    <section className="space-y-2">
      <h3 className="font-display text-sm font-semibold uppercase tracking-wider text-muted-foreground">
        {title} <span className="text-foreground/60">· {items.length}</span>
      </h3>
      <div className={cn(viewMode === "grid" ? "grid grid-cols-1 gap-3 sm:grid-cols-2" : "flex flex-col gap-2")}>
        {items.map((m, i) => (
          <div key={m.id} className="animate-card-in" style={{ animationDelay: `${i * 30}ms` }}>
            <MeetingCard meeting={m} userId={userId} canEdit={canEdit} onEdit={onEdit} clubId={clubId} isPast={!!isPast} />
          </div>
        ))}
      </div>
    </section>
  );
}

function MeetingCard({
  meeting, userId, canEdit, onEdit, clubId, isPast,
}: {
  meeting: MeetingRow;
  userId: string;
  canEdit: boolean;
  onEdit: (m: MeetingRow) => void;
  clubId: string;
  isPast: boolean;
}) {
  const qc = useQueryClient();
  const me = meeting.attendees.find((a) => a.user_id === userId);
  const canOpen = canEdit;

  const setStatus = useMutation({
    mutationFn: async (status: AttendanceStatus) => {
      const { error } = await supabase
        .from("meeting_attendees")
        .update({ attendance_status: status })
        .eq("meeting_id", meeting.id)
        .eq("user_id", userId);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["coord-meetings", clubId] }),
    onError: (e: any) => toast.error(e.message ?? "No se pudo actualizar"),
  });

  const confirmed = meeting.attendees.filter((a) => a.attendance_status === "confirmado").length;

  return (
    <StandardCard
      interactive={canOpen}
      onClick={canOpen ? () => onEdit(meeting) : undefined}
      icon={CalendarDays}
      title={meeting.title}
      subtitle={`${formatDateTime(meeting.starts_at)}${meeting.location ? ` · ${meeting.location}` : ""}`}
      status={
        isPast
          ? { label: meeting.notes ? "Con minuta" : "Pasada", variant: meeting.notes ? "approved" : "info" }
          : me
            ? {
                label:
                  me.attendance_status === "confirmado" ? "Confirmado"
                  : me.attendance_status === "rechazado" ? "Rechazado"
                  : "Invitado",
                variant:
                  me.attendance_status === "confirmado" ? "approved"
                  : me.attendance_status === "rechazado" ? "rejected"
                  : "pending",
              }
            : undefined
      }
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <AvatarStack people={meeting.attendees.map((a) => a.profile)} />
          <span className="text-xs text-muted-foreground">{confirmed}/{meeting.attendees.length} confirmados</span>
        </div>
        {!isPast && me ? (
          <div className="flex gap-1">
            <Button
              type="button" size="sm" variant="ghost"
              className={cn("h-7 px-2 text-xs", me.attendance_status === "confirmado" && "text-status-approved-foreground")}
              onClick={(e) => { e.stopPropagation(); setStatus.mutate("confirmado"); }}
              disabled={setStatus.isPending}
            >
              <Check className="mr-1 h-3.5 w-3.5" /> Confirmar
            </Button>
            <Button
              type="button" size="sm" variant="ghost"
              className={cn("h-7 px-2 text-xs", me.attendance_status === "rechazado" && "text-destructive")}
              onClick={(e) => { e.stopPropagation(); setStatus.mutate("rechazado"); }}
              disabled={setStatus.isPending}
            >
              <XIcon className="mr-1 h-3.5 w-3.5" /> Rechazar
            </Button>
          </div>
        ) : null}
      </div>
      {isPast && meeting.notes ? (
        <div className="mt-2 rounded-lg border border-border/60 bg-white/[0.02] p-3 text-sm text-foreground/80">
          <p className="whitespace-pre-wrap">{meeting.notes}</p>
        </div>
      ) : null}
      {meeting.agenda && !isPast ? (
        <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
          <MapPin className="mr-1 inline h-3 w-3" />
          {meeting.agenda}
        </p>
      ) : null}
    </StandardCard>
  );
}

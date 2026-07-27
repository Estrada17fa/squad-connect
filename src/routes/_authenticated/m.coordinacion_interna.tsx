import * as React from "react";
import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import { Plus, CalendarDays, AlertTriangle, MessagesSquare, ClipboardList } from "lucide-react";
import { PageHeader } from "@/components/squad/PageHeader";
import { ModuleTabs } from "@/components/squad/ModuleTabs";
import { EmptyState } from "@/components/squad/EmptyState";
import { LoadingState, CardGridSkeleton } from "@/components/squad/LoadingState";
import { StandardCard } from "@/components/squad/StandardCard";
import { StatusBadge, type StatusVariant } from "@/components/squad/StatusBadge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useApp } from "@/components/squad/AppLayout";
import {
  useTasks, useMeetings, type TaskRow, type TaskStatus, type TaskPriority, type MeetingRow, type MeetingStatus,
} from "@/hooks/useCoordinacion";
import { formatDateTime } from "@/lib/calendar-utils";
import { TaskFormDialog } from "@/components/coordinacion/TaskFormDialog";
import { MeetingFormDialog } from "@/components/coordinacion/MeetingFormDialog";
import { TaskDetailSheet } from "@/components/coordinacion/TaskDetailSheet";
import { MeetingDetailSheet } from "@/components/coordinacion/MeetingDetailSheet";
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
  en_pausa: "En pausa",
  completada: "Completada",
};
const STATUS_ORDER: TaskStatus[] = ["pendiente", "en_progreso", "en_pausa", "completada"];
const MEETING_STATUS_LABEL: Record<MeetingStatus, string> = {
  programada: "Programada",
  en_curso: "En curso",
  en_pausa: "En pausa",
  finalizada: "Finalizada",
  cancelada: "Cancelada",
};
const MEETING_STATUS_VARIANT: Record<MeetingStatus, StatusVariant> = {
  programada: "info",
  en_curso: "pending",
  en_pausa: "info",
  finalizada: "approved",
  cancelada: "rejected",
};

type ScopeFilter = "mias" | "todas";
type PriorityFilter = "all" | TaskPriority;

function CoordinacionPage() {
  const { permissions, isSuperAdmin, user, accessibleModules, profile } = useApp();
  const clubId = profile?.club_id ?? null;
  const canEdit = isSuperAdmin || permissions.coordinacion_interna === "editor" || permissions.coordinacion_interna === "approver";
  const canAccess = isSuperAdmin || accessibleModules.includes("coordinacion_interna");

  const tasksQ = useTasks(clubId);
  const meetingsQ = useMeetings(clubId);

  const [taskDialog, setTaskDialog] = React.useState(false);
  const [editingTask, setEditingTask] = React.useState<TaskRow | null>(null);
  const [detailTaskId, setDetailTaskId] = React.useState<string | null>(null);
  const [meetingDialog, setMeetingDialog] = React.useState(false);
  const [editingMeeting, setEditingMeeting] = React.useState<MeetingRow | null>(null);
  const [detailMeetingId, setDetailMeetingId] = React.useState<string | null>(null);
  const [scope, setScope] = React.useState<ScopeFilter>("mias");
  const [priority, setPriority] = React.useState<PriorityFilter>("all");
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

  const detailTask = detailTaskId ? (tasksQ.data ?? []).find((t) => t.id === detailTaskId) ?? null : null;
  const detailMeeting = detailMeetingId ? (meetingsQ.data ?? []).find((m) => m.id === detailMeetingId) ?? null : null;

  return (
    <div className="space-y-6">
      <ModuleTabs activeKey="coordinacion_interna" />
      <PageHeader hideTitle title="Coordinación" subtitle="Ámbito club · staff sin importar equipo" />

      <Tabs value={tab} onValueChange={(v) => setTab(v as any)} className="w-full">
        <TabsList>
          <TabsTrigger value="tareas">Tareas</TabsTrigger>
          <TabsTrigger value="juntas">Juntas</TabsTrigger>
        </TabsList>

        <TabsContent value="tareas" className="mt-4 space-y-4">
          {canEdit ? (
            <Button
              onClick={() => { setEditingTask(null); setTaskDialog(true); }}
              className="w-full glow-primary"
            >
              <Plus className="mr-2 h-4 w-4" /> Nueva tarea
            </Button>
          ) : null}

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <ScopeChips scope={scope} setScope={setScope} />
            <PriorityChips priority={priority} setPriority={setPriority} />
          </div>

          <TasksList
            tasks={tasksQ.data ?? []}
            isLoading={tasksQ.isLoading}
            userId={user.id}
            scope={scope}
            priority={priority}
            canEdit={canEdit}
            onOpen={(t) => setDetailTaskId(t.id)}
            onCreate={canEdit ? () => { setEditingTask(null); setTaskDialog(true); } : undefined}
          />
        </TabsContent>

        <TabsContent value="juntas" className="mt-4 space-y-4">
          {canEdit ? (
            <Button
              onClick={() => { setEditingMeeting(null); setMeetingDialog(true); }}
              className="w-full glow-primary"
            >
              <Plus className="mr-2 h-4 w-4" /> Nueva junta
            </Button>
          ) : null}

          <MeetingsList
            meetings={meetingsQ.data ?? []}
            isLoading={meetingsQ.isLoading}
            userId={user.id}
            canEdit={canEdit}
            onOpen={(m) => setDetailMeetingId(m.id)}
            onCreate={canEdit ? () => { setEditingMeeting(null); setMeetingDialog(true); } : undefined}
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
            onSaved={({ isEdit, assigneeIds, priority: p }) => {
              if (isEdit) return;
              const hiddenByMine = scope === "mias" && !assigneeIds.includes(user.id);
              const hiddenByPriority = priority !== "all" && priority !== p;
              if (hiddenByMine || hiddenByPriority) {
                if (hiddenByMine) setScope("todas");
                if (hiddenByPriority) setPriority("all");
                toast.info("Ajusté los filtros para que veas la tarea que acabas de crear");
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
          <TaskDetailSheet
            open={!!detailTask}
            onOpenChange={(o) => { if (!o) setDetailTaskId(null); }}
            task={detailTask}
            userId={user.id}
            clubId={clubId}
            canEdit={canEdit}
            onEdit={() => {
              if (!detailTask) return;
              setEditingTask(detailTask);
              setDetailTaskId(null);
              setTaskDialog(true);
            }}
          />
          <MeetingDetailSheet
            open={!!detailMeeting}
            onOpenChange={(o) => { if (!o) setDetailMeetingId(null); }}
            meeting={detailMeeting}
            userId={user.id}
            clubId={clubId}
            canEdit={canEdit}
            onEdit={() => {
              if (!detailMeeting) return;
              setEditingMeeting(detailMeeting);
              setDetailMeetingId(null);
              setMeetingDialog(true);
            }}
          />
        </>
      ) : null}
    </div>
  );
}

function ScopeChips({ scope, setScope }: { scope: ScopeFilter; setScope: (s: ScopeFilter) => void }) {
  const chips: { key: ScopeFilter; label: string }[] = [
    { key: "mias", label: "Mis tareas" },
    { key: "todas", label: "Todas" },
  ];
  return (
    <div className="flex gap-2">
      {chips.map((c) => (
        <button
          key={c.key}
          type="button"
          onClick={() => setScope(c.key)}
          className={cn(
            "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
            scope === c.key
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

function PriorityChips({ priority, setPriority }: { priority: PriorityFilter; setPriority: (p: PriorityFilter) => void }) {
  const chips: { key: PriorityFilter; label: string }[] = [
    { key: "all", label: "Todas las prioridades" },
    { key: "alta", label: "Alta" },
    { key: "media", label: "Media" },
    { key: "baja", label: "Baja" },
  ];
  return (
    <div className="flex flex-wrap gap-2">
      {chips.map((c) => (
        <button
          key={c.key}
          type="button"
          onClick={() => setPriority(c.key)}
          className={cn(
            "rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors",
            priority === c.key
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
  tasks, isLoading, userId, scope, priority, canEdit, onOpen, onCreate,
}: {
  tasks: TaskRow[];
  isLoading: boolean;
  userId: string;
  scope: ScopeFilter;
  priority: PriorityFilter;
  canEdit: boolean;
  onOpen: (t: TaskRow) => void;
  onCreate?: () => void;
}) {
  const filtered = React.useMemo(() => {
    return tasks.filter((t) => {
      if (scope === "mias" && !t.assignees.some((a) => a.id === userId)) return false;
      if (priority !== "all" && t.priority !== priority) return false;
      return true;
    });
  }, [tasks, scope, priority, userId]);

  if (isLoading && tasks.length === 0) return <CardGridSkeleton count={4} />;
  if (filtered.length === 0) {
    return (
      <EmptyState
        icon={ClipboardList}
        title={scope === "mias" ? "Sin tareas asignadas" : "Sin tareas"}
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
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {group.map((t, i) => (
                <div key={t.id} className="animate-card-in" style={{ animationDelay: `${i * 30}ms` }}>
                  <TaskCard task={t} onOpen={onOpen} />
                </div>
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}

function TaskCard({ task, onOpen }: { task: TaskRow; onOpen: (t: TaskRow) => void }) {
  const overdue = !!task.due_at && task.status !== "completada" && new Date(task.due_at) < new Date();
  return (
    <StandardCard
      interactive
      onClick={() => onOpen(task)}
      title={task.title}
      subtitle={task.due_at ? `Vence ${formatDateTime(task.due_at)}` : "Sin fecha límite"}
      status={{ label: PRIORITY_LABEL[task.priority], variant: PRIORITY_VARIANT[task.priority] }}
      className={cn(overdue && "ring-1 ring-destructive/60")}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <AvatarStack people={task.assignees} />
        {overdue ? (
          <span className="inline-flex items-center gap-1 text-xs text-destructive">
            <AlertTriangle className="h-3.5 w-3.5" /> Vencida
          </span>
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
  meetings, isLoading, userId, canEdit, onOpen, onCreate,
}: {
  meetings: MeetingRow[];
  isLoading: boolean;
  userId: string;
  canEdit: boolean;
  onOpen: (m: MeetingRow) => void;
  onCreate?: () => void;
}) {
  if (isLoading && meetings.length === 0) return <CardGridSkeleton count={3} />;
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
  const upcoming = meetings.filter((m) => new Date(m.starts_at).getTime() >= now && m.status !== "finalizada" && m.status !== "cancelada");
  const past = meetings.filter((m) => !(new Date(m.starts_at).getTime() >= now && m.status !== "finalizada" && m.status !== "cancelada")).reverse();

  return (
    <div className="space-y-6">
      <Section title="Próximas" items={upcoming} userId={userId} onOpen={onOpen} />
      <Section title="Pasadas" items={past} userId={userId} onOpen={onOpen} isPast />
    </div>
  );
}

function Section({
  title, items, userId, onOpen, isPast,
}: {
  title: string;
  items: MeetingRow[];
  userId: string;
  onOpen: (m: MeetingRow) => void;
  isPast?: boolean;
}) {
  if (items.length === 0) return null;
  return (
    <section className="space-y-2">
      <h3 className="font-display text-sm font-semibold uppercase tracking-wider text-muted-foreground">
        {title} <span className="text-foreground/60">· {items.length}</span>
      </h3>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {items.map((m, i) => (
          <div key={m.id} className="animate-card-in" style={{ animationDelay: `${i * 30}ms` }}>
            <MeetingCard meeting={m} userId={userId} onOpen={onOpen} isPast={!!isPast} />
          </div>
        ))}
      </div>
    </section>
  );
}

function MeetingCard({
  meeting, userId, onOpen, isPast,
}: {
  meeting: MeetingRow;
  userId: string;
  onOpen: (m: MeetingRow) => void;
  isPast: boolean;
}) {
  const me = meeting.attendees.find((a) => a.user_id === userId);
  const confirmed = meeting.attendees.filter((a) => a.attendance_status === "confirmado").length;

  const status = meeting.status && meeting.status !== "programada"
    ? { label: MEETING_STATUS_LABEL[meeting.status], variant: MEETING_STATUS_VARIANT[meeting.status] }
    : isPast
      ? { label: meeting.notes ? "Con minuta" : "Pasada", variant: (meeting.notes ? "approved" : "info") as StatusVariant }
      : me
        ? {
            label:
              me.attendance_status === "confirmado" ? "Confirmado"
              : me.attendance_status === "rechazado" ? "Rechazado"
              : "Invitado",
            variant: (
              me.attendance_status === "confirmado" ? "approved"
              : me.attendance_status === "rechazado" ? "rejected"
              : "pending"
            ) as StatusVariant,
          }
        : undefined;

  return (
    <StandardCard
      interactive
      onClick={() => onOpen(meeting)}
      icon={CalendarDays}
      title={meeting.title}
      subtitle={`${formatDateTime(meeting.starts_at)}${meeting.location ? ` · ${meeting.location}` : ""}`}
      status={status}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <AvatarStack people={meeting.attendees.map((a) => a.profile)} />
        <span className="text-xs text-muted-foreground">{confirmed}/{meeting.attendees.length} confirmados</span>
      </div>
    </StandardCard>
  );
}

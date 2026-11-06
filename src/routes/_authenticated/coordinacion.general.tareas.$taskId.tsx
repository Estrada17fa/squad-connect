import * as React from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { format, formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import { AlertTriangle, Camera, ChevronLeft, ImagePlus, MoreHorizontal, Send, X } from "lucide-react";
import { toast } from "sonner";
import { useApp } from "@/components/squad/AppLayout";
import { useTasks, type TaskStatus } from "@/hooks/useCoordinacion";
import { useTaskComments, useTaskMutations, type TaskComment } from "@/hooks/useTaskExtras";
import { supabase } from "@/integrations/supabase/client";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Segmented } from "@/components/coord/tareas/parts";
import { TaskFormSheet } from "@/components/coord/tareas/TaskFormSheet";
import { TaskChecklistEditor } from "@/components/coord/tareas/TaskChecklistEditor";
import { useTaskAccess } from "@/components/coord/tareas/useTaskAccess";
import { initialsOf, PRIORITY_LABEL } from "@/lib/coordinacion";
import { canCompleteTask, dueLabel } from "@/lib/tareas";
import { cn } from "@/lib/utils";
import { LocationCard } from "@/components/location/LocationCard";

export const Route = createFileRoute("/_authenticated/coordinacion/general/tareas/$taskId")({
  head: () => ({
    meta: [
      { title: "Tarea — Coordinación Squad" },
      { name: "description", content: "Ficha de la tarea: estado, checklist, evidencia y comentarios." },
      { property: "og:title", content: "Tarea — Coordinación Squad" },
      { property: "og:description", content: "Ficha de la tarea con checklist, evidencia y comentarios." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: TaskPage,
});

const STATUSES: { key: TaskStatus; label: string }[] = [
  { key: "pendiente", label: "Por hacer" },
  { key: "en_progreso", label: "En proceso" },
  { key: "en_pausa", label: "En pausa" },
  { key: "completada", label: "Hecha" },
];

function Avatar({ p, size = 8 }: { p: { full_name: string | null; email: string | null; avatar_url: string | null } | null; size?: 6 | 8 }) {
  return (
    <span className={cn("flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-muted font-semibold", size === 8 ? "h-8 w-8 text-[11px]" : "h-6 w-6 text-[9px]")}>
      {p?.avatar_url ? <img src={p.avatar_url} alt="" className="h-full w-full object-cover" /> : initialsOf(p?.full_name, p?.email)}
    </span>
  );
}

function TaskPage() {
  const { taskId } = Route.useParams();
  const navigate = useNavigate();
  const { profile } = useApp();
  const clubId = profile?.club_id ?? null;
  const tasksQ = useTasks(clubId);
  const task = (tasksQ.data ?? []).find((t) => t.id === taskId) ?? null;
  const { userId, categories, canCreate, canEdit, canAct } = useTaskAccess();
  const commentsQ = useTaskComments(task ? taskId : null);
  const m = useTaskMutations(clubId);

  const [editing, setEditing] = React.useState(false);
  const [confirmDelete, setConfirmDelete] = React.useState(false);
  const [blocked, setBlocked] = React.useState(false);
  const [viewer, setViewer] = React.useState<string | null>(null);
  const [creator, setCreator] = React.useState<string | null>(null);
  const [meetingTitle, setMeetingTitle] = React.useState<string | null>(null);
  const evidenceRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (!task?.created_by) return;
    supabase.from("profiles").select("full_name, email").eq("id", task.created_by).maybeSingle()
      .then(({ data }) => setCreator(data?.full_name ?? data?.email ?? null));
  }, [task?.created_by]);

  React.useEffect(() => {
    if (!task?.meeting_id) return setMeetingTitle(null);
    supabase.from("meetings").select("title").eq("id", task.meeting_id).maybeSingle()
      .then(({ data }) => setMeetingTitle(data?.title ?? null));
  }, [task?.meeting_id]);

  const back = (
    <Link to="/coordinacion/general/tareas" className="coord-press -ml-2 inline-flex min-h-11 items-center gap-0.5 rounded-xl px-2 text-sm font-semibold">
      <ChevronLeft className="h-5 w-5" /> Tareas
    </Link>
  );

  if (tasksQ.isLoading) return <div className="py-10 text-center text-sm text-muted-foreground">Cargando…</div>;
  if (!task) return <div className="mx-auto max-w-2xl space-y-4">{back}<p className="py-10 text-center text-sm text-muted-foreground">Esta tarea no existe o no tienes acceso.</p></div>;

  const editor = canEdit(task);
  const actor = canAct(task);
  const comments = commentsQ.data ?? [];
  const evidence = comments.filter((c) => c.is_evidence && c.image_url);

  function changeStatus(s: TaskStatus) {
    if (!task || s === task.status) return;
    if (s === "completada" && !canCompleteTask(task.requires_evidence, evidence.length)) {
      setBlocked(true);
      toast.error("Sube una foto para completar");
      return;
    }
    m.setStatus.mutate({ id: task.id, status: s }, { onError: (e: any) => toast.error(e.message) });
  }

  function onEvidence(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !task) return;
    m.addComment.mutate({ taskId: task.id, userId, body: "", file, isEvidence: true }, {
      onSuccess: () => { setBlocked(false); toast.success("Evidencia subida"); },
      onError: (err: any) => toast.error(err.message ?? "No se pudo subir"),
    });
  }

  async function duplicate() {
    if (!task || !clubId) return;
    const { data, error } = await supabase.from("tasks").insert({
      club_id: clubId, team_id: task.team_id, title: `${task.title} (copia)`, description: task.description,
      due_at: task.due_at, priority: task.priority, requires_evidence: task.requires_evidence, created_by: userId,
    }).select("id").single();
    if (error) return toast.error(error.message);
    if (task.assignees.length) await supabase.from("task_assignees").insert(task.assignees.map((a) => ({ task_id: data.id, user_id: a.id })));
    const { data: steps } = await supabase.from("task_checklist_items").select("content, order_index").eq("task_id", task.id);
    if (steps?.length) await supabase.from("task_checklist_items").insert(steps.map((s) => ({ ...s, task_id: data.id, created_by: userId })));
    m.refresh();
    toast.success("Tarea duplicada");
    navigate({ to: "/coordinacion/general/tareas/$taskId", params: { taskId: data.id } });
  }

  const rows: [string, React.ReactNode][] = [
    ["Responsables", task.assignees.length ? (
      <span className="flex flex-col items-end gap-1">
        {task.assignees.map((a) => <span key={a.id} className="inline-flex items-center gap-1.5"><Avatar p={a} size={6} />{a.full_name ?? a.email}</span>)}
      </span>
    ) : "Sin asignar"],
    ["Fecha límite", task.due_at ? `${format(new Date(task.due_at), "EEE d MMM, h:mm a", { locale: es })} · ${dueLabel(task.due_at)}` : "Sin fecha"],
    ["Prioridad", PRIORITY_LABEL[task.priority]],
    ["Categoría", task.team?.name ?? "Todo el club"],
    ["Pide foto al completar", task.requires_evidence ? "Sí" : "No"],
    ["Creada por", `${creator ?? "—"} · ${formatDistanceToNow(new Date(task.created_at), { locale: es, addSuffix: true })}`],
  ];

  return (
    <div className="coord-enter mx-auto max-w-2xl space-y-5 pb-28">
      <header className="sticky top-0 z-20 -mx-4 flex items-center justify-between bg-background/90 px-4 pb-1 pt-1 backdrop-blur">
        {back}
        {editor || canCreate ? (
          <DropdownMenu>
            <DropdownMenuTrigger aria-label="Más acciones" className="coord-press flex h-10 w-10 items-center justify-center rounded-xl"><MoreHorizontal className="h-5 w-5" /></DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {editor ? <DropdownMenuItem onSelect={() => setEditing(true)}>Editar</DropdownMenuItem> : null}
              {canCreate ? <DropdownMenuItem onSelect={duplicate}>Duplicar</DropdownMenuItem> : null}
              {editor ? <DropdownMenuItem className="text-destructive" onSelect={() => setConfirmDelete(true)}>Eliminar</DropdownMenuItem> : null}
            </DropdownMenuContent>
          </DropdownMenu>
        ) : null}
      </header>

      <h1 className="font-display text-2xl font-bold leading-tight">{task.title}</h1>

      <div className="space-y-2">
        <Segmented items={STATUSES} value={task.status} onChange={changeStatus} disabled={!actor || m.setStatus.isPending} />
        {blocked ? (
          <p className="flex items-center gap-2 rounded-xl bg-urgency-red-soft px-3 py-2 text-xs font-semibold text-urgency-red" role="alert">
            <AlertTriangle className="h-4 w-4" /> Sube una foto para completar
          </p>
        ) : null}
      </div>

      <dl className="divide-y divide-border/40 overflow-hidden rounded-[14px] bg-card text-sm">
        {rows.map(([k, v]) => (
          <div key={k} className="flex items-start justify-between gap-4 px-3 py-2.5">
            <dt className="shrink-0 text-muted-foreground">{k}</dt>
            <dd className="min-w-0 text-right">{v}</dd>
          </div>
        ))}
      </dl>

      {task.location_id ? <LocationCard locationId={task.location_id} /> : null}

      {task.meeting_id && meetingTitle ? (
        <Link to="/coordinacion/general/juntas/$meetingId" params={{ meetingId: task.meeting_id }} className="coord-press flex min-h-12 items-center justify-between gap-3 rounded-[14px] bg-card px-3 text-sm">
          <span className="min-w-0 truncate"><span className="text-muted-foreground">De la junta: </span>{meetingTitle}</span>
          <span aria-hidden className="text-muted-foreground">›</span>
        </Link>
      ) : null}

      {task.description ? (
        <section>
          <h2 className="mb-1.5 text-xs font-semibold text-muted-foreground">Descripción</h2>
          <p className="whitespace-pre-wrap rounded-[14px] bg-card px-3 py-2.5 text-sm">{task.description}</p>
        </section>
      ) : null}

      <TaskChecklistEditor taskId={task.id} clubId={clubId} canToggle={actor} canManage={editor} />

      {task.requires_evidence || evidence.length ? (
        <section>
          <div className="mb-1.5 flex items-center justify-between">
            <h2 className="text-xs font-semibold text-muted-foreground">Evidencia · {evidence.length}</h2>
            {actor ? (
              <button onClick={() => evidenceRef.current?.click()} disabled={m.addComment.isPending} className="coord-press inline-flex items-center gap-1 text-xs font-semibold text-area-general">
                <Camera className="h-3.5 w-3.5" /> {m.addComment.isPending ? "Subiendo…" : "Subir foto"}
              </button>
            ) : null}
          </div>
          <input ref={evidenceRef} type="file" accept="image/*" className="hidden" onChange={onEvidence} />
          {evidence.length ? (
            <div className="grid grid-cols-3 gap-2">
              {evidence.map((c) => (
                <button key={c.id} onClick={() => setViewer(c.image_url)} className="coord-press aspect-square overflow-hidden rounded-xl bg-card">
                  <img src={c.image_url!} alt="Evidencia" className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
          ) : (
            <p className="rounded-[14px] bg-card px-3 py-3 text-xs text-muted-foreground">Aún no hay fotos. Se necesita una para marcarla como hecha.</p>
          )}
        </section>
      ) : null}

      <Comments comments={comments} task={task} userId={userId} editor={editor} actor={actor} onOpenImage={setViewer} mutations={m} />

      <Dialog open={!!viewer} onOpenChange={(o) => !o && setViewer(null)}>
        <DialogContent className="max-w-3xl border-0 bg-background p-2">
          <DialogTitle className="sr-only">Foto</DialogTitle>
          {viewer ? <img src={viewer} alt="Foto" className="max-h-[80dvh] w-full rounded-xl object-contain" /> : null}
        </DialogContent>
      </Dialog>

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar esta tarea?</AlertDialogTitle>
            <AlertDialogDescription>Se borran también su checklist, comentarios y fotos. No se puede deshacer.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => m.deleteTask.mutate(task.id, {
              onSuccess: () => { toast.success("Tarea eliminada"); navigate({ to: "/coordinacion/general/tareas" }); },
              onError: (e: any) => toast.error(e.message ?? "No se pudo eliminar"),
            })}>Eliminar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {clubId ? <TaskFormSheet open={editing} onOpenChange={setEditing} clubId={clubId} userId={userId} categories={categories.length ? categories : [{ id: task.team_id, name: task.team?.name ?? "Todo el club" }]} task={task} /> : null}
    </div>
  );
}

function Comments({
  comments, task, userId, editor, actor, onOpenImage, mutations: m,
}: {
  comments: TaskComment[];
  task: { id: string; requires_evidence: boolean };
  userId: string;
  editor: boolean;
  actor: boolean;
  onOpenImage: (url: string) => void;
  mutations: ReturnType<typeof useTaskMutations>;
}) {
  const [body, setBody] = React.useState("");
  const [file, setFile] = React.useState<File | null>(null);
  const [asEvidence, setAsEvidence] = React.useState(true);
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [editBody, setEditBody] = React.useState("");
  const fileRef = React.useRef<HTMLInputElement>(null);
  const preview = React.useMemo(() => (file ? URL.createObjectURL(file) : null), [file]);

  function send() {
    if (!body.trim() && !file) return;
    m.addComment.mutate(
      { taskId: task.id, userId, body, file, isEvidence: !!file && task.requires_evidence && asEvidence },
      { onSuccess: () => { setBody(""); setFile(null); }, onError: (e: any) => toast.error(e.message ?? "No se pudo comentar") },
    );
  }

  return (
    <section>
      <h2 className="mb-1.5 text-xs font-semibold text-muted-foreground">Comentarios · {comments.length}</h2>
      <ul className="space-y-3">
        {comments.map((c) => {
          const mine = c.user_id === userId;
          return (
            <li key={c.id} className="flex gap-2.5">
              <Avatar p={c.author} />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 text-xs">
                  <span className="truncate font-semibold">{c.author?.full_name ?? c.author?.email ?? "Miembro"}</span>
                  <span className="shrink-0 text-muted-foreground">{format(new Date(c.created_at), "d MMM, h:mm a", { locale: es })}{c.edited_at ? " · editado" : ""}</span>
                  {c.is_evidence ? <span className="shrink-0 rounded-full bg-area-general-soft px-2 py-0.5 text-[10px] font-bold text-area-general">Evidencia</span> : null}
                  {mine || editor ? (
                    <DropdownMenu>
                      <DropdownMenuTrigger aria-label="Opciones del comentario" className="ml-auto p-1 text-muted-foreground"><MoreHorizontal className="h-4 w-4" /></DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {mine ? <DropdownMenuItem onSelect={() => { setEditingId(c.id); setEditBody(c.body); }}>Editar</DropdownMenuItem> : null}
                        <DropdownMenuItem className="text-destructive" onSelect={() => m.deleteComment.mutate(c, { onError: (e: any) => toast.error(e.message) })}>Eliminar</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  ) : null}
                </div>
                {editingId === c.id ? (
                  <div className="mt-1 space-y-1.5">
                    <Textarea value={editBody} onChange={(e) => setEditBody(e.target.value)} rows={2} className="rounded-xl" />
                    <div className="flex gap-2 text-xs font-semibold">
                      <button onClick={() => m.editComment.mutate({ id: c.id, taskId: task.id, body: editBody }, { onSuccess: () => setEditingId(null), onError: (e: any) => toast.error(e.message) })} className="text-area-general">Guardar</button>
                      <button onClick={() => setEditingId(null)} className="text-muted-foreground">Cancelar</button>
                    </div>
                  </div>
                ) : c.body ? <p className="mt-0.5 whitespace-pre-wrap text-sm">{c.body}</p> : null}
                {c.image_url ? (
                  <button onClick={() => onOpenImage(c.image_url!)} className="coord-press mt-1.5 block overflow-hidden rounded-xl">
                    <img src={c.image_url} alt="Foto del comentario" className="max-h-48 w-auto object-cover" />
                  </button>
                ) : null}
              </div>
            </li>
          );
        })}
        {comments.length === 0 ? <li className="text-xs text-muted-foreground">Sin comentarios todavía.</li> : null}
      </ul>

      {actor ? (
        <div className="fixed inset-x-0 bottom-16 z-30 border-t border-border/50 bg-background/95 px-4 py-2 backdrop-blur md:static md:mt-4 md:border-0 md:px-0">
          <div className="mx-auto max-w-2xl space-y-2">
            {preview ? (
              <div className="flex items-center gap-2">
                <span className="relative">
                  <img src={preview} alt="Foto a enviar" className="h-14 w-14 rounded-lg object-cover" />
                  <button aria-label="Quitar foto" onClick={() => setFile(null)} className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-muted"><X className="h-3 w-3" /></button>
                </span>
                {task.requires_evidence ? (
                  <label className="flex items-center gap-1.5 text-xs">
                    <input type="checkbox" checked={asEvidence} onChange={(e) => setAsEvidence(e.target.checked)} /> Es evidencia
                  </label>
                ) : null}
              </div>
            ) : null}
            <div className="flex items-end gap-2">
              <button aria-label="Adjuntar foto" onClick={() => fileRef.current?.click()} className="coord-press flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-muted"><ImagePlus className="h-5 w-5" /></button>
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => { setFile(e.target.files?.[0] ?? null); e.target.value = ""; }} />
              <Textarea value={body} onChange={(e) => setBody(e.target.value)} placeholder="Escribe un comentario…" rows={1} className="min-h-10 flex-1 resize-none rounded-xl" />
              <button aria-label="Enviar comentario" onClick={send} disabled={m.addComment.isPending || (!body.trim() && !file)} className="coord-press flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-area-general text-background disabled:opacity-50"><Send className="h-4 w-4" /></button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}

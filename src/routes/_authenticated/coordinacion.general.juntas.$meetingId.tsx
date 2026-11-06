import * as React from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Check, ChevronLeft, MoreHorizontal, Play, Plus, Square } from "lucide-react";
import { toast } from "sonner";
import { useApp } from "@/components/squad/AppLayout";
import { supabase } from "@/integrations/supabase/client";
import { useMeetings, useTasks, type MeetingRow, type TaskRow } from "@/hooks/useCoordinacion";
import { useTaskAccess } from "@/components/coord/tareas/useTaskAccess";
import { StaffPicker } from "@/components/coord/tareas/TaskFormSheet";
import { LocationCard } from "@/components/location/LocationCard";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { groupByResponse, parseAgenda, serializeAgenda, timeRange, type AgendaItem } from "@/lib/juntas";
import { initialsOf, STATUS_LABEL } from "@/lib/coordinacion";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/coordinacion/general/juntas/$meetingId")({
  head: () => ({
    meta: [
      { title: "Junta — Coordinación Squad" },
      { name: "description", content: "Ficha de la junta: invitados, orden del día, minuta y acuerdos." },
      { property: "og:title", content: "Junta — Coordinación Squad" },
      { property: "og:description", content: "Invitados, orden del día, minuta y acuerdos de la junta." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: MeetingPage,
});

type Person = { id: string; full_name: string | null; email: string | null; avatar_url: string | null };
function Avatar({ p, className }: { p: Person | null | undefined; className?: string }) {
  return (
    <span className={cn("flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-muted text-[11px] font-semibold", className)}>
      {p?.avatar_url ? <img src={p.avatar_url} alt="" className="h-full w-full object-cover" /> : initialsOf(p?.full_name, p?.email)}
    </span>
  );
}
const H2 = ({ children }: { children: React.ReactNode }) => <h2 className="mb-1.5 text-xs font-semibold text-muted-foreground">{children}</h2>;
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

function MeetingPage() {
  const { meetingId } = Route.useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { profile } = useApp();
  const clubId = profile?.club_id ?? null;
  const meetingsQ = useMeetings(clubId);
  const tasksQ = useTasks(clubId);
  const { userId, canEdit } = useTaskAccess();
  const m = (meetingsQ.data ?? []).find((x) => x.id === meetingId) ?? null;
  const [creator, setCreator] = React.useState<string | null>(null);
  const [confirm, setConfirm] = React.useState<null | "delete" | "cancel" | "finish">(null);

  React.useEffect(() => {
    if (!m?.created_by) return;
    supabase.from("profiles").select("full_name, email").eq("id", m.created_by).maybeSingle()
      .then(({ data }) => setCreator(data?.full_name ?? data?.email ?? null));
  }, [m?.created_by]);

  const back = (
    <Link to="/coordinacion/general/tareas" search={{ tab: "juntas" }} className="coord-press -ml-2 inline-flex min-h-11 items-center gap-0.5 rounded-xl px-2 text-sm font-semibold">
      <ChevronLeft className="h-5 w-5" /> Juntas
    </Link>
  );
  if (meetingsQ.isLoading) return <div className="py-10 text-center text-sm text-muted-foreground">Cargando…</div>;
  if (!m) return <div className="mx-auto max-w-2xl">{back}<p className="py-10 text-center text-sm text-muted-foreground">Esta junta no existe o no tienes acceso.</p></div>;

  const editor = canEdit(m);
  const live = m.status === "en_curso" || m.status === "en_pausa";
  const done = m.status === "finalizada";
  const cancelled = m.status === "cancelada";
  const me = m.attendees.find((a) => a.user_id === userId);
  const agreements = (tasksQ.data ?? []).filter((t) => t.meeting_id === m.id);
  const refresh = () => { qc.invalidateQueries({ queryKey: ["coord-meetings", clubId] }); qc.invalidateQueries({ queryKey: ["calendar-events"] }); };

  async function update(patch: Record<string, unknown>, ok?: string) {
    const { error } = await supabase.from("meetings").update(patch as any).eq("id", m!.id);
    if (error) return toast.error(error.message);
    if (ok) toast.success(ok);
    refresh();
  }
  async function respond(status: "confirmado" | "rechazado") {
    const { error } = await supabase.from("meeting_attendees").update({ attendance_status: status }).eq("meeting_id", m!.id).eq("user_id", userId);
    if (error) return toast.error(error.message);
    toast.success(status === "confirmado" ? "Confirmaste tu asistencia" : "Avisaste que no asistirás");
    refresh();
  }
  async function remove() {
    const { error } = await supabase.from("meetings").delete().eq("id", m!.id);
    if (error) return toast.error(error.message);
    toast.success("Junta eliminada");
    refresh();
    navigate({ to: "/coordinacion/general/tareas", search: { tab: "juntas" } });
  }
  function runConfirm() {
    const c = confirm; setConfirm(null);
    if (c === "delete") remove();
    if (c === "cancel") update({ status: "cancelada" }, "Junta cancelada");
    if (c === "finish") update({ status: "finalizada", ended_at_actual: new Date().toISOString() }, "Junta finalizada · Se envió el resumen");
  }

  const groups = groupByResponse(m.attendees);
  const start = new Date(m.starts_at);

  return (
    <div className="coord-enter mx-auto max-w-2xl space-y-5 pb-28">
      <header className="sticky top-0 z-20 -mx-4 flex items-center justify-between bg-background/90 px-4 pb-1 pt-1 backdrop-blur">
        {back}
        {editor ? (
          <DropdownMenu>
            <DropdownMenuTrigger aria-label="Más acciones" className="coord-press flex h-10 w-10 items-center justify-center rounded-xl"><MoreHorizontal className="h-5 w-5" /></DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onSelect={() => navigate({ to: "/coordinacion/general/juntas/$meetingId/editar", params: { meetingId: m.id } })}>Editar</DropdownMenuItem>
              {!done && !cancelled ? <DropdownMenuItem onSelect={() => setConfirm("cancel")}>Cancelar junta</DropdownMenuItem> : null}
              <DropdownMenuItem className="text-destructive" onSelect={() => setConfirm("delete")}>Eliminar</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : null}
      </header>

      <div className="space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          {live ? <span className="rounded-full bg-area-general px-2.5 py-0.5 text-[11px] font-bold text-background">En curso</span> : null}
          {done ? <span className="rounded-full bg-muted px-2.5 py-0.5 text-[11px] font-bold">Finalizada</span> : null}
          {cancelled ? <span className="rounded-full bg-urgency-red-soft px-2.5 py-0.5 text-[11px] font-bold text-urgency-red">Cancelada</span> : null}
        </div>
        <h1 className="font-display text-2xl font-bold leading-tight">{m.title}</h1>
        <p className="text-sm text-muted-foreground">{cap(format(start, "EEEE d 'de' MMMM", { locale: es }))} · {timeRange(m.starts_at, m.ends_at)}</p>
      </div>

      {editor && m.status === "programada" ? (
        <button onClick={() => update({ status: "en_curso", started_at: new Date().toISOString() }, "Junta iniciada")} className="coord-press flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-area-general text-sm font-bold text-background">
          <Play className="h-4 w-4" /> Iniciar junta
        </button>
      ) : null}

      {me && !done && !cancelled ? (
        <div className="space-y-1.5">
          <H2>Tu respuesta</H2>
          <div className="grid grid-cols-2 gap-2">
            {(["confirmado", "rechazado"] as const).map((s) => (
              <button key={s} onClick={() => respond(s)} aria-pressed={me.attendance_status === s}
                className={cn("coord-press min-h-11 rounded-xl text-sm font-semibold", me.attendance_status === s ? (s === "confirmado" ? "bg-area-general text-background" : "bg-urgency-red-soft text-urgency-red") : "bg-card")}>
                {s === "confirmado" ? "Asistiré" : "No asistiré"}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {live && editor ? (
        <WorkMode m={m} clubId={clubId!} userId={userId} agreements={agreements} onUpdate={update} onFinish={() => setConfirm("finish")} />
      ) : (
        <>
          {m.location_id ? <LocationCard locationId={m.location_id} /> : m.location ? <p className="rounded-[14px] bg-card px-3 py-2.5 text-sm">{m.location}</p> : null}
          <dl className="divide-y divide-border/40 overflow-hidden rounded-[14px] bg-card text-sm">
            <div className="flex justify-between gap-4 px-3 py-2.5"><dt className="text-muted-foreground">Categoría</dt><dd>{m.team?.name ?? "Todo el club"}</dd></div>
            <div className="flex justify-between gap-4 px-3 py-2.5"><dt className="text-muted-foreground">Creada por</dt><dd className="truncate">{creator ?? "—"}</dd></div>
            {done && m.started_at ? <div className="flex justify-between gap-4 px-3 py-2.5"><dt className="text-muted-foreground">Duró</dt><dd>{timeRange(m.started_at, m.ended_at_actual)}</dd></div> : null}
          </dl>

          {done ? (
            <section>
              <H2>Asistieron · {m.attendees.filter((a) => a.attended).length} de {m.attendees.length}</H2>
              <ul className="divide-y divide-border/40 overflow-hidden rounded-[14px] bg-card">
                {m.attendees.map((a) => (
                  <li key={a.user_id} className="flex items-center gap-2.5 px-3 py-2 text-sm">
                    <Avatar p={a.profile} /><span className="min-w-0 flex-1 truncate">{a.profile?.full_name ?? a.profile?.email}</span>
                    <span className={cn("text-xs font-semibold", a.attended ? "text-area-general" : "text-muted-foreground")}>{a.attended === true ? "Asistió" : a.attended === false ? "No asistió" : "Sin registrar"}</span>
                  </li>
                ))}
              </ul>
            </section>
          ) : (
            <section className="space-y-3">
              {([["Asistirá", groups.yes], ["No asistirá", groups.no], ["Sin responder", groups.pending]] as const).map(([label, list]) => list.length ? (
                <div key={label}>
                  <H2>{label} · {list.length}</H2>
                  <ul className="divide-y divide-border/40 overflow-hidden rounded-[14px] bg-card">
                    {list.map((a) => (
                      <li key={a.user_id} className="flex items-center gap-2.5 px-3 py-2 text-sm"><Avatar p={a.profile} /><span className="truncate">{a.profile?.full_name ?? a.profile?.email}</span></li>
                    ))}
                  </ul>
                </div>
              ) : null)}
              {m.attendees.length === 0 ? <p className="text-xs text-muted-foreground">Sin invitados.</p> : null}
            </section>
          )}

          <AgendaList items={parseAgenda(m.agenda)} />

          {done ? (
            <section>
              <H2>Minuta</H2>
              <p className="whitespace-pre-wrap rounded-[14px] bg-card px-3 py-2.5 text-sm">{m.notes || "Sin minuta."}</p>
            </section>
          ) : null}

          <Agreements list={agreements} />
        </>
      )}

      <AlertDialog open={!!confirm} onOpenChange={(o) => !o && setConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{confirm === "delete" ? "¿Eliminar esta junta?" : confirm === "cancel" ? "¿Cancelar esta junta?" : "¿Finalizar la junta?"}</AlertDialogTitle>
            <AlertDialogDescription>
              {confirm === "delete" ? "Se quita también de la Agenda. Los acuerdos quedan como tareas normales. No se puede deshacer."
                : confirm === "cancel" ? "Se avisará a los invitados."
                : "Se guardará la hora de fin y los invitados recibirán el resumen."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Volver</AlertDialogCancel>
            <AlertDialogAction onClick={runConfirm}>{confirm === "delete" ? "Eliminar" : confirm === "cancel" ? "Cancelar junta" : "Finalizar"}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function AgendaList({ items, onToggle }: { items: AgendaItem[]; onToggle?: (i: number) => void }) {
  return (
    <section>
      <H2>Orden del día{items.length ? ` · ${items.filter((i) => i.done).length}/${items.length}` : ""}</H2>
      {items.length ? (
        <ol className="divide-y divide-border/40 overflow-hidden rounded-[14px] bg-card">
          {items.map((it, i) => (
            <li key={i}>
              <button type="button" disabled={!onToggle} onClick={() => onToggle?.(i)} aria-pressed={it.done}
                className="coord-press flex w-full items-center gap-2.5 px-3 py-2.5 text-left text-sm disabled:cursor-default">
                <span className={cn("flex h-5 w-5 shrink-0 items-center justify-center rounded-md border", it.done ? "border-area-general bg-area-general text-background" : "border-muted-foreground/50")}>
                  {it.done ? <Check className="h-3 w-3" strokeWidth={3} /> : null}
                </span>
                <span className={cn("flex-1", it.done && "text-muted-foreground line-through")}>{it.text}</span>
              </button>
            </li>
          ))}
        </ol>
      ) : <p className="rounded-[14px] bg-card px-3 py-2.5 text-xs text-muted-foreground">Sin puntos.</p>}
    </section>
  );
}

function Agreements({ list, onAdd }: { list: TaskRow[]; onAdd?: () => void }) {
  return (
    <section>
      <div className="mb-1.5 flex items-center justify-between">
        <h2 className="text-xs font-semibold text-muted-foreground">Acuerdos · {list.length}</h2>
        {onAdd ? <button onClick={onAdd} className="coord-press inline-flex min-h-9 items-center gap-1 text-xs font-semibold text-area-general"><Plus className="h-3.5 w-3.5" /> Acuerdo</button> : null}
      </div>
      {list.length ? (
        <ul className="divide-y divide-border/40 overflow-hidden rounded-[14px] bg-card">
          {list.map((t) => (
            <li key={t.id}>
              <Link to="/coordinacion/general/tareas/$taskId" params={{ taskId: t.id }} className="coord-press flex items-center gap-2.5 px-3 py-2.5">
                <span className="min-w-0 flex-1">
                  <span className={cn("block truncate text-sm font-medium", t.status === "completada" && "text-muted-foreground line-through")}>{t.title}</span>
                  <span className="block truncate text-[11px] text-muted-foreground">
                    {STATUS_LABEL[t.status]} · {t.assignees.map((a) => (a.full_name ?? a.email ?? "").split(" ")[0]).join(", ") || "Sin responsable"}
                    {t.checklist_total ? ` · ${t.checklist_done}/${t.checklist_total}` : ""}
                    {t.due_at ? ` · ${format(new Date(t.due_at), "d MMM", { locale: es })}` : ""}
                  </span>
                </span>
                <span aria-hidden className="text-muted-foreground">›</span>
              </Link>
            </li>
          ))}
        </ul>
      ) : <p className="rounded-[14px] bg-card px-3 py-2.5 text-xs text-muted-foreground">Aún no hay acuerdos.</p>}
    </section>
  );
}

function WorkMode({ m, clubId, userId, agreements, onUpdate, onFinish }: {
  m: MeetingRow; clubId: string; userId: string; agreements: TaskRow[];
  onUpdate: (patch: Record<string, unknown>) => Promise<unknown>; onFinish: () => void;
}) {
  const qc = useQueryClient();
  const [items, setItems] = React.useState<AgendaItem[]>(() => parseAgenda(m.agenda));
  const [notes, setNotes] = React.useState(m.notes ?? "");
  const [saved, setSaved] = React.useState<"idle" | "saving" | "saved">("idle");
  const [adding, setAdding] = React.useState(false);
  const first = React.useRef(true);

  React.useEffect(() => {
    if (first.current) { first.current = false; return; }
    setSaved("saving");
    const t = setTimeout(async () => {
      const { error } = await supabase.from("meetings").update({ notes: notes.trim() || null }).eq("id", m.id);
      setSaved(error ? "idle" : "saved");
      if (error) toast.error("No se pudo guardar la minuta");
    }, 800);
    return () => clearTimeout(t);
  }, [notes, m.id]);

  function toggle(i: number) {
    const next = items.map((it, j) => (j === i ? { ...it, done: !it.done } : it));
    setItems(next);
    onUpdate({ agenda: serializeAgenda(next) });
  }
  async function mark(uid: string, current: boolean | null) {
    const next = current === true ? false : true;
    const { error } = await supabase.from("meeting_attendees").update({ attended: next } as any).eq("meeting_id", m.id).eq("user_id", uid);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["coord-meetings", clubId] });
  }

  return (
    <div className="space-y-5">
      <AgendaList items={items} onToggle={toggle} />

      <section>
        <div className="mb-1.5 flex items-center justify-between">
          <h2 className="text-xs font-semibold text-muted-foreground">Minuta</h2>
          <span className="text-[11px] text-muted-foreground">{saved === "saving" ? "Guardando…" : saved === "saved" ? "Guardado" : ""}</span>
        </div>
        <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={6} placeholder="Escribe lo que se va tratando…" aria-label="Minuta" className="rounded-[14px] bg-card" />
      </section>

      <section>
        <H2>Asistencia · {m.attendees.filter((a) => a.attended).length} de {m.attendees.length}</H2>
        <ul className="divide-y divide-border/40 overflow-hidden rounded-[14px] bg-card">
          {m.attendees.map((a) => (
            <li key={a.user_id}>
              <button onClick={() => mark(a.user_id, a.attended)} className="coord-press flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm">
                <Avatar p={a.profile} /><span className="min-w-0 flex-1 truncate">{a.profile?.full_name ?? a.profile?.email}</span>
                <span className={cn("rounded-full px-2.5 py-1 text-[11px] font-bold", a.attended === true ? "bg-area-general text-background" : a.attended === false ? "bg-urgency-red-soft text-urgency-red" : "bg-muted text-muted-foreground")}>
                  {a.attended === true ? "Asistió" : a.attended === false ? "No asistió" : "Marcar"}
                </span>
              </button>
            </li>
          ))}
        </ul>
      </section>

      <Agreements list={agreements} onAdd={() => setAdding(true)} />

      <div className="fixed inset-x-0 bottom-16 z-30 border-t border-border/50 bg-background/95 px-4 py-2 backdrop-blur md:bottom-0">
        <div className="mx-auto max-w-2xl">
          <button onClick={onFinish} className="coord-press flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-foreground text-sm font-bold text-background">
            <Square className="h-4 w-4" /> Finalizar junta
          </button>
        </div>
      </div>

      <AgreementSheet open={adding} onOpenChange={setAdding} m={m} clubId={clubId} userId={userId} />
    </div>
  );
}

function AgreementSheet({ open, onOpenChange, m, clubId, userId }: { open: boolean; onOpenChange: (o: boolean) => void; m: MeetingRow; clubId: string; userId: string }) {
  const qc = useQueryClient();
  const [title, setTitle] = React.useState("");
  const [owner, setOwner] = React.useState<string[]>([]);
  const [due, setDue] = React.useState("");
  const [saving, setSaving] = React.useState(false);
  React.useEffect(() => { if (open) { setTitle(""); setOwner([]); setDue(""); } }, [open]);

  async function save() {
    if (!title.trim()) return toast.error("Escribe el acuerdo");
    if (!owner.length) return toast.error("Elige un responsable");
    setSaving(true);
    try {
      const [y, mo, d] = due ? due.split("-").map(Number) : [];
      const { data, error } = await supabase.from("tasks").insert({
        club_id: clubId, team_id: m.team_id, title: title.trim(), meeting_id: m.id, created_by: userId,
        due_at: due ? new Date(y, mo - 1, d, 18, 0).toISOString() : null,
      }).select("id").single();
      if (error) throw error;
      const { error: aErr } = await supabase.from("task_assignees").insert({ task_id: data.id, user_id: owner[0] });
      if (aErr) throw aErr;
      toast.success("Acuerdo creado como tarea");
      qc.invalidateQueries({ queryKey: ["coord-tasks", clubId] });
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e.message ?? "No se pudo crear");
    } finally { setSaving(false); }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="max-h-[92dvh] overflow-y-auto rounded-t-[22px] border-0 bg-background px-4 pb-6 pt-4">
        <SheetHeader className="mb-3 text-left"><SheetTitle className="font-display">Nuevo acuerdo</SheetTitle></SheetHeader>
        <div className="space-y-4">
          <Input autoFocus value={title} onChange={(e) => setTitle(e.target.value)} placeholder="¿Qué se acordó?" aria-label="Acuerdo" className="h-12 rounded-xl text-base" />
          <div className="space-y-2">
            <p className="text-xs font-semibold text-muted-foreground">Responsable</p>
            <StaffPicker clubId={clubId} value={owner} onChange={(ids) => setOwner(ids.filter((x) => !owner.includes(x)).slice(-1))} />
          </div>
          <div className="space-y-2">
            <p className="text-xs font-semibold text-muted-foreground">Fecha límite</p>
            <input type="date" aria-label="Fecha límite" value={due} onChange={(e) => setDue(e.target.value)} className="h-11 w-full rounded-xl bg-card px-3 text-sm outline-none" />
          </div>
          <p className="text-[11px] text-muted-foreground">Se crea como tarea en {m.team?.name ?? "Todo el club"}, ligada a esta junta.</p>
          <button disabled={saving} onClick={save} className="coord-press flex min-h-12 w-full items-center justify-center rounded-xl bg-area-general text-sm font-bold text-background disabled:opacity-60">
            {saving ? "Guardando…" : "Crear acuerdo"}
          </button>
        </div>
      </SheetContent>
    </Sheet>
  );
}

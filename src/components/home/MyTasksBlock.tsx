import { Link } from "@tanstack/react-router";
import { useTasks } from "@/hooks/useCoordinacion";
import { isMine, sortTasks } from "@/lib/tareas";
import { TaskListRow } from "@/components/coord/tareas/parts";

/** Inicio › Mis pendientes: mis tareas no hechas, con el círculo para completarlas. */
export function MyTasksBlock({ clubId, userId }: { clubId: string | null; userId: string }) {
  const tasksQ = useTasks(clubId);
  const mine = sortTasks((tasksQ.data ?? []).filter((t) => t.status !== "completada" && isMine(t, userId)));
  if (!mine.length) return null;
  return (
    <section>
      <div className="mb-1.5 flex items-center justify-between">
        <h2 className="text-xs font-semibold text-muted-foreground">Mis pendientes · {mine.length}</h2>
        <Link to="/coordinacion/general/tareas" className="text-xs font-semibold text-primary">Ver todas</Link>
      </div>
      <ul className="divide-y divide-border/40 overflow-hidden rounded-[14px] bg-card">
        {mine.slice(0, 4).map((t) => <TaskListRow key={t.id} task={t} userId={userId} clubId={clubId} canAct />)}
      </ul>
    </section>
  );
}

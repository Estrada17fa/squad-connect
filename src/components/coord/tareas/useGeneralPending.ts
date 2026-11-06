import * as React from "react";
import { ListChecks } from "lucide-react";
import { useApp } from "@/components/squad/AppLayout";
import { useTasks } from "@/hooks/useCoordinacion";
import { AREA_PENDING, type MockPending } from "@/lib/coordMockData";
import type { AreaKey } from "@/lib/coordAreas";
import { myTasksSummary } from "@/lib/tareas";

/** Pendientes del área con la fila "Tareas" (General) calculada con datos reales. */
export function useAreaPending(areaKey: AreaKey) {
  const { profile, user } = useApp();
  const tasksQ = useTasks(areaKey === "general" ? (profile?.club_id ?? null) : null);
  return React.useMemo(() => {
    const base = AREA_PENDING[areaKey];
    if (areaKey !== "general") return { items: base, tasksBadge: undefined as number | undefined };
    const s = myTasksSummary(tasksQ.data ?? [], user.id);
    const row: MockPending = {
      icon: ListChecks, text: "Tareas", context: tasksQ.isLoading ? "Cargando…" : s.context,
      value: tasksQ.isLoading ? "…" : String(s.count), urgency: s.urgency, moduleKey: "tareas",
    };
    const rest = base.filter((p) => p.text !== "Tareas");
    return { items: tasksQ.isLoading || s.count > 0 ? [row, ...rest] : rest, tasksBadge: s.count || undefined };
  }, [areaKey, tasksQ.data, tasksQ.isLoading, user.id]);
}

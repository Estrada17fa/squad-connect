import * as React from "react";
import { useApp } from "@/components/squad/AppLayout";
import { useTeamAccess } from "@/hooks/useTeamAccess";
import { useEditableTeams } from "@/hooks/useEditableTeams";
import { isMine } from "@/lib/tareas";
import type { TaskRow } from "@/hooks/useCoordinacion";
import type { CategoryOption } from "./TaskFormSheet";

/**
 * Permisos de Tareas en pantalla. Solo refleja lo que ya decide la base
 * (get_my_access + reglas de tasks); no calcula niveles nuevos.
 * Editar = Editar en la categoría (o en todas si es "Todo el club").
 * Responsable = puede cambiar estado, checklist, comentar y subir evidencia.
 */
export function useTaskAccess() {
  const { user } = useApp();
  const { canEditRecord } = useTeamAccess("coordinacion_interna");
  const editable = useEditableTeams("coordinacion_interna");
  const clubWide = canEditRecord(null);

  const categories = React.useMemo<CategoryOption[]>(() => {
    const out: CategoryOption[] = editable.map((t) => ({ id: t.id as string, name: t.name }));
    if (clubWide) out.unshift({ id: null, name: "Todo el club" });
    return out;
  }, [editable, clubWide]);

  const canEdit = React.useCallback((t: Pick<TaskRow, "team_id">) => canEditRecord(t.team_id), [canEditRecord]);
  const canAct = React.useCallback(
    (t: Pick<TaskRow, "team_id" | "assignees">) => canEditRecord(t.team_id) || isMine(t as any, user.id),
    [canEditRecord, user.id],
  );

  return { userId: user.id, categories, canCreate: categories.length > 0, canEdit, canAct };
}

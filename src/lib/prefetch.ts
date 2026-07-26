import type { QueryClient } from "@tanstack/react-query";
import type { ModuleKey } from "@/lib/modules";
import { calendarEventsQueryOptions } from "@/hooks/useCalendarEvents";
import { playersQueryOptions } from "@/hooks/usePlayers";
import { rosterQueryOptions } from "@/hooks/useRoster";
import { tasksQueryOptions, meetingsQueryOptions } from "@/hooks/useCoordinacion";

export interface PrefetchCtx {
  clubId: string | null;
  teamId: string | null;
}

/**
 * Precarga los datos que consume un módulo. Se llama al hacer hover/focus
 * sobre un chip de módulo o un ítem de navbar para que al tocar ya esté listo.
 * Es no-op para módulos sin datos aún.
 */
export function prefetchModule(
  qc: QueryClient,
  moduleKey: ModuleKey,
  ctx: PrefetchCtx,
): void {
  const { clubId, teamId } = ctx;
  switch (moduleKey) {
    case "calendario":
      if (teamId) qc.prefetchQuery(calendarEventsQueryOptions({ mode: "team", teamId }));
      else if (clubId) qc.prefetchQuery(calendarEventsQueryOptions({ mode: "club", clubId }));
      return;
    case "plantel":
      if (clubId) qc.prefetchQuery(rosterQueryOptions(clubId, teamId));
      if (teamId) qc.prefetchQuery(playersQueryOptions(teamId));
      return;
    case "coordinacion_interna":
      if (clubId) {
        qc.prefetchQuery(tasksQueryOptions(clubId));
        qc.prefetchQuery(meetingsQueryOptions(clubId));
      }
      return;
    default:
      return;
  }
}

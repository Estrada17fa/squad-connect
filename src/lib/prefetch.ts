import type { QueryClient } from "@tanstack/react-query";
import type { ModuleKey } from "@/lib/modules";
import { calendarEventsQueryOptions } from "@/hooks/useCalendarEvents";
import { playersQueryOptions } from "@/hooks/usePlayers";
import { rosterQueryOptions } from "@/hooks/useRoster";
import { tasksQueryOptions, meetingsQueryOptions } from "@/hooks/useCoordinacion";
import { inventoryCatalogQueryOptions, inventoryItemsQueryOptions, inventoryLoansQueryOptions } from "@/hooks/useInventory";
import { expensesQueryOptions, suppliersQueryOptions } from "@/hooks/useExpenses";

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
    case "agenda":
    case "mes":
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
    case "inventario":
      if (clubId) {
        qc.prefetchQuery(inventoryCatalogQueryOptions(clubId));
        qc.prefetchQuery(inventoryItemsQueryOptions(clubId));
        qc.prefetchQuery(inventoryLoansQueryOptions(clubId));
      }
      return;
    case "compras_facturas":
      if (clubId) {
        qc.prefetchQuery(expensesQueryOptions(clubId));
        qc.prefetchQuery(suppliersQueryOptions(clubId));
      }
      return;
    default:
      return;
  }
}

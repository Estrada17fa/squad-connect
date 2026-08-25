import type { ModuleKey } from "@/lib/modules";
import type { NotificationRow } from "@/hooks/useNotifications";

export interface NotificationTarget {
  module: ModuleKey;
  to: string;
  search: { open: string; kind?: "tarea" | "junta" };
}

/**
 * Traduce (related_module + related_id + type) al destino navegable.
 * Toda notificación creada por los triggers cae en alguno de estos casos:
 * si no hay destino válido, el centro de notificaciones lo informa en lugar
 * de dejar un tap muerto.
 */
export function notificationTarget(n: NotificationRow): NotificationTarget | null {
  if (!n.related_id || !n.related_module) return null;
  switch (n.related_module) {
    case "agenda":
      return { module: "agenda", to: "/m/agenda", search: { open: n.related_id } };
    case "entrenamientos":
      return { module: "entrenamientos", to: "/m/entrenamientos", search: { open: n.related_id } };
    case "comunicados":
      return { module: "comunicados", to: "/m/comunicados", search: { open: n.related_id } };
    case "solicitudes":
      return { module: "solicitudes", to: "/m/solicitudes", search: { open: n.related_id } };

    case "coordinacion_interna":
      return {
        module: "coordinacion_interna",
        to: "/m/coordinacion_interna",
        search: { open: n.related_id, kind: n.type.startsWith("junta") ? "junta" : "tarea" },
      };
    case "compras_facturas":
      return {
        module: "compras_facturas",
        to: "/m/compras_facturas",
        search: { open: n.related_id },
      };
    case "partidos":
      return { module: "partidos", to: "/m/partidos", search: { open: n.related_id } };
    case "multimedia":
      return { module: "multimedia", to: "/m/multimedia", search: { open: n.related_id } };
    case "viajes":
      return { module: "viajes", to: "/m/viajes", search: { open: n.related_id } };
    case "salud":
      return { module: "salud", to: "/m/salud", search: { open: n.related_id } };
    case "documentos":
      return { module: "documentos", to: "/m/documentos", search: { open: n.related_id } };
    case "inventario":
      return { module: "inventario", to: "/m/inventario", search: { open: n.related_id } };
    default:
      return null;
  }
}

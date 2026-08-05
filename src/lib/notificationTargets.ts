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
    case "solicitudes":
      return { module: "solicitudes", to: "/m/solicitudes", search: { open: n.related_id } };
    case "coordinacion_interna":
      return {
        module: "coordinacion_interna",
        to: "/m/coordinacion_interna",
        search: { open: n.related_id, kind: n.type === "junta_invitacion" ? "junta" : "tarea" },
      };
    case "inventario":
      return { module: "inventario", to: "/m/inventario", search: { open: n.related_id } };
    default:
      return null;
  }
}

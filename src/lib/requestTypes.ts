import {
  Package,
  ShoppingCart,
  Receipt,
  Wallet,
  CalendarOff,
  Ticket,
  HeartPulse,
  HelpCircle,
  type LucideIcon,
} from "lucide-react";
import type { ModuleKey } from "./modules";

export type RequestType =
  | "material"
  | "compra"
  | "pago_proveedor"
  | "reembolso"
  | "permiso"
  | "cortesias"
  | "medica"
  | "otro";

export type RequestStatus = "pendiente" | "aprobada" | "rechazada" | "cancelada" | "completada";

export type FieldType =
  | "text"
  | "textarea"
  | "number"
  | "money"
  | "date"
  | "datetime"
  | "select"
  /** Selector de artículo del catálogo de inventario (guarda nombre + details.item_id). */
  | "item"
  /** Link de referencia (validado como URL). */
  | "url"
  /** Imagen de referencia subida al bucket privado request-attachments. */
  | "image";

export interface RequestFieldDef {
  key: string;
  label: string;
  type: FieldType;
  required?: boolean;
  options?: string[];
  placeholder?: string;
}

export interface RequestTypeDef {
  key: RequestType;
  label: string;
  icon: LucideIcon;
  description: string;
  /**
   * Módulo del área al que pertenece el tipo. Solo informativo/agrupador: quién
   * aprueba se define en role_request_approvals + request_type_user_overrides.
   * ESTE es el único lugar donde vive el mapeo en el cliente; el servidor lo
   * replica en la función SQL public.request_approver_module().
   */
  approverModule: ModuleKey;
  /** Los jugadores solo pueden crear los tipos marcados. */
  playerAllowed: boolean;
  /** Campo monetario que además se guarda en requests.amount. */
  amountKey?: string;
  /** Tipos que tras aprobarse pueden marcarse como completada. */
  completable?: boolean;
  fields: RequestFieldDef[];
}

export const REQUEST_TYPES: RequestTypeDef[] = [
  {
    key: "material",
    label: "Material",
    icon: Package,
    description: "Pedir artículos del inventario",
    approverModule: "inventario",
    playerAllowed: false,
    completable: true,
    fields: [
      { key: "articulo", label: "Artículo", type: "item", required: true },
      { key: "cantidad", label: "Cantidad", type: "number", required: true },
      {
        key: "fecha_devolucion",
        label: "¿Cuándo lo devolverá?",
        type: "date",
        required: true,
      },
    ],
  },
  {
    key: "compra",
    label: "Compra",
    icon: ShoppingCart,
    description: "Solicitar una compra nueva",
    approverModule: "compras_facturas",
    playerAllowed: false,
    amountKey: "costo_estimado",
    completable: true,
    fields: [
      { key: "que_comprar", label: "Qué comprar", type: "text", required: true },
      { key: "costo_estimado", label: "Costo estimado", type: "money", required: true },
      { key: "justificacion", label: "Justificación", type: "textarea", required: true },
      {
        key: "referencia_url",
        label: "Link de referencia",
        type: "url",
        placeholder: "https://…",
      },
      { key: "referencia_foto", label: "Foto de referencia", type: "image" },
    ],
  },
  {
    key: "pago_proveedor",
    label: "Pago a proveedor",
    icon: Receipt,
    description: "Autorizar el pago de un proveedor",
    approverModule: "compras_facturas",
    playerAllowed: false,
    amountKey: "monto",
    fields: [
      { key: "proveedor", label: "Proveedor", type: "text", required: true },
      { key: "concepto", label: "Concepto", type: "text", required: true },
      { key: "monto", label: "Monto", type: "money", required: true },
    ],
  },
  {
    key: "reembolso",
    label: "Reembolso",
    icon: Wallet,
    description: "Recuperar un gasto pagado por ti",
    approverModule: "compras_facturas",
    playerAllowed: true,
    amountKey: "monto",
    fields: [
      { key: "concepto", label: "Concepto", type: "text", required: true },
      { key: "monto", label: "Monto", type: "money", required: true },
      { key: "fecha_gasto", label: "Fecha del gasto", type: "date", required: true },
    ],
  },
  {
    key: "permiso",
    label: "Permiso",
    icon: CalendarOff,
    description: "Ausencia o permiso especial",
    approverModule: "coordinacion_interna",
    playerAllowed: true,
    fields: [
      {
        key: "tipo_ausencia",
        label: "Tipo de ausencia",
        type: "select",
        required: true,
        options: ["Personal", "Médica", "Familiar", "Escolar", "Vacaciones", "Otro"],
      },
      { key: "fecha_inicio", label: "Fecha de inicio", type: "datetime", required: true },
      { key: "fecha_fin", label: "Fecha de fin", type: "datetime", required: true },
      { key: "motivo", label: "Motivo", type: "textarea", required: true },
    ],
  },
  {
    key: "cortesias",
    label: "Cortesías",
    icon: Ticket,
    description: "Boletos de cortesía para un partido",
    approverModule: "coordinacion_interna",
    playerAllowed: true,
    fields: [
      { key: "partido", label: "Partido", type: "text", required: true, placeholder: "p.ej. Jornada 5 vs. Cimarrones" },
      { key: "cantidad_boletos", label: "Cantidad de boletos", type: "number", required: true },
      { key: "para_quien", label: "Para quién", type: "text", required: true },
    ],
  },
  {
    key: "medica",
    label: "Médica",
    icon: HeartPulse,
    description: "Atención o valoración médica",
    approverModule: "salud",
    playerAllowed: true,
    fields: [
      {
        key: "tipo_atencion",
        label: "Tipo de atención",
        type: "select",
        required: true,
        options: ["Valoración", "Fisioterapia", "Estudio o laboratorio", "Consulta externa", "Otro"],
      },
      { key: "descripcion", label: "Descripción", type: "textarea", required: true },
      { key: "urgencia", label: "Urgencia", type: "select", required: true, options: ["Baja", "Media", "Alta"] },
    ],
  },
  {
    key: "otro",
    label: "Otro",
    icon: HelpCircle,
    description: "Cualquier otra petición",
    approverModule: "coordinacion_interna",
    playerAllowed: true,
    fields: [{ key: "detalle", label: "Detalle", type: "textarea", required: true }],
  },
];

export const REQUEST_TYPE_MAP: Record<RequestType, RequestTypeDef> = Object.fromEntries(
  REQUEST_TYPES.map((t) => [t.key, t]),
) as Record<RequestType, RequestTypeDef>;

/** Mapeo tipo → módulo aprobador (espejo de public.request_approver_module). */
export function approverModuleFor(type: RequestType): ModuleKey {
  return REQUEST_TYPE_MAP[type].approverModule;
}

export const STATUS_LABEL: Record<RequestStatus, string> = {
  pendiente: "Pendiente",
  aprobada: "Aprobada",
  rechazada: "Rechazada",
  completada: "Completada",
  cancelada: "Cancelada",
};

/** Colores de estatus: ámbar, azul, rojo, neutro, gris. */
export const STATUS_VARIANT: Record<RequestStatus, "pending" | "approved" | "rejected" | "info"> = {
  pendiente: "pending",
  aprobada: "info",
  rechazada: "rejected",
  completada: "approved",
  cancelada: "info",
};

/** Clase extra para estatus neutros/grises. */
export const STATUS_EXTRA_CLASS: Partial<Record<RequestStatus, string>> = {
  cancelada: "!bg-white/5 !text-muted-foreground",
  completada: "opacity-80",
};

export const STATUS_ORDER: RequestStatus[] = [
  "pendiente",
  "aprobada",
  "completada",
  "rechazada",
  "cancelada",
];

export function formatMoney(amount: number | null | undefined, currency?: string | null) {
  if (amount === null || amount === undefined) return null;
  try {
    return new Intl.NumberFormat("es-MX", {
      style: "currency",
      currency: currency || "MXN",
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `$${amount}`;
  }
}

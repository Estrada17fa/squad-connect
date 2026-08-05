import {
  Package,
  Wrench,
  Users,
  Plane,
  Hammer,
  Truck,
  HelpCircle,
  type LucideIcon,
} from "lucide-react";
import type { StatusVariant } from "@/components/squad/StatusBadge";

export type ExpenseCategory =
  | "material"
  | "servicios"
  | "nomina"
  | "viajes"
  | "mantenimiento"
  | "proveedores"
  | "otro";

export type PaymentStatus = "pendiente" | "pagado";

export interface ExpenseCategoryDef {
  key: ExpenseCategory;
  label: string;
  icon: LucideIcon;
}

export const EXPENSE_CATEGORIES: ExpenseCategoryDef[] = [
  { key: "material", label: "Material", icon: Package },
  { key: "servicios", label: "Servicios", icon: Wrench },
  { key: "nomina", label: "Nómina", icon: Users },
  { key: "viajes", label: "Viajes", icon: Plane },
  { key: "mantenimiento", label: "Mantenimiento", icon: Hammer },
  { key: "proveedores", label: "Proveedores", icon: Truck },
  { key: "otro", label: "Otro", icon: HelpCircle },
];

export const EXPENSE_CATEGORY_MAP: Record<ExpenseCategory, ExpenseCategoryDef> = Object.fromEntries(
  EXPENSE_CATEGORIES.map((c) => [c.key, c]),
) as Record<ExpenseCategory, ExpenseCategoryDef>;

export const PAYMENT_LABEL: Record<PaymentStatus, string> = {
  pendiente: "Pendiente",
  pagado: "Pagado",
};

export const PAYMENT_VARIANT: Record<PaymentStatus, StatusVariant> = {
  pendiente: "pending",
  pagado: "info",
};

export function formatMoney(amount: number | null | undefined, currency?: string | null) {
  if (amount === null || amount === undefined) return "—";
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

/** Fecha simple (YYYY-MM-DD) legible en español. */
export function formatDay(value: string | null | undefined) {
  if (!value) return "—";
  const d = new Date(`${value}T12:00:00`);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString("es-MX", { day: "2-digit", month: "short", year: "numeric" });
}

/** YYYY-MM-DD en horario local (para inputs date). */
export function toDayInput(d: Date) {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export interface ExpensePeriod {
  from: string;
  to: string;
}

export function monthPeriod(offset = 0): ExpensePeriod {
  const now = new Date();
  const from = new Date(now.getFullYear(), now.getMonth() + offset, 1);
  const to = new Date(now.getFullYear(), now.getMonth() + offset + 1, 0);
  return { from: toDayInput(from), to: toDayInput(to) };
}

/**
 * Borrador de gasto a partir de una solicitud aprobada (compra, pago a
 * proveedor o reembolso). Solo pre-llena: quien maneja finanzas ajusta y
 * confirma antes de registrar.
 */
export function expenseDraftFromRequest(req: {
  id: string;
  type: string;
  amount?: number | null;
  currency?: string | null;
  details?: Record<string, any> | null;
  description?: string | null;
}) {
  const d = req.details ?? {};
  const s = (v: unknown) => (v === null || v === undefined ? "" : String(v).trim());

  let concept = "";
  let category: ExpenseCategory = "otro";
  let supplierName = "";
  let expenseDate = "";

  switch (req.type) {
    case "compra":
      concept = s(d.que_comprar);
      category = "material";
      break;
    case "pago_proveedor":
      concept = s(d.concepto);
      supplierName = s(d.proveedor);
      category = "proveedores";
      break;
    case "reembolso":
      concept = s(d.concepto);
      category = "otro";
      expenseDate = s(d.fecha_gasto);
      break;
    default:
      concept = s(d.detalle);
  }

  return {
    concept,
    category,
    supplierName,
    amount: req.amount ?? null,
    currency: req.currency ?? "MXN",
    expenseDate: expenseDate || toDayInput(new Date()),
    notes: s(req.description) || null,
    /** Comprobante de referencia adjunto a la solicitud (bucket request-attachments). */
    requestPhotoPath: s(d.referencia_foto) || null,
  };
}

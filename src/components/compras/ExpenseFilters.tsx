import * as React from "react";
import { Filter, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  EXPENSE_CATEGORIES,
  FISCAL_OPTIONS,
  PAYMENT_LABEL,
  type ExpenseCategory,
  type FiscalStatus,
  type PaymentStatus,
} from "@/lib/expenses";

const ALL = "__all__";

export interface ExpenseFilterState {
  search: string;
  category: ExpenseCategory | null;
  payment: PaymentStatus | null;
  fiscal: FiscalStatus | null;
  from: string;
  to: string;
}

export const EMPTY_EXPENSE_FILTERS: ExpenseFilterState = {
  search: "",
  category: null,
  payment: null,
  fiscal: null,
  from: "",
  to: "",
};

/** Filtro compacto (mismo patrón que Usuarios y Solicitudes). */
export function ExpenseFilters({
  value,
  onChange,
  count,
}: {
  value: ExpenseFilterState;
  onChange: (v: ExpenseFilterState) => void;
  count: number;
}) {
  const set = (patch: Partial<ExpenseFilterState>) => onChange({ ...value, ...patch });
  const activeCount =
    (value.category ? 1 : 0) +
    (value.payment ? 1 : 0) +
    (value.fiscal ? 1 : 0) +
    (value.from || value.to ? 1 : 0);

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={value.search}
            onChange={(e) => set({ search: e.target.value })}
            placeholder="Buscar por concepto o proveedor"
            className="pl-9"
          />
        </div>
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="secondary" className="shrink-0">
              <Filter className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Filtrar</span>
              {activeCount > 0 ? (
                <span className="ml-2 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-primary/20 px-1.5 text-[11px] font-semibold text-primary">
                  {activeCount}
                </span>
              ) : null}
            </Button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-72 space-y-3">
            <div className="space-y-1.5">
              <Label className="text-xs uppercase tracking-wide text-muted-foreground">Categoría</Label>
              <Select
                value={value.category ?? ALL}
                onValueChange={(v) => set({ category: v === ALL ? null : (v as ExpenseCategory) })}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL}>Todas las categorías</SelectItem>
                  {EXPENSE_CATEGORIES.map((c) => (
                    <SelectItem key={c.key} value={c.key}>{c.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs uppercase tracking-wide text-muted-foreground">Estado de pago</Label>
              <Select
                value={value.payment ?? ALL}
                onValueChange={(v) => set({ payment: v === ALL ? null : (v as PaymentStatus) })}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL}>Cualquier pago</SelectItem>
                  <SelectItem value="pendiente">{PAYMENT_LABEL.pendiente}</SelectItem>
                  <SelectItem value="pagado">{PAYMENT_LABEL.pagado}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs uppercase tracking-wide text-muted-foreground">Estado fiscal</Label>
              <Select
                value={value.fiscal ?? ALL}
                onValueChange={(v) => set({ fiscal: v === ALL ? null : (v as FiscalStatus) })}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL}>Cualquier estado fiscal</SelectItem>
                  {FISCAL_OPTIONS.map((o) => (
                    <SelectItem key={o.key} value={o.key}>{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs uppercase tracking-wide text-muted-foreground">Rango de fechas</Label>
              <div className="flex gap-2">
                <Input
                  type="date"
                  value={value.from}
                  onChange={(e) => set({ from: e.target.value })}
                  aria-label="Desde"
                />
                <Input
                  type="date"
                  value={value.to}
                  onChange={(e) => set({ to: e.target.value })}
                  aria-label="Hasta"
                />
              </div>
            </div>

            {activeCount > 0 ? (
              <Button
                variant="ghost"
                size="sm"
                className="w-full"
                onClick={() => onChange({ ...EMPTY_EXPENSE_FILTERS, search: value.search })}
              >
                Limpiar filtros
              </Button>
            ) : null}
          </PopoverContent>
        </Popover>
      </div>

      <p className="text-xs text-muted-foreground">
        {count} gasto{count === 1 ? "" : "s"}
      </p>
    </div>
  );
}

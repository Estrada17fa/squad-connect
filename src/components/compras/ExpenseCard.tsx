import * as React from "react";
import { StandardCard } from "@/components/squad/StandardCard";
import { StatusBadge } from "@/components/squad/StatusBadge";
import type { ExpenseRow } from "@/hooks/useExpenses";
import {
  EXPENSE_CATEGORY_MAP,
  FISCAL_LABEL,
  FISCAL_VARIANT,
  PAYMENT_LABEL,
  PAYMENT_VARIANT,
  fiscalStatus,
  formatDay,
  formatMoney,
} from "@/lib/expenses";
import { FISCAL_ACCENT } from "@/lib/accents";

/** Tarjeta escaneable del gasto: monto, categoría, pago y estado fiscal. */
export function ExpenseCard({
  expense,
  onOpen,
}: {
  expense: ExpenseRow;
  onOpen: (e: ExpenseRow) => void;
}) {
  const cat = EXPENSE_CATEGORY_MAP[expense.category];
  const supplier = expense.supplier?.name ?? expense.supplier_name ?? null;
  const fiscal = fiscalStatus(expense);

  return (
    <StandardCard
      interactive
      icon={cat.icon}
      title={expense.concept}
      subtitle={[supplier, cat.label].filter(Boolean).join(" · ")}
      accent={FISCAL_ACCENT[fiscal]}
      accentLabel={FISCAL_LABEL[fiscal]}
      onClick={() => onOpen(expense)}
    >
      <div className="space-y-2">
        <div className="flex items-center justify-between gap-3">
          <span className="font-display text-lg font-semibold text-foreground">
            {formatMoney(expense.amount, expense.currency)}
          </span>
          <span className="text-xs">{formatDay(expense.expense_date)}</span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          <StatusBadge variant={PAYMENT_VARIANT[expense.payment_status]}>
            {PAYMENT_LABEL[expense.payment_status]}
          </StatusBadge>
          <StatusBadge variant={FISCAL_VARIANT[fiscal]}>{FISCAL_LABEL[fiscal]}</StatusBadge>
        </div>
      </div>
    </StandardCard>
  );
}

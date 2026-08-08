import * as React from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Plus, Receipt, Search, Building2, TrendingUp } from "lucide-react";
import { PageHeader } from "@/components/squad/PageHeader";
import { ModuleTabs } from "@/components/squad/ModuleTabs";
import { EmptyState } from "@/components/squad/EmptyState";
import {
  EntitySheet,
  EntitySheetBody,
  EntitySheetDescription,
  EntitySheetHeader,
  EntitySheetTitle,
} from "@/components/squad/EntitySheet";

import { CardGridSkeleton } from "@/components/squad/LoadingState";
import { StandardCard } from "@/components/squad/StandardCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useApp } from "@/components/squad/AppLayout";
import {
  useExpenses,
  useExpenseReport,
  useSuppliers,
  type ExpenseRow,
  type SupplierRow,
} from "@/hooks/useExpenses";
import {
  EXPENSE_CATEGORIES,
  EXPENSE_CATEGORY_MAP,
  PAYMENT_LABEL,
  PAYMENT_VARIANT,
  formatDay,
  formatMoney,
  monthPeriod,
  type ExpenseCategory,
  type PaymentStatus,
} from "@/lib/expenses";
import { ExpenseFormDialog } from "@/components/compras/ExpenseFormDialog";
import { ExpenseDetailSheet } from "@/components/compras/ExpenseDetailSheet";
import { SupplierFormDialog } from "@/components/compras/SupplierFormDialog";
import { SupplierDetailSheet } from "@/components/compras/SupplierDetailSheet";
import { cn } from "@/lib/utils";
import { canEdit as levelCanEdit } from "@/lib/permissions";

export const Route = createFileRoute("/_authenticated/m/compras_facturas")({
  validateSearch: (search: Record<string, unknown>) => ({
    open: typeof search.open === "string" ? search.open : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Squad — Compras y facturas" },
      { name: "description", content: "Gastos del club, comprobantes, proveedores y reportes." },
      { property: "og:title", content: "Squad — Compras y facturas" },
      {
        property: "og:description",
        content: "Registro de gastos con comprobante, catálogo de proveedores y reportes del club.",
      },
    ],
  }),
  component: ComprasPage,
});

type SubView = "gastos" | "proveedores" | "reportes";

function ComprasPage() {
  const { permissions, isSuperAdmin, accessibleModules, profile, user } = useApp();
  const clubId = profile?.club_id ?? null;
  const canAccess = isSuperAdmin || accessibleModules.includes("compras_facturas");
  const level = permissions.compras_facturas;
  const canEdit = isSuperAdmin || levelCanEdit(level);

  const [view, setView] = React.useState<SubView>("gastos");
  const [search, setSearch] = React.useState("");
  const [cat, setCat] = React.useState<"all" | ExpenseCategory>("all");
  const [pay, setPay] = React.useState<"all" | PaymentStatus>("all");
  const [from, setFrom] = React.useState("");
  const [to, setTo] = React.useState("");

  const [formOpen, setFormOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<ExpenseRow | null>(null);
  const [detail, setDetail] = React.useState<ExpenseRow | null>(null);
  const [supplierForm, setSupplierForm] = React.useState(false);
  const [editingSupplier, setEditingSupplier] = React.useState<SupplierRow | null>(null);
  const [openSupplier, setOpenSupplier] = React.useState<SupplierRow | null>(null);
  const [supplierDetail, setSupplierDetail] = React.useState<SupplierRow | null>(null);

  const expensesQ = useExpenses(canAccess ? clubId : null);
  const suppliersQ = useSuppliers(canAccess ? clubId : null);
  const expenses = expensesQ.data ?? [];

  // Deep-link desde notificaciones: /m/compras_facturas?open=<expenseId>
  const { open: openParam } = Route.useSearch();
  const navigate = useNavigate();
  React.useEffect(() => {
    if (!openParam) return;
    const e = expenses.find((x) => x.id === openParam);
    if (!e) return;
    setView("gastos");
    setDetail(e);
    navigate({ to: "/m/compras_facturas", search: () => ({ open: undefined }), replace: true });
  }, [openParam, expenses, navigate]);

  // El detalle abierto siempre refleja la fila más reciente.
  React.useEffect(() => {
    if (!detail) return;
    const fresh = expenses.find((e) => e.id === detail.id);
    if (fresh && fresh !== detail) setDetail(fresh);
  }, [expenses, detail]);

  const filtered = React.useMemo(() => {
    const q = search.trim().toLowerCase();
    return expenses.filter((e) => {
      if (cat !== "all" && e.category !== cat) return false;
      if (pay !== "all" && e.payment_status !== pay) return false;
      if (from && e.expense_date < from) return false;
      if (to && e.expense_date > to) return false;
      if (q) {
        const supplier = (e.supplier?.name ?? e.supplier_name ?? "").toLowerCase();
        if (!e.concept.toLowerCase().includes(q) && !supplier.includes(q)) return false;
      }
      return true;
    });
  }, [expenses, search, cat, pay, from, to]);

  if (!canAccess) {
    return (
      <div className="space-y-6">
        <PageHeader hideTitle title="Compras y facturas" subtitle="Gastos y comprobantes del club" />
        <ModuleTabs activeKey="compras_facturas" />
        <EmptyState icon={Receipt} title="Sin acceso" message="Tu rol actual no tiene permisos para este módulo." />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader hideTitle title="Compras y facturas" subtitle="Gastos y comprobantes del club" />
      <ModuleTabs activeKey="compras_facturas" />

      <Tabs value={view} onValueChange={(v) => setView(v as SubView)} className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="gastos">Gastos</TabsTrigger>
          <TabsTrigger value="proveedores">Proveedores</TabsTrigger>
          <TabsTrigger value="reportes">Reportes</TabsTrigger>
        </TabsList>

        {canEdit && view !== "reportes" ? (
          <Button
            className="w-full glow-primary"
            onClick={() => {
              if (view === "gastos") {
                setEditing(null);
                setFormOpen(true);
              } else {
                setEditingSupplier(null);
                setSupplierForm(true);
              }
            }}
          >
            <Plus className="mr-2 h-4 w-4" />
            {view === "gastos" ? "Registrar gasto" : "Agregar proveedor"}
          </Button>
        ) : null}

        <TabsContent value="gastos" className="space-y-4">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por concepto o proveedor…"
              className="pl-9"
            />
          </div>

          <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {[
              { key: "all" as const, label: "Todas" },
              ...EXPENSE_CATEGORIES.map((c) => ({ key: c.key, label: c.label })),
            ].map((o) => (
              <Chip key={o.key} active={cat === o.key} onClick={() => setCat(o.key)}>
                {o.label}
              </Chip>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {(["all", "pendiente", "pagado"] as const).map((p) => (
              <Chip key={p} active={pay === p} onClick={() => setPay(p)}>
                {p === "all" ? "Todo pago" : PAYMENT_LABEL[p]}
              </Chip>
            ))}
            <Input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="h-9 w-[9.5rem]"
              aria-label="Desde"
            />
            <Input
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="h-9 w-[9.5rem]"
              aria-label="Hasta"
            />
          </div>

          {expensesQ.isLoading ? (
            <CardGridSkeleton />
          ) : filtered.length === 0 ? (
            <EmptyState
              icon={Receipt}
              title={expenses.length === 0 ? "Sin gastos" : "Sin resultados"}
              message={
                expenses.length === 0
                  ? "Aún no se ha registrado ningún gasto del club."
                  : "Ningún gasto coincide con los filtros."
              }
            />
          ) : (
            <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
              {filtered.map((e) => (
                <ExpenseCard key={e.id} expense={e} onOpen={setDetail} />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="proveedores" className="space-y-4">
          {suppliersQ.isLoading ? (
            <CardGridSkeleton />
          ) : (suppliersQ.data ?? []).length === 0 ? (
            <EmptyState
              icon={Building2}
              title="Sin proveedores"
              message="El catálogo está vacío. Agrega los proveedores recurrentes del club."
            />
          ) : (
            <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
              {(suppliersQ.data ?? []).map((s) => {
                const count = expenses.filter((e) => e.supplier_id === s.id).length;
                return (
                  <StandardCard
                    key={s.id}
                    interactive
                    icon={Building2}
                    title={s.name}
                    subtitle={s.contact ?? undefined}
                    onClick={() => setSupplierDetail(s)}
                  >
                    <div className="space-y-1">
                      {s.phone ? <p>{s.phone}</p> : null}
                      {s.email ? <p className="truncate">{s.email}</p> : null}
                      <p>{count === 0 ? "Sin gastos registrados" : `${count} gasto${count === 1 ? "" : "s"}`}</p>
                    </div>
                  </StandardCard>
                );
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="reportes" className="space-y-4">
          {clubId ? <ReportsView clubId={clubId} /> : null}
        </TabsContent>
      </Tabs>

      {clubId ? (
        <>
          <ExpenseFormDialog
            open={formOpen}
            onOpenChange={setFormOpen}
            clubId={clubId}
            userId={user.id}
            expense={editing}
          />
          <SupplierFormDialog
            open={supplierForm}
            onOpenChange={setSupplierForm}
            clubId={clubId}
            userId={user.id}
            supplier={editingSupplier}
          />
        </>
      ) : null}

      <ExpenseDetailSheet
        open={!!detail}
        onOpenChange={(v) => !v && setDetail(null)}
        expense={detail}
        canEdit={canEdit}
        onEdit={(e) => {
          setDetail(null);
          setEditing(e);
          setFormOpen(true);
        }}
      />

      <SupplierDetailSheet
        open={!!supplierDetail}
        onOpenChange={(v) => !v && setSupplierDetail(null)}
        supplier={supplierDetail}
        canEdit={canEdit}
        onEdit={(s) => {
          setSupplierDetail(null);
          setEditingSupplier(s);
          setSupplierForm(true);
        }}
        onViewExpenses={(s) => {
          setSupplierDetail(null);
          setOpenSupplier(s);
        }}
      />

      <SupplierExpensesSheet
        supplier={openSupplier}
        expenses={expenses}
        onOpenChange={(v) => !v && setOpenSupplier(null)}
        onOpenExpense={(e) => {
          setOpenSupplier(null);
          setDetail(e);
        }}
      />
    </div>
  );
}

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
        active
          ? "border-primary bg-primary/10 text-primary"
          : "border-border/60 text-muted-foreground hover:bg-white/[0.04]",
      )}
    >
      {children}
    </button>
  );
}

function ExpenseCard({ expense, onOpen }: { expense: ExpenseRow; onOpen: (e: ExpenseRow) => void }) {
  const cat = EXPENSE_CATEGORY_MAP[expense.category];
  const supplier = expense.supplier?.name ?? expense.supplier_name ?? null;
  return (
    <StandardCard
      interactive
      icon={cat.icon}
      title={expense.concept}
      subtitle={[supplier, cat.label].filter(Boolean).join(" · ")}
      status={{ label: PAYMENT_LABEL[expense.payment_status], variant: PAYMENT_VARIANT[expense.payment_status] }}
      onClick={() => onOpen(expense)}
    >
      <div className="flex items-center justify-between gap-3">
        <span className="font-display text-base font-semibold text-foreground">
          {formatMoney(expense.amount, expense.currency)}
        </span>
        <span>{formatDay(expense.expense_date)}</span>
      </div>
    </StandardCard>
  );
}

/** Reportes: todos los totales vienen ya sumados del servidor (RPC expense_report). */
function ReportsView({ clubId }: { clubId: string }) {
  const [preset, setPreset] = React.useState<"este" | "pasado" | "custom">("este");
  const base = React.useMemo(() => monthPeriod(preset === "pasado" ? -1 : 0), [preset]);
  const [from, setFrom] = React.useState(base.from);
  const [to, setTo] = React.useState(base.to);

  React.useEffect(() => {
    if (preset === "custom") return;
    setFrom(base.from);
    setTo(base.to);
  }, [preset, base]);

  const reportQ = useExpenseReport(clubId, from, to);
  const rows = reportQ.data ?? [];
  const total = rows.reduce((a, r) => a + r.total, 0);
  const pending = rows.reduce((a, r) => a + r.pending_total, 0);
  const paid = rows.reduce((a, r) => a + r.paid_total, 0);
  const max = rows.reduce((a, r) => Math.max(a, r.total), 0);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Chip active={preset === "este"} onClick={() => setPreset("este")}>
          Este mes
        </Chip>
        <Chip active={preset === "pasado"} onClick={() => setPreset("pasado")}>
          Mes pasado
        </Chip>
        <Chip active={preset === "custom"} onClick={() => setPreset("custom")}>
          Rango
        </Chip>
      </div>

      {preset === "custom" ? (
        <div className="flex flex-wrap items-center gap-2">
          <Input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="h-9 w-[9.5rem]"
            aria-label="Desde"
          />
          <Input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="h-9 w-[9.5rem]"
            aria-label="Hasta"
          />
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Metric label="Total del periodo" value={formatMoney(total)} highlight />
        <Metric label="Pendiente de pago" value={formatMoney(pending)} />
        <Metric label="Pagado" value={formatMoney(paid)} />
      </div>

      <div className="glass space-y-3 p-4">
        <p className="flex items-center gap-2 text-xs uppercase tracking-wide text-muted-foreground">
          <TrendingUp className="h-3.5 w-3.5" /> Desglose por categoría
        </p>
        {reportQ.isLoading ? (
          <p className="text-sm text-muted-foreground">Calculando…</p>
        ) : rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">Sin gastos en este periodo.</p>
        ) : (
          <div className="space-y-3">
            {rows.map((r) => (
              <div key={r.category} className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-foreground">{EXPENSE_CATEGORY_MAP[r.category].label}</span>
                  <span className="text-muted-foreground">
                    {formatMoney(r.total)} · {r.expense_count}
                  </span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-white/5">
                  <div
                    className="h-full rounded-full bg-primary"
                    style={{ width: `${max > 0 ? Math.max((r.total / max) * 100, 3) : 0}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function Metric({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="glass p-4">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <p
        className={cn(
          "mt-1 font-display text-xl font-semibold",
          highlight ? "text-primary" : "text-foreground",
        )}
      >
        {value}
      </p>
    </div>
  );
}

/** Gastos asociados a un proveedor del catálogo. */
function SupplierExpensesSheet({
  supplier,
  expenses,
  onOpenChange,
  onOpenExpense,
}: {
  supplier: SupplierRow | null;
  expenses: ExpenseRow[];
  onOpenChange: (v: boolean) => void;
  onOpenExpense: (e: ExpenseRow) => void;
}) {
  const list = supplier ? expenses.filter((e) => e.supplier_id === supplier.id) : [];
  const total = list.reduce((a, e) => a + Number(e.amount), 0);

  return (
    <ExpenseSupplierSheetShell supplier={supplier} onOpenChange={onOpenChange}>
      <p className="text-sm text-muted-foreground">
        {list.length === 0
          ? "Sin gastos registrados con este proveedor."
          : `${list.length} gasto${list.length === 1 ? "" : "s"} · ${formatMoney(total)}`}
      </p>
      <div className="space-y-3">
        {list.map((e) => (
          <ExpenseCard key={e.id} expense={e} onOpen={onOpenExpense} />
        ))}
      </div>
    </ExpenseSupplierSheetShell>
  );
}

function ExpenseSupplierSheetShell({
  supplier,
  onOpenChange,
  children,
}: {
  supplier: SupplierRow | null;
  onOpenChange: (v: boolean) => void;
  children: React.ReactNode;
}) {
  return (

    <EntitySheet open={!!supplier} onOpenChange={onOpenChange}>
      <EntitySheetHeader>
        <EntitySheetTitle>{supplier?.name ?? "Proveedor"}</EntitySheetTitle>
        <EntitySheetDescription>
          {[supplier?.contact, supplier?.phone, supplier?.email].filter(Boolean).join(" · ") ||
            "Gastos asociados"}
        </EntitySheetDescription>
      </EntitySheetHeader>
      <EntitySheetBody>{children}</EntitySheetBody>
    </EntitySheet>
  );
}

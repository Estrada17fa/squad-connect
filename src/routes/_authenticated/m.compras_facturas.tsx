import * as React from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Plus, Receipt, Building2, TrendingUp, FileCheck2 } from "lucide-react";
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
  EXPENSE_CATEGORY_MAP,
  fiscalStatus,
  formatMoney,
  monthPeriod,
} from "@/lib/expenses";
import { ExpenseFormDialog } from "@/components/compras/ExpenseFormDialog";
import { ExpenseDetailSheet } from "@/components/compras/ExpenseDetailSheet";
import { ExpenseCard } from "@/components/compras/ExpenseCard";
import {
  ExpenseFilters,
  EMPTY_EXPENSE_FILTERS,
  type ExpenseFilterState,
} from "@/components/compras/ExpenseFilters";
import { SupplierFormDialog } from "@/components/compras/SupplierFormDialog";
import { SupplierDetailSheet } from "@/components/compras/SupplierDetailSheet";
import { cn } from "@/lib/utils";
import { LEVEL_RANK, normalizeLevel } from "@/lib/permissions";

export const Route = createFileRoute("/_authenticated/m/compras_facturas")({
  validateSearch: (search: Record<string, unknown>) => ({
    open: typeof search.open === "string" ? search.open : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Squad — Compras y facturas" },
      { name: "description", content: "Gastos del club, facturas recibidas, proveedores y reportes." },
      { property: "og:title", content: "Squad — Compras y facturas" },
      {
        property: "og:description",
        content: "Gastos con comprobante y factura, catálogo de proveedores y reportes del club.",
      },
    ],
  }),
  component: ComprasPage,
});

type SubView = "gastos" | "proveedores" | "reportes";

function ComprasPage() {
  const { permissions, isSuperAdmin, profile, user } = useApp();
  const clubId = profile?.club_id ?? null;

  // Módulo de club: se comporta con Sin acceso / Lector global / Editor global.
  const level = normalizeLevel(permissions.compras_facturas);
  const canAccess = isSuperAdmin || LEVEL_RANK[level] >= LEVEL_RANK.lector_global;
  const canEdit = isSuperAdmin || level === "editor_global";

  const [view, setView] = React.useState<SubView>("gastos");
  const [filters, setFilters] = React.useState<ExpenseFilterState>(EMPTY_EXPENSE_FILTERS);

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
    const q = filters.search.trim().toLowerCase();
    return expenses.filter((e) => {
      if (filters.category && e.category !== filters.category) return false;
      if (filters.payment && e.payment_status !== filters.payment) return false;
      if (filters.fiscal && fiscalStatus(e) !== filters.fiscal) return false;
      if (filters.from && e.expense_date < filters.from) return false;
      if (filters.to && e.expense_date > filters.to) return false;
      if (q) {
        const supplier = (e.supplier?.name ?? e.supplier_name ?? "").toLowerCase();
        if (!e.concept.toLowerCase().includes(q) && !supplier.includes(q)) return false;
      }
      return true;
    });
  }, [expenses, filters]);

  if (!canAccess) {
    return (
      <div className="space-y-6">
        <PageHeader hideTitle title="Compras y facturas" subtitle="Gastos y facturas del club" />
        <ModuleTabs activeKey="compras_facturas" />
        <EmptyState icon={Receipt} title="Sin acceso" message="Tu rol actual no tiene permisos para este módulo." />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader hideTitle title="Compras y facturas" subtitle="Gastos y facturas del club" />
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
          <ExpenseFilters value={filters} onChange={setFilters} count={filtered.length} />

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
  const invoiced = rows.reduce((a, r) => a + r.invoiced_total, 0);
  const uninvoiced = rows.reduce((a, r) => a + r.uninvoiced_total, 0);
  const max = rows.reduce((a, r) => Math.max(a, r.total), 0);
  const invoicedPct = total > 0 ? Math.round((invoiced / total) * 100) : 0;

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
          <FileCheck2 className="h-3.5 w-3.5" /> Facturado vs sin factura
        </p>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <p className="text-xs text-muted-foreground">Con factura (deducible)</p>
            <p className="font-display text-lg font-semibold text-foreground">{formatMoney(invoiced)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Sin factura</p>
            <p className="font-display text-lg font-semibold text-foreground">{formatMoney(uninvoiced)}</p>
          </div>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-white/5">
          <div className="h-full rounded-full bg-primary" style={{ width: `${invoicedPct}%` }} />
        </div>
        <p className="text-xs text-muted-foreground">{invoicedPct}% del gasto del periodo está facturado.</p>
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
                <p className="text-xs text-muted-foreground">
                  Facturado {formatMoney(r.invoiced_total)} · Sin factura {formatMoney(r.uninvoiced_total)}
                </p>
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

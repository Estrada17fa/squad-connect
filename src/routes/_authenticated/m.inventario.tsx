import * as React from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  Plus, Package, Search, AlertTriangle, ArrowLeftRight, CheckCircle2, Clock, User as UserIcon,
} from "lucide-react";
import { PageHeader } from "@/components/squad/PageHeader";
import { ModuleTabs } from "@/components/squad/ModuleTabs";
import { EmptyState } from "@/components/squad/EmptyState";
import { LoadingState, CardGridSkeleton } from "@/components/squad/LoadingState";
import { StandardCard } from "@/components/squad/StandardCard";
import { StatusBadge, type StatusVariant } from "@/components/squad/StatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useApp } from "@/components/squad/AppLayout";
import {
  useInventoryItems, useInventoryLoans, computeOutstanding, itemAvailability,
  type InventoryItem, type InventoryLoan,
} from "@/hooks/useInventory";
import { formatDateTime } from "@/lib/calendar-utils";
import { ItemFormDialog } from "@/components/inventario/ItemFormDialog";
import { LoanFormDialog } from "@/components/inventario/LoanFormDialog";
import { ReturnLoanDialog } from "@/components/inventario/ReturnLoanDialog";
import { ItemDetailSheet } from "@/components/inventario/ItemDetailSheet";
import { LoanDetailSheet } from "@/components/inventario/LoanDetailSheet";
import { useInventoryImageUrl } from "@/hooks/useInventory";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/m/inventario")({
  head: () => ({
    meta: [
      { title: "Squad — Inventario" },
      { name: "description", content: "Catálogo y préstamos de material deportivo del club." },
    ],
  }),
  component: InventarioPage,
});

type LoansFilter = "activos" | "devueltos";

function InventarioPage() {
  const { permissions, isSuperAdmin, user, accessibleModules, profile } = useApp();
  const clubId = profile?.club_id ?? null;
  const canEdit = isSuperAdmin || permissions.inventario === "editor" || permissions.inventario === "approver";
  const canAccess = isSuperAdmin || accessibleModules.includes("inventario");

  const itemsQ = useInventoryItems(clubId);
  const loansQ = useInventoryLoans(clubId);

  const [tab, setTab] = React.useState<"catalogo" | "prestamos">("catalogo");
  const [search, setSearch] = React.useState("");
  const [categoryFilter, setCategoryFilter] = React.useState<string>("all");
  const [loansFilter, setLoansFilter] = React.useState<LoansFilter>("activos");

  const [itemDialog, setItemDialog] = React.useState(false);
  const [editingItem, setEditingItem] = React.useState<InventoryItem | null>(null);
  const [detailItem, setDetailItem] = React.useState<InventoryItem | null>(null);
  const [loanDialog, setLoanDialog] = React.useState(false);
  const [editingLoan, setEditingLoan] = React.useState<InventoryLoan | null>(null);
  const [loanInitialItem, setLoanInitialItem] = React.useState<string | null>(null);
  const [returnLoan, setReturnLoan] = React.useState<InventoryLoan | null>(null);
  const [detailLoan, setDetailLoan] = React.useState<InventoryLoan | null>(null);

  if (!canAccess) {
    return (
      <div className="space-y-6">
        <PageHeader hideTitle title="Inventario" subtitle="Material del club" />
        <EmptyState icon={Package} title="Sin acceso" message="Tu rol actual no tiene permisos para este módulo." />
      </div>
    );
  }

  if (!clubId) return <LoadingState />;

  const items = itemsQ.data ?? [];
  const loans = loansQ.data ?? [];
  const outstanding = React.useMemo(() => computeOutstanding(loans), [loans]);

  const categories = React.useMemo(() => {
    const set = new Set<string>();
    for (const it of items) if (it.category) set.add(it.category);
    return [...set].sort();
  }, [items]);

  const filteredItems = React.useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter((it) => {
      if (categoryFilter !== "all" && (it.category ?? "") !== categoryFilter) return false;
      if (!q) return true;
      return (
        it.name.toLowerCase().includes(q) ||
        (it.category ?? "").toLowerCase().includes(q) ||
        (it.description ?? "").toLowerCase().includes(q)
      );
    });
  }, [items, search, categoryFilter]);

  const activeLoans = loans.filter((l) => !l.returned_at);
  const returnedLoans = loans.filter((l) => !!l.returned_at);

  function openNewItem() { setEditingItem(null); setItemDialog(true); }
  function openNewLoan(itemId?: string) {
    setEditingLoan(null);
    setLoanInitialItem(itemId ?? null);
    setLoanDialog(true);
  }

  return (
    <div className="space-y-6">
      <ModuleTabs activeKey="inventario" />
      <PageHeader hideTitle title="Inventario" subtitle="Ámbito club · material deportivo" />

      <Tabs value={tab} onValueChange={(v) => setTab(v as any)} className="w-full">
        <TabsList>
          <TabsTrigger value="catalogo">Catálogo</TabsTrigger>
          <TabsTrigger value="prestamos">Préstamos</TabsTrigger>
        </TabsList>

        {/* ============= CATÁLOGO ============= */}
        <TabsContent value="catalogo" className="mt-4 space-y-4">
          {canEdit ? (
            <Button onClick={openNewItem} className="w-full glow-primary">
              <Plus className="mr-2 h-4 w-4" /> Nuevo artículo
            </Button>
          ) : null}

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar artículo…"
                className="pl-8"
              />
            </div>
            <CategoryChips
              categories={categories}
              value={categoryFilter}
              onChange={setCategoryFilter}
            />
          </div>

          {itemsQ.isLoading && items.length === 0 ? (
            <CardGridSkeleton count={4} />
          ) : filteredItems.length === 0 ? (
            <EmptyState
              icon={Package}
              title={items.length === 0 ? "Sin artículos en el catálogo" : "Sin resultados"}
              message={
                items.length === 0
                  ? canEdit ? "Registra el primer artículo del club." : "Aún no hay material registrado."
                  : "Ajusta el buscador o el filtro de categoría."
              }
              action={
                canEdit && items.length === 0 ? (
                  <Button onClick={openNewItem}><Plus className="mr-2 h-4 w-4" /> Nuevo artículo</Button>
                ) : undefined
              }
            />
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {filteredItems.map((it, i) => (
                <div key={it.id} className="animate-card-in" style={{ animationDelay: `${i * 25}ms` }}>
                  <ItemCard
                    item={it}
                    available={itemAvailability(it, outstanding)}
                    canEdit={canEdit}
                    onEdit={() => { setEditingItem(it); setItemDialog(true); }}
                    onLoan={() => openNewLoan(it.id)}
                  />
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        {/* ============= PRÉSTAMOS ============= */}
        <TabsContent value="prestamos" className="mt-4 space-y-4">
          {canEdit ? (
            <Button
              onClick={() => openNewLoan()}
              className="w-full glow-primary"
              disabled={items.length === 0}
            >
              <Plus className="mr-2 h-4 w-4" /> Nuevo préstamo
            </Button>
          ) : null}

          <LoanFilterChips value={loansFilter} onChange={setLoansFilter} activeCount={activeLoans.length} returnedCount={returnedLoans.length} />

          {loansQ.isLoading && loans.length === 0 ? (
            <CardGridSkeleton count={3} />
          ) : (
            <LoansList
              loans={loansFilter === "activos" ? activeLoans : returnedLoans}
              variant={loansFilter}
              canEdit={canEdit}
              onEdit={(l) => { setEditingLoan(l); setLoanInitialItem(null); setLoanDialog(true); }}
              onReturn={(l) => setReturnLoan(l)}
              onCreate={canEdit ? () => openNewLoan() : undefined}
              hasItems={items.length > 0}
            />
          )}
        </TabsContent>
      </Tabs>

      <ItemFormDialog
        open={itemDialog}
        onOpenChange={setItemDialog}
        clubId={clubId}
        userId={user.id}
        item={editingItem}
        outstandingForItem={editingItem ? outstanding[editingItem.id] ?? 0 : 0}
        categories={categories}
      />
      <LoanFormDialog
        open={loanDialog}
        onOpenChange={setLoanDialog}
        clubId={clubId}
        userId={user.id}
        loan={editingLoan}
        items={items}
        outstanding={outstanding}
        initialItemId={loanInitialItem}
      />
      <ReturnLoanDialog
        open={!!returnLoan}
        onOpenChange={(o) => { if (!o) setReturnLoan(null); }}
        clubId={clubId}
        loan={returnLoan}
      />
    </div>
  );
}

function CategoryChips({
  categories, value, onChange,
}: {
  categories: string[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      <Chip active={value === "all"} onClick={() => onChange("all")}>Todas</Chip>
      {categories.map((c) => (
        <Chip key={c} active={value === c} onClick={() => onChange(c)}>{c}</Chip>
      ))}
    </div>
  );
}

function LoanFilterChips({
  value, onChange, activeCount, returnedCount,
}: {
  value: LoansFilter; onChange: (v: LoansFilter) => void; activeCount: number; returnedCount: number;
}) {
  return (
    <div className="flex gap-2">
      <Chip active={value === "activos"} onClick={() => onChange("activos")}>Activos · {activeCount}</Chip>
      <Chip active={value === "devueltos"} onClick={() => onChange("devueltos")}>Devueltos · {returnedCount}</Chip>
    </div>
  );
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
        active
          ? "border-primary bg-primary/10 text-primary"
          : "border-border/60 text-muted-foreground hover:bg-white/[0.04]",
      )}
    >
      {children}
    </button>
  );
}

function ItemCard({
  item, available, canEdit, onEdit, onLoan,
}: {
  item: InventoryItem;
  available: number;
  canEdit: boolean;
  onEdit: () => void;
  onLoan: () => void;
}) {
  const low = item.min_quantity > 0 && available <= item.min_quantity;
  const out = available === 0;
  const status: { label: string; variant: StatusVariant } = out
    ? { label: "Agotado", variant: "rejected" }
    : low
      ? { label: "Bajo stock", variant: "pending" }
      : { label: `${available} disp.`, variant: "approved" };

  return (
    <StandardCard
      interactive={canEdit}
      onClick={canEdit ? onEdit : undefined}
      icon={Package}
      title={item.name}
      subtitle={
        `${item.category ?? "Sin categoría"} · Total ${item.total_quantity}${item.unit ? ` ${item.unit}` : ""}`
      }
      status={status}
      className={cn((low || out) && "ring-1 ring-status-pending/40")}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-xs text-muted-foreground">
          {item.min_quantity > 0 ? `Mínimo ${item.min_quantity}` : "Sin alerta de stock"}
        </span>
        {canEdit ? (
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={(e) => { e.stopPropagation(); onLoan(); }}
            disabled={available === 0}
            className="h-7 gap-1 text-xs"
          >
            <ArrowLeftRight className="h-3.5 w-3.5" /> Prestar
          </Button>
        ) : null}
      </div>
    </StandardCard>
  );
}

function LoansList({
  loans, variant, canEdit, onEdit, onReturn, onCreate, hasItems,
}: {
  loans: InventoryLoan[];
  variant: LoansFilter;
  canEdit: boolean;
  onEdit: (l: InventoryLoan) => void;
  onReturn: (l: InventoryLoan) => void;
  onCreate?: () => void;
  hasItems: boolean;
}) {
  if (loans.length === 0) {
    return (
      <EmptyState
        icon={variant === "activos" ? ArrowLeftRight : CheckCircle2}
        title={variant === "activos" ? "Sin préstamos activos" : "Sin préstamos cerrados"}
        message={
          variant === "activos"
            ? (hasItems
              ? (canEdit ? "Registra el primer préstamo de material." : "Aún no hay material prestado.")
              : "Primero registra artículos en el catálogo.")
            : "Los préstamos devueltos aparecerán aquí."
        }
        action={
          canEdit && variant === "activos" && hasItems && onCreate ? (
            <Button onClick={onCreate}><Plus className="mr-2 h-4 w-4" /> Nuevo préstamo</Button>
          ) : undefined
        }
      />
    );
  }

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      {loans.map((l, i) => (
        <div key={l.id} className="animate-card-in" style={{ animationDelay: `${i * 25}ms` }}>
          <LoanCard loan={l} canEdit={canEdit} onEdit={onEdit} onReturn={onReturn} />
        </div>
      ))}
    </div>
  );
}

function LoanCard({
  loan, canEdit, onEdit, onReturn,
}: {
  loan: InventoryLoan;
  canEdit: boolean;
  onEdit: (l: InventoryLoan) => void;
  onReturn: (l: InventoryLoan) => void;
}) {
  const pending = loan.quantity - loan.returned_quantity;
  const active = !loan.returned_at;
  const overdue = active && !!loan.expected_return_at && new Date(loan.expected_return_at) < new Date();
  const partial = active && loan.returned_quantity > 0;

  const status: { label: string; variant: StatusVariant } = !active
    ? { label: "Devuelto", variant: "approved" }
    : overdue
      ? { label: "Vencido", variant: "rejected" }
      : partial
        ? { label: `Parcial · faltan ${pending}`, variant: "pending" }
        : { label: `Activo · ${pending}`, variant: "info" };

  const borrowerName = loan.borrower?.full_name ?? loan.borrower?.email ?? "Miembro";
  const dueLabel = loan.expected_return_at
    ? `Devolver ${formatDateTime(loan.expected_return_at)}`
    : loan.returned_at
      ? `Devuelto ${formatDateTime(loan.returned_at)}`
      : "Sin fecha de devolución";

  return (
    <StandardCard
      interactive={canEdit}
      onClick={canEdit ? () => onEdit(loan) : undefined}
      icon={ArrowLeftRight}
      title={loan.item?.name ?? "Artículo"}
      subtitle={`${loan.quantity}${loan.item?.unit ? ` ${loan.item.unit}` : ""} · ${dueLabel}`}
      status={status}
      className={cn(overdue && "ring-1 ring-destructive/60")}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
          <span className="inline-flex items-center gap-1 text-foreground/80">
            <UserIcon className="h-3.5 w-3.5" /> {borrowerName}
          </span>
          {loan.team?.name ? (
            <span className="text-muted-foreground">· {loan.team.name}</span>
          ) : null}
          {loan.event?.title ? (
            <span className="text-muted-foreground truncate max-w-[180px]">· {loan.event.title}</span>
          ) : null}
          {overdue ? (
            <span className="inline-flex items-center gap-1 text-destructive">
              <AlertTriangle className="h-3.5 w-3.5" /> Vencido
            </span>
          ) : null}
        </div>
        {active && canEdit ? (
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={(e) => { e.stopPropagation(); onReturn(loan); }}
            className="h-7 gap-1 text-xs"
          >
            <CheckCircle2 className="h-3.5 w-3.5" /> Devolver
          </Button>
        ) : null}
        {!active ? (
          <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
            <Clock className="h-3.5 w-3.5" /> {formatDateTime(loan.returned_at!)}
          </span>
        ) : null}
      </div>
    </StandardCard>
  );
}

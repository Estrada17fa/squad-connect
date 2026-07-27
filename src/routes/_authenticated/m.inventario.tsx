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
import { useRequests, type RequestRow } from "@/hooks/useRequests";
import { formatDateTime } from "@/lib/calendar-utils";
import { ItemFormDialog } from "@/components/inventario/ItemFormDialog";
import { LoanFormDialog } from "@/components/inventario/LoanFormDialog";
import { ReturnLoanDialog } from "@/components/inventario/ReturnLoanDialog";
import { ItemDetailSheet } from "@/components/inventario/ItemDetailSheet";
import { LoanDetailSheet } from "@/components/inventario/LoanDetailSheet";
import { RequestDetailSheet } from "@/components/solicitudes/RequestDetailSheet";
import { useInventoryImageUrl } from "@/hooks/useInventory";
import { cn } from "@/lib/utils";
import { ClipboardList } from "lucide-react";

export const Route = createFileRoute("/_authenticated/m/inventario")({
  head: () => ({
    meta: [
      { title: "Squad — Inventario" },
      { name: "description", content: "Catálogo y préstamos de material deportivo del club." },
    ],
  }),
  component: InventarioPage,
});

type LoansFilter = "activos" | "devueltos" | "pendientes";

function InventarioPage() {
  const { permissions, isSuperAdmin, user, accessibleModules, profile } = useApp();
  const clubId = profile?.club_id ?? null;
  const canEdit = isSuperAdmin || permissions.inventario === "editor" || permissions.inventario === "approver";
  const canApprove = isSuperAdmin || permissions.inventario === "approver" || permissions.inventario === "editor";
  const canEditSolicitudes = isSuperAdmin || permissions.solicitudes === "editor";
  const canApproveSolicitudes = isSuperAdmin || permissions.solicitudes === "approver" || permissions.solicitudes === "editor";
  const canAccess = isSuperAdmin || accessibleModules.includes("inventario");

  const itemsQ = useInventoryItems(clubId);
  const loansQ = useInventoryLoans(clubId);
  const requestsQ = useRequests(clubId);

  const [tab, setTab] = React.useState<"catalogo" | "prestamos">("catalogo");
  const [search, setSearch] = React.useState("");
  const [categoryFilter, setCategoryFilter] = React.useState<string>("all");
  const [loansFilter, setLoansFilter] = React.useState<LoansFilter>("activos");
  const [loanSearch, setLoanSearch] = React.useState("");

  const [itemDialog, setItemDialog] = React.useState(false);
  const [editingItem, setEditingItem] = React.useState<InventoryItem | null>(null);
  const [detailItem, setDetailItem] = React.useState<InventoryItem | null>(null);
  const [loanDialog, setLoanDialog] = React.useState(false);
  const [editingLoan, setEditingLoan] = React.useState<InventoryLoan | null>(null);
  const [loanInitialItem, setLoanInitialItem] = React.useState<string | null>(null);
  const [loanInitialExpectedReturn, setLoanInitialExpectedReturn] = React.useState<string | null>(null);
  const [loanInitialQuantity, setLoanInitialQuantity] = React.useState<number | null>(null);
  const [returnLoan, setReturnLoan] = React.useState<InventoryLoan | null>(null);
  const [detailLoan, setDetailLoan] = React.useState<InventoryLoan | null>(null);
  const [detailRequest, setDetailRequest] = React.useState<RequestRow | null>(null);

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

  const pendingRequests = React.useMemo(
    () => (requestsQ.data ?? []).filter((r) => r.type === "material" && r.status === "pendiente"),
    [requestsQ.data],
  );

  const loanQuery = loanSearch.trim().toLowerCase();
  const matchesLoan = (l: InventoryLoan) => {
    if (!loanQuery) return true;
    const item = (l.item?.name ?? "").toLowerCase();
    const person = ((l.borrower?.full_name ?? "") + " " + (l.borrower?.email ?? "")).toLowerCase();
    return item.includes(loanQuery) || person.includes(loanQuery);
  };
  const activeLoans = loans.filter((l) => !l.returned_at).filter(matchesLoan);
  const returnedLoans = loans.filter((l) => !!l.returned_at).filter(matchesLoan);

  function openNewItem() { setEditingItem(null); setItemDialog(true); }
  function openNewLoan(itemId?: string) {
    setEditingLoan(null);
    setLoanInitialItem(itemId ?? null);
    setLoanInitialExpectedReturn(null);
    setLoanInitialQuantity(null);
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
                    onOpen={() => setDetailItem(it)}
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

          <LoanFilterChips
            value={loansFilter}
            onChange={setLoansFilter}
            activeCount={activeLoans.length}
            returnedCount={returnedLoans.length}
            pendingCount={pendingRequests.length}
          />

          {loansFilter !== "pendientes" ? (
            <div className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                value={loanSearch}
                onChange={(e) => setLoanSearch(e.target.value)}
                placeholder="Buscar por artículo o persona…"
                className="pl-8"
              />
            </div>
          ) : null}

          {loansFilter === "pendientes" ? (
            pendingRequests.length === 0 ? (
              <EmptyState
                icon={ClipboardList}
                title="Sin solicitudes pendientes"
                message="Cuando alguien pida material aparecerá aquí para aprobar o rechazar."
              />
            ) : (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {pendingRequests.map((r, i) => (
                  <div key={r.id} className="animate-card-in" style={{ animationDelay: `${i * 25}ms` }}>
                    <PendingRequestCard request={r} onOpen={() => setDetailRequest(r)} />
                  </div>
                ))}
              </div>
            )
          ) : loansQ.isLoading && loans.length === 0 ? (
            <CardGridSkeleton count={3} />
          ) : (
            <LoansList
              loans={loansFilter === "activos" ? activeLoans : returnedLoans}
              variant={loansFilter}
              canEdit={canEdit}
              onOpen={(l) => setDetailLoan(l)}
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
        initialExpectedReturn={loanInitialExpectedReturn}
        initialQuantity={loanInitialQuantity}
      />
      <ReturnLoanDialog
        open={!!returnLoan}
        onOpenChange={(o) => { if (!o) setReturnLoan(null); }}
        clubId={clubId}
        loan={returnLoan}
      />
      <ItemDetailSheet
        open={!!detailItem}
        onOpenChange={(o) => { if (!o) setDetailItem(null); }}
        item={detailItem}
        available={detailItem ? itemAvailability(detailItem, outstanding) : 0}
        outstanding={detailItem ? outstanding[detailItem.id] ?? 0 : 0}
        clubId={clubId}
        canEdit={canEdit}
        onEdit={() => { if (detailItem) { setEditingItem(detailItem); setDetailItem(null); setItemDialog(true); } }}
        onLoan={() => { if (detailItem) { const id = detailItem.id; setDetailItem(null); openNewLoan(id); } }}
      />
      <LoanDetailSheet
        open={!!detailLoan}
        onOpenChange={(o) => { if (!o) setDetailLoan(null); }}
        loan={detailLoan}
        clubId={clubId}
        canEdit={canEdit}
        onEdit={() => { if (detailLoan) { setEditingLoan(detailLoan); setLoanInitialItem(null); setDetailLoan(null); setLoanDialog(true); } }}
        onReturn={() => { if (detailLoan) { const l = detailLoan; setDetailLoan(null); setReturnLoan(l); } }}
      />
      <RequestDetailSheet
        open={!!detailRequest}
        onOpenChange={(o) => { if (!o) setDetailRequest(null); }}
        request={detailRequest}
        clubId={clubId}
        userId={user.id}
        canEditModule={canEditSolicitudes}
        canApprove={canApproveSolicitudes}
        onEdit={() => { /* editing requests handled from Solicitudes module */ }}
        onConvertToLoan={(r) => {
          setDetailRequest(null);
          setEditingLoan(null);
          setLoanInitialItem(r.related_item_id ?? null);
          const q = Number(r.details?.quantity);
          setLoanInitialQuantity(Number.isFinite(q) && q > 0 ? q : null);
          setLoanInitialExpectedReturn(
            (r.details?.expected_return_at as string | undefined) ?? r.needed_at ?? null,
          );
          setLoanDialog(true);
        }}
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
  value, onChange, activeCount, returnedCount, pendingCount,
}: {
  value: LoansFilter; onChange: (v: LoansFilter) => void;
  activeCount: number; returnedCount: number; pendingCount: number;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      <Chip active={value === "activos"} onClick={() => onChange("activos")}>Activos · {activeCount}</Chip>
      <Chip active={value === "pendientes"} onClick={() => onChange("pendientes")}>Pendientes · {pendingCount}</Chip>
      <Chip active={value === "devueltos"} onClick={() => onChange("devueltos")}>Devueltos · {returnedCount}</Chip>
    </div>
  );
}

function PendingRequestCard({ request, onOpen }: { request: RequestRow; onOpen: () => void }) {
  const qty = request.details?.quantity ?? "?";
  const requester = request.requester?.full_name ?? request.requester?.email ?? "Miembro";
  return (
    <StandardCard
      interactive
      onClick={onOpen}
      icon={ClipboardList}
      title={request.item?.name ?? request.title}
      subtitle={`${qty}${request.item?.unit ? ` ${request.item.unit}` : ""} · ${requester}`}
      status={{ label: "Pendiente", variant: "pending" }}
      className="ring-1 ring-status-pending/30"
    >
      <div className="text-xs text-muted-foreground">
        {request.needed_at ? `Necesario ${formatDateTime(request.needed_at)}` : `Solicitado ${formatDateTime(request.created_at)}`}
      </div>
    </StandardCard>
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
  item, available, canEdit, onOpen, onLoan,
}: {
  item: InventoryItem;
  available: number;
  canEdit: boolean;
  onOpen: () => void;
  onLoan: () => void;
}) {
  const low = item.min_quantity > 0 && available <= item.min_quantity;
  const out = available === 0;
  const status: { label: string; variant: StatusVariant } = out
    ? { label: "Agotado", variant: "rejected" }
    : low
      ? { label: "Bajo stock", variant: "pending" }
      : { label: `${available} disp.`, variant: "approved" };

  const imageQ = useInventoryImageUrl(item.image_path);

  return (
    <div
      onClick={onOpen}
      className={cn(
        "glass p-4 flex flex-col gap-3 transition-all cursor-pointer",
        "hover:border-white/15 hover:bg-white/[0.06] active:scale-[0.99]",
        (low || out) && "ring-1 ring-status-pending/40",
      )}
    >
      <div className="flex items-start gap-3">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-white/5 text-foreground">
          {imageQ.data ? (
            <img src={imageQ.data} alt={item.name} className="h-full w-full object-cover" />
          ) : (
            <Package className="h-5 w-5" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-display text-base font-semibold leading-tight text-foreground truncate">
              {item.name}
            </h3>
            <StatusBadge variant={status.variant}>{status.label}</StatusBadge>
          </div>
          <p className="mt-1 text-sm text-muted-foreground line-clamp-2">
            {item.category ?? "Sin categoría"} · Total {item.total_quantity}{item.unit ? ` ${item.unit}` : ""}
          </p>
        </div>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-muted-foreground">
        <span className="text-xs">
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
    </div>
  );
}

function LoansList({
  loans, variant, canEdit, onOpen, onReturn, onCreate, hasItems,
}: {
  loans: InventoryLoan[];
  variant: LoansFilter;
  canEdit: boolean;
  onOpen: (l: InventoryLoan) => void;
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
          <LoanCard loan={l} canEdit={canEdit} onOpen={onOpen} onReturn={onReturn} />
        </div>
      ))}
    </div>
  );
}

function LoanCard({
  loan, canEdit, onOpen, onReturn,
}: {
  loan: InventoryLoan;
  canEdit: boolean;
  onOpen: (l: InventoryLoan) => void;
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
  const expectedLabel = loan.expected_return_at
    ? `Acordado ${formatDateTime(loan.expected_return_at)}`
    : "Sin fecha acordada";
  const dueLabel = !active && loan.returned_at
    ? `${expectedLabel} · Devuelto ${formatDateTime(loan.returned_at)}`
    : expectedLabel;

  return (
    <StandardCard
      interactive
      onClick={() => onOpen(loan)}
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


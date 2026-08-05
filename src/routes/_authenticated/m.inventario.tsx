import * as React from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Plus, Package, Search, AlertTriangle } from "lucide-react";
import { PageHeader } from "@/components/squad/PageHeader";
import { ModuleTabs } from "@/components/squad/ModuleTabs";
import { EmptyState } from "@/components/squad/EmptyState";
import { CardGridSkeleton } from "@/components/squad/LoadingState";
import { StandardCard } from "@/components/squad/StandardCard";
import { StatusBadge, type StatusVariant } from "@/components/squad/StatusBadge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useApp } from "@/components/squad/AppLayout";
import {
  useInventoryCatalog,
  useInventoryItems,
  useInventoryLoans,
  useInventoryThumbnails,
  isLoanOverdue,
  loanOutstanding,
  type InventoryCatalogItem,
  type InventoryItemRow,
  type LoanRow,
} from "@/hooks/useInventory";
import { categoryIcon, SIN_CATEGORIA } from "@/lib/inventory";
import { formatDateTime } from "@/lib/calendar-utils";
import { ItemFormDialog } from "@/components/inventario/ItemFormDialog";
import { LoanFormDialog } from "@/components/inventario/LoanFormDialog";
import { ReturnDialog } from "@/components/inventario/ReturnDialog";
import { LoanDetailSheet } from "@/components/inventario/LoanDetailSheet";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/m/inventario")({
  validateSearch: (search: Record<string, unknown>) => ({
    open: typeof search.open === "string" ? search.open : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Squad — Inventario" },
      { name: "description", content: "Catálogo de material deportivo y préstamos del club." },
      { property: "og:title", content: "Squad — Inventario" },
      { property: "og:description", content: "Material deportivo, disponibilidad y préstamos activos del club." },
    ],
  }),
  component: InventarioPage,
});

type SubView = "catalogo" | "prestamos";

function InventarioPage() {
  const { permissions, isSuperAdmin, accessibleModules, profile, user } = useApp();
  const clubId = profile?.club_id ?? null;
  const canAccess = isSuperAdmin || accessibleModules.includes("inventario");
  const level = permissions.inventario;
  const canEdit = isSuperAdmin || level === "editor" || level === "approver";

  const [view, setView] = React.useState<SubView>("catalogo");
  const [search, setSearch] = React.useState("");
  const [cat, setCat] = React.useState("all");
  const [itemDialog, setItemDialog] = React.useState(false);
  const [editingItem, setEditingItem] = React.useState<InventoryItemRow | null>(null);
  const [loanDialog, setLoanDialog] = React.useState(false);
  const [presetItem, setPresetItem] = React.useState<InventoryCatalogItem | null>(null);
  const [detailLoan, setDetailLoan] = React.useState<LoanRow | null>(null);
  const [returnLoan, setReturnLoan] = React.useState<LoanRow | null>(null);

  const catalogQ = useInventoryCatalog(canAccess ? clubId : null);
  const itemsQ = useInventoryItems(canAccess ? clubId : null);
  const loansQ = useInventoryLoans(canAccess ? clubId : null);

  const catalog = catalogQ.data ?? [];
  const thumbsQ = useInventoryThumbnails([
    ...catalog.map((i) => i.image_path),
    ...(loansQ.data ?? []).map((l) => l.item?.image_path ?? null),
  ]);
  const thumbs = thumbsQ.data ?? {};

  const categories = React.useMemo(() => {
    const set = new Set<string>();
    for (const i of catalog) set.add(i.category?.trim() || SIN_CATEGORIA);
    return [...set].sort((a, b) => a.localeCompare(b, "es"));
  }, [catalog]);

  const filtered = React.useMemo(() => {
    const q = search.trim().toLowerCase();
    return catalog.filter((i) => {
      const c = i.category?.trim() || SIN_CATEGORIA;
      if (cat !== "all" && c !== cat) return false;
      if (q && !i.name.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [catalog, search, cat]);

  const loans = loansQ.data ?? [];
  const active = loans.filter((l) => !l.returned_at);
  const returned = loans.filter((l) => !!l.returned_at);

  // Deep-link desde el centro de notificaciones: /m/inventario?open=<loanId>
  const { open: openParam } = Route.useSearch();
  const navigate = useNavigate();
  React.useEffect(() => {
    if (!openParam) return;
    const loan = loans.find((l) => l.id === openParam);
    if (!loan) return;
    setView("prestamos");
    setDetailLoan(loan);
    navigate({ to: "/m/inventario", search: {}, replace: true });
  }, [openParam, loans, navigate]);



  const minById = React.useMemo(() => {
    const m: Record<string, number> = {};
    for (const i of itemsQ.data ?? []) m[i.id] = i.min_quantity;
    return m;
  }, [itemsQ.data]);
  const itemById = React.useMemo(() => {
    const m: Record<string, InventoryItemRow> = {};
    for (const i of itemsQ.data ?? []) m[i.id] = i;
    return m;
  }, [itemsQ.data]);

  if (!canAccess) {
    return (
      <div className="space-y-6">
        <PageHeader hideTitle title="Inventario" subtitle="Material deportivo y equipamiento" />
        <ModuleTabs activeKey="inventario" />
        <EmptyState icon={Package} title="Sin acceso" message="Tu rol actual no tiene permisos para este módulo." />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader hideTitle title="Inventario" subtitle="Material deportivo y equipamiento" />
      <ModuleTabs activeKey="inventario" />

      <Tabs value={view} onValueChange={(v) => setView(v as SubView)} className="space-y-4">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="catalogo">Catálogo</TabsTrigger>
          <TabsTrigger value="prestamos">Préstamos</TabsTrigger>
        </TabsList>

        {canEdit ? (
          <Button
            className="w-full glow-primary"
            onClick={() => {
              if (view === "catalogo") {
                setEditingItem(null);
                setItemDialog(true);
              } else {
                setPresetItem(null);
                setLoanDialog(true);
              }
            }}
          >
            <Plus className="mr-2 h-4 w-4" />
            {view === "catalogo" ? "Agregar artículo" : "Registrar préstamo"}
          </Button>
        ) : null}

        <TabsContent value="catalogo" className="space-y-4">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar artículo…"
              className="pl-9"
            />
          </div>

          {categories.length > 1 ? (
            <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {[{ key: "all", label: "Todas" }, ...categories.map((c) => ({ key: c, label: c }))].map((o) => (
                <button
                  key={o.key}
                  type="button"
                  onClick={() => setCat(o.key)}
                  className={cn(
                    "shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                    cat === o.key
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border/60 text-muted-foreground hover:bg-white/[0.04]",
                  )}
                >
                  {o.label}
                </button>
              ))}
            </div>
          ) : null}

          {catalogQ.isLoading ? (
            <CardGridSkeleton />
          ) : filtered.length === 0 ? (
            <EmptyState
              icon={Package}
              title={catalog.length === 0 ? "Inventario vacío" : "Sin resultados"}
              message={
                catalog.length === 0
                  ? "Aún no hay artículos registrados en el inventario del club."
                  : "Ningún artículo coincide con la búsqueda."
              }
            />
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {filtered.map((i) => {
                const Icon = categoryIcon(i.category);
                const thumb = i.image_path ? thumbs[i.image_path] : undefined;
                const min = minById[i.id] ?? 0;
                const low = i.available_quantity <= min;
                return (
                  <div key={i.id} className="glass flex items-center gap-3 p-4">
                    {thumb ? (
                      <img src={thumb} alt="" className="h-14 w-14 shrink-0 rounded-xl object-cover" loading="lazy" />
                    ) : (
                      <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-white/5 text-primary">
                        <Icon className="h-6 w-6" />
                      </span>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-display text-base font-semibold text-foreground">{i.name}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {i.category ?? SIN_CATEGORIA}
                        {i.unit ? ` · ${i.unit}` : ""}
                      </p>
                      <p className={cn("mt-1 text-sm", low ? "text-amber-400" : "text-muted-foreground")}>
                        Disponibles: {i.available_quantity} de {i.total_quantity}
                        {low ? (
                          <span className="ml-2 inline-flex items-center gap-1 text-xs">
                            <AlertTriangle className="h-3 w-3" /> Stock bajo
                          </span>
                        ) : null}
                      </p>
                    </div>
                    {canEdit ? (
                      <div className="flex shrink-0 flex-col gap-1">
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setEditingItem(itemById[i.id] ?? null);
                            setItemDialog(true);
                          }}
                        >
                          Editar
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          disabled={i.available_quantity <= 0}
                          onClick={() => {
                            setPresetItem(i);
                            setLoanDialog(true);
                          }}
                        >
                          Prestar
                        </Button>
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="prestamos" className="space-y-6">
          {loansQ.isLoading ? (
            <CardGridSkeleton />
          ) : loans.length === 0 ? (
            <EmptyState
              icon={Package}
              title="Sin préstamos"
              message="Aún no se ha registrado ningún préstamo de material."
            />
          ) : (
            <>
              <LoanSection
                title={`Activos (${active.length})`}
                loans={active}
                thumbs={thumbs}
                canEdit={canEdit}
                onOpen={setDetailLoan}
                onReturn={setReturnLoan}
              />
              <LoanSection
                title={`Devueltos (${returned.length})`}
                loans={returned}
                thumbs={thumbs}
                canEdit={canEdit}
                onOpen={setDetailLoan}
                onReturn={setReturnLoan}
              />
            </>
          )}
        </TabsContent>
      </Tabs>

      {clubId ? (
        <>
          <ItemFormDialog
            open={itemDialog}
            onOpenChange={setItemDialog}
            clubId={clubId}
            userId={user.id}
            item={editingItem}
          />
          <LoanFormDialog
            open={loanDialog}
            onOpenChange={setLoanDialog}
            clubId={clubId}
            userId={user.id}
            initial={presetItem ? { item: presetItem } : null}
          />
          <ReturnDialog
            open={!!returnLoan}
            onOpenChange={(v) => !v && setReturnLoan(null)}
            clubId={clubId}
            loan={returnLoan}
          />
        </>
      ) : null}

      <LoanDetailSheet
        open={!!detailLoan}
        onOpenChange={(v) => !v && setDetailLoan(null)}
        loan={detailLoan}
        canEdit={canEdit}
        onReturn={(l) => {
          setDetailLoan(null);
          setReturnLoan(l);
        }}
      />
    </div>
  );
}

function LoanSection({
  title,
  loans,
  thumbs,
  canEdit,
  onOpen,
  onReturn,
}: {
  title: string;
  loans: LoanRow[];
  thumbs: Record<string, string>;
  canEdit: boolean;
  onOpen: (l: LoanRow) => void;
  onReturn: (l: LoanRow) => void;
}) {
  if (loans.length === 0) {
    return (
      <section className="space-y-2">
        <h2 className="font-display text-sm font-semibold uppercase tracking-wide text-muted-foreground">{title}</h2>
        <p className="text-sm text-muted-foreground">Nada por aquí.</p>
      </section>
    );
  }
  return (
    <section className="space-y-3">
      <h2 className="font-display text-sm font-semibold uppercase tracking-wide text-muted-foreground">{title}</h2>
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        {loans.map((l) => (
          <LoanCard
            key={l.id}
            loan={l}
            thumbs={thumbs}
            canEdit={canEdit}
            onOpen={onOpen}
            onReturn={onReturn}
          />
        ))}
      </div>
    </section>
  );
}

function LoanCard({
  loan,
  thumbs,
  canEdit,
  onOpen,
  onReturn,
}: {
  loan: LoanRow;
  thumbs: Record<string, string>;
  canEdit: boolean;
  onOpen: (l: LoanRow) => void;
  onReturn: (l: LoanRow) => void;
}) {
  const overdue = isLoanOverdue(loan);
  const pending = loanOutstanding(loan);
  const Icon = categoryIcon(loan.item?.category);
  const thumb = loan.item?.image_path ? thumbs[loan.item.image_path] : undefined;
  const borrowerName = loan.borrower?.full_name ?? loan.borrower?.email ?? "—";
  const status: { label: string; variant: StatusVariant } = loan.returned_at
    ? { label: "Devuelto", variant: "approved" }
    : overdue
      ? { label: "Vencido", variant: "rejected" }
      : loan.returned_quantity > 0
        ? { label: "Parcial", variant: "pending" }
        : { label: "Activo", variant: "info" };

  return (
    <StandardCard
      interactive
      onClick={() => onOpen(loan)}
      title={`${loan.item?.name ?? "Artículo"} ×${loan.quantity}`}
      subtitle={loan.item?.category ?? SIN_CATEGORIA}
      status={status}
      className={cn(overdue && "border-destructive/50")}
      action={
        thumb ? (
          <img src={thumb} alt="" className="h-12 w-12 rounded-xl object-cover" loading="lazy" />
        ) : (
          <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/5 text-primary">
            <Icon className="h-5 w-5" />
          </span>
        )
      }
    >
      <div className="space-y-1.5">
        <div className="flex items-center gap-2">
          <Avatar className="h-6 w-6">
            <AvatarImage src={loan.borrower?.avatar_url ?? undefined} alt="" />
            <AvatarFallback>{borrowerName.slice(0, 1).toUpperCase()}</AvatarFallback>
          </Avatar>
          <span className="truncate text-foreground">{borrowerName}</span>
          {loan.team?.name ? <span className="text-muted-foreground">· {loan.team.name}</span> : null}
        </div>
        {loan.notes ? <p className="text-muted-foreground">Motivo: {loan.notes}</p> : null}
        <p className="text-muted-foreground">Prestado: {formatDateTime(loan.created_at)}</p>
        <p className={overdue ? "text-destructive" : "text-muted-foreground"}>
          Devolución esperada: {loan.expected_return_at ? formatDateTime(loan.expected_return_at) : "Sin fecha"}
        </p>
        {loan.returned_at ? (
          <p className="text-muted-foreground">Devuelto: {formatDateTime(loan.returned_at)}</p>
        ) : (
          <p className={loan.returned_quantity > 0 ? "text-amber-400" : "text-muted-foreground"}>
            Devueltas {loan.returned_quantity} de {loan.quantity} · pendientes {pending}
          </p>
        )}
        {canEdit && pending > 0 ? (
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="mt-1"
            onClick={(e) => {
              e.stopPropagation();
              onReturn(loan);
            }}
          >
            Registrar devolución
          </Button>
        ) : null}
      </div>
    </StandardCard>
  );
}

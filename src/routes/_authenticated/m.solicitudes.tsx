import * as React from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Plus, ClipboardList, Search, Package } from "lucide-react";
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
  useRequests, REQUEST_TYPE_LABEL, REQUEST_STATUS_LABEL,
  type RequestRow, type RequestStatus, type RequestType,
} from "@/hooks/useRequests";
import { formatDateTime } from "@/lib/calendar-utils";
import { RequestFormDialog } from "@/components/solicitudes/RequestFormDialog";
import { RequestDetailSheet } from "@/components/solicitudes/RequestDetailSheet";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/m/solicitudes")({
  head: () => ({
    meta: [
      { title: "Squad — Solicitudes" },
      { name: "description", content: "Peticiones, aprobaciones y flujos internos del club." },
    ],
  }),
  component: SolicitudesPage,
});

type ScopeFilter = "mias" | "todas" | "aprobar";
const STATUS_VARIANT: Record<RequestStatus, StatusVariant> = {
  pendiente: "pending",
  aprobada: "info",
  rechazada: "rejected",
  cancelada: "rejected",
  completada: "approved",
};

function SolicitudesPage() {
  const { permissions, isSuperAdmin, user, accessibleModules, profile } = useApp();
  const clubId = profile?.club_id ?? null;

  // Todos ven y pueden crear. Editor edita todo. Approver aprueba/rechaza.
  const canAccess = isSuperAdmin || accessibleModules.includes("solicitudes");
  const lvl = permissions.solicitudes;
  const canEditModule = isSuperAdmin || lvl === "editor";
  const canApprove = isSuperAdmin || lvl === "approver" || lvl === "editor";

  const requestsQ = useRequests(clubId);

  const [scope, setScope] = React.useState<ScopeFilter>("todas");
  const [typeFilter, setTypeFilter] = React.useState<"all" | RequestType>("all");
  const [statusFilter, setStatusFilter] = React.useState<"all" | RequestStatus>("all");
  const [search, setSearch] = React.useState("");

  const [dialog, setDialog] = React.useState(false);
  const [editing, setEditing] = React.useState<RequestRow | null>(null);
  const [detail, setDetail] = React.useState<RequestRow | null>(null);

  if (!canAccess) {
    return (
      <div className="space-y-6">
        <PageHeader hideTitle title="Solicitudes" subtitle="Peticiones internas" />
        <EmptyState icon={ClipboardList} title="Sin acceso" message="Tu rol actual no tiene permisos para este módulo." />
      </div>
    );
  }
  if (!clubId) return <LoadingState />;

  const all = requestsQ.data ?? [];
  const mine = all.filter((r) => r.requester_id === user.id);
  const pendingApprove = all.filter((r) => r.status === "pendiente");

  const base =
    scope === "mias" ? mine :
    scope === "aprobar" ? pendingApprove : all;

  const filtered = React.useMemo(() => {
    const q = search.trim().toLowerCase();
    return base.filter((r) => {
      if (typeFilter !== "all" && r.type !== typeFilter) return false;
      if (statusFilter !== "all" && r.status !== statusFilter) return false;
      if (!q) return true;
      return (
        r.title.toLowerCase().includes(q) ||
        (r.description ?? "").toLowerCase().includes(q) ||
        (r.requester?.full_name ?? "").toLowerCase().includes(q) ||
        (r.requester?.email ?? "").toLowerCase().includes(q)
      );
    });
  }, [base, search, typeFilter, statusFilter]);

  function openNew() { setEditing(null); setDialog(true); }

  return (
    <div className="space-y-6">
      <ModuleTabs activeKey="solicitudes" />
      <PageHeader hideTitle title="Solicitudes" subtitle="Ámbito club · peticiones y aprobaciones" />

      <Button onClick={openNew} className="w-full glow-primary">
        <Plus className="mr-2 h-4 w-4" /> Nueva solicitud
      </Button>

      <Tabs value={scope} onValueChange={(v) => setScope(v as ScopeFilter)} className="w-full">
        <TabsList>
          <TabsTrigger value="todas">Todas · {all.length}</TabsTrigger>
          <TabsTrigger value="mias">Mis solicitudes · {mine.length}</TabsTrigger>
          {canApprove ? (
            <TabsTrigger value="aprobar">Por aprobar · {pendingApprove.length}</TabsTrigger>
          ) : null}
        </TabsList>

        <TabsContent value={scope} className="mt-4 space-y-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar…" className="pl-8" />
            </div>
            <select
              className="rounded-lg border border-border/60 bg-background px-3 py-2 text-sm"
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value as any)}
            >
              <option value="all">Todos los tipos</option>
              {(Object.keys(REQUEST_TYPE_LABEL) as RequestType[]).map((t) => (
                <option key={t} value={t}>{REQUEST_TYPE_LABEL[t]}</option>
              ))}
            </select>
            <select
              className="rounded-lg border border-border/60 bg-background px-3 py-2 text-sm"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
            >
              <option value="all">Todos los estados</option>
              {(Object.keys(REQUEST_STATUS_LABEL) as RequestStatus[]).map((s) => (
                <option key={s} value={s}>{REQUEST_STATUS_LABEL[s]}</option>
              ))}
            </select>
          </div>

          {requestsQ.isLoading && all.length === 0 ? (
            <CardGridSkeleton count={3} />
          ) : filtered.length === 0 ? (
            <EmptyState
              icon={ClipboardList}
              title={all.length === 0 ? "Sin solicitudes" : "Sin resultados"}
              message={all.length === 0 ? "Crea la primera solicitud del club." : "Ajusta los filtros para ver más."}
              action={all.length === 0 ? (<Button onClick={openNew}><Plus className="mr-2 h-4 w-4" /> Nueva solicitud</Button>) : undefined}
            />
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {filtered.map((r, i) => (
                <div key={r.id} className="animate-card-in" style={{ animationDelay: `${i * 25}ms` }}>
                  <RequestCard request={r} onOpen={() => setDetail(r)} />
                </div>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      <RequestFormDialog
        open={dialog}
        onOpenChange={setDialog}
        clubId={clubId}
        userId={user.id}
        request={editing}
      />
      <RequestDetailSheet
        open={!!detail}
        onOpenChange={(o) => { if (!o) setDetail(null); }}
        request={detail}
        clubId={clubId}
        userId={user.id}
        canEditModule={canEditModule}
        canApprove={canApprove}
        onEdit={() => { if (detail) { setEditing(detail); setDetail(null); setDialog(true); } }}
      />
    </div>
  );
}

function RequestCard({ request, onOpen }: { request: RequestRow; onOpen: () => void }) {
  const status = { label: REQUEST_STATUS_LABEL[request.status], variant: STATUS_VARIANT[request.status] };
  const requester = request.requester?.full_name ?? request.requester?.email ?? "Miembro";
  const sub =
    (request.needed_at ? `Necesaria ${formatDateTime(request.needed_at)}` : `Creada ${formatDateTime(request.created_at)}`);
  const amount = request.amount != null ? `${request.amount.toFixed(2)} ${request.currency ?? ""}` : null;

  return (
    <StandardCard
      interactive
      onClick={onOpen}
      icon={request.type === "material" ? Package : ClipboardList}
      title={request.title}
      subtitle={`${REQUEST_TYPE_LABEL[request.type]} · ${sub}`}
      status={status}
      className={cn(request.status === "pendiente" && "ring-1 ring-status-pending/30")}
    >
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
        <span className="text-foreground/80">{requester}</span>
        {amount ? <span>· {amount}</span> : null}
        {request.item?.name ? <span className="truncate max-w-[160px]">· {request.item.name}</span> : null}
        {request.event?.title ? <span className="truncate max-w-[160px]">· {request.event.title}</span> : null}
      </div>
    </StandardCard>
  );
}

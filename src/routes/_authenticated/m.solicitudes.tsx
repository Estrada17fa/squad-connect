import * as React from "react";
import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import { Plus, ClipboardList, BellRing } from "lucide-react";
import { PageHeader } from "@/components/squad/PageHeader";
import { ModuleTabs } from "@/components/squad/ModuleTabs";
import { EmptyState } from "@/components/squad/EmptyState";
import { LoadingState, CardGridSkeleton } from "@/components/squad/LoadingState";
import { StandardCard } from "@/components/squad/StandardCard";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useApp } from "@/components/squad/AppLayout";
import { useRequests, type RequestRow } from "@/hooks/useRequests";
import { useMyApproverTypes } from "@/hooks/useRequestApprovers";
import {
  REQUEST_TYPES,
  REQUEST_TYPE_MAP,
  STATUS_LABEL,
  STATUS_VARIANT,
  STATUS_ORDER,
  formatMoney,
  type RequestStatus,
  type RequestType,
} from "@/lib/requestTypes";
import { formatDateTime } from "@/lib/calendar-utils";
import { RequestFormDialog } from "@/components/solicitudes/RequestFormDialog";
import { RequestTypePicker } from "@/components/solicitudes/RequestTypePicker";
import { RequestDetailSheet } from "@/components/solicitudes/RequestDetailSheet";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/m/solicitudes")({
  head: () => ({
    meta: [
      { title: "Squad — Solicitudes" },
      { name: "description", content: "Peticiones del club y su flujo de aprobación." },
      { property: "og:title", content: "Squad — Solicitudes" },
      { property: "og:description", content: "Peticiones del club y su flujo de aprobación." },
    ],
  }),
  component: SolicitudesPage,
});

function SolicitudesPage() {
  const { user, profile, isSuperAdmin, getModuleAccess, activeBaseRole } = useApp();
  const clubId = profile?.club_id ?? null;

  const level = getModuleAccess("solicitudes");
  const canManage = isSuperAdmin || level === "editor" || level === "approver";
  const myApproverTypes = useMyApproverTypes(clubId, user.id, isSuperAdmin);
  const isApproverOf = React.useCallback(
    (type: RequestType) => myApproverTypes.has(type),
    [myApproverTypes],
  );
  const approvesSomething = REQUEST_TYPES.some((t) => isApproverOf(t.key));
  const canAccess = isSuperAdmin || level !== "none" || approvesSomething;
  const canSeeAll = canManage || approvesSomething;

  const isPlayer = activeBaseRole === "jugador" && !isSuperAdmin;
  const allowedTypes = React.useMemo<RequestType[]>(
    () => REQUEST_TYPES.filter((t) => (isPlayer ? t.playerAllowed : true)).map((t) => t.key),
    [isPlayer],
  );

  const requestsQ = useRequests(clubId);

  const [tab, setTab] = React.useState<"mias" | "todas">("mias");
  const [picker, setPicker] = React.useState(false);
  const [formType, setFormType] = React.useState<RequestType | null>(null);
  const [editing, setEditing] = React.useState<RequestRow | null>(null);
  const [detailId, setDetailId] = React.useState<string | null>(null);
  const [typeFilter, setTypeFilter] = React.useState<"all" | RequestType>("all");
  const [statusFilter, setStatusFilter] = React.useState<"all" | RequestStatus>("all");

  if (!canAccess) {
    return (
      <div className="space-y-6">
        <PageHeader hideTitle title="Solicitudes" subtitle="Peticiones del club" />
        <EmptyState icon={ClipboardList} title="Sin acceso" message="Tu rol actual no tiene permisos para este módulo." />
      </div>
    );
  }

  if (!clubId) return <LoadingState />;

  const all = requestsQ.data ?? [];
  const mine = all.filter((r) => r.requester_id === user.id);
  const filtered = all.filter(
    (r) =>
      (typeFilter === "all" || r.type === typeFilter) &&
      (statusFilter === "all" || r.status === statusFilter),
  );
  const detail = detailId ? all.find((r) => r.id === detailId) ?? null : null;

  // Pendientes que a mí me toca aprobar (resaltadas).
  const toApprove = all.filter(
    (r) => r.status === "pendiente" && r.requester_id !== user.id && isApproverOf(r.type),
  );
  const toApproveIds = new Set(toApprove.map((r) => r.id));

  function openCreate() {
    setEditing(null);
    setPicker(true);
  }

  return (
    <div className="space-y-6">
      <ModuleTabs activeKey="solicitudes" />
      <PageHeader hideTitle title="Solicitudes" subtitle="Ámbito club · peticiones y aprobaciones" />

      <Button onClick={openCreate} className="w-full glow-primary">
        <Plus className="mr-2 h-4 w-4" /> Nueva solicitud
      </Button>

      {toApprove.length > 0 ? (
        <div className="glass flex items-center gap-3 border-primary/30 p-3">
          <BellRing className="h-4 w-4 shrink-0 text-primary" />
          <p className="text-sm text-foreground">
            Tienes <span className="font-semibold text-primary">{toApprove.length}</span>{" "}
            {toApprove.length === 1 ? "solicitud pendiente" : "solicitudes pendientes"} por aprobar.
          </p>
        </div>
      ) : null}

      <Tabs value={tab} onValueChange={(v) => setTab(v as any)} className="w-full">
        <TabsList>
          <TabsTrigger value="mias">Mis solicitudes</TabsTrigger>
          {canSeeAll ? <TabsTrigger value="todas">Todas</TabsTrigger> : null}
        </TabsList>

        <TabsContent value="mias" className="mt-4 space-y-3">
          <RequestList
            requests={mine}
            isLoading={requestsQ.isLoading}
            highlighted={toApproveIds}
            onOpen={(r) => setDetailId(r.id)}
            onCreate={openCreate}
            emptyMessage="Aún no has creado ninguna solicitud."
          />
        </TabsContent>

        {canSeeAll ? (
          <TabsContent value="todas" className="mt-4 space-y-3">
            <div className="space-y-2">
              <Chips
                value={typeFilter}
                onChange={(v) => setTypeFilter(v as any)}
                options={[
                  { key: "all", label: "Todos los tipos" },
                  ...REQUEST_TYPES.map((t) => ({ key: t.key, label: t.label })),
                ]}
              />
              <Chips
                value={statusFilter}
                onChange={(v) => setStatusFilter(v as any)}
                options={[
                  { key: "all", label: "Todos los estatus" },
                  ...STATUS_ORDER.map((s) => ({ key: s, label: STATUS_LABEL[s] })),
                ]}
              />
            </div>
            <RequestList
              requests={filtered}
              isLoading={requestsQ.isLoading}
              highlighted={toApproveIds}
              onOpen={(r) => setDetailId(r.id)}
              onCreate={openCreate}
              emptyMessage="No hay solicitudes con estos filtros."
            />
          </TabsContent>
        ) : null}
      </Tabs>

      <RequestTypePicker
        open={picker}
        onOpenChange={setPicker}
        allowedTypes={allowedTypes}
        onPick={(t) => {
          setPicker(false);
          setEditing(null);
          setFormType(t);
        }}
      />

      <RequestFormDialog
        open={!!formType}
        onOpenChange={(o) => { if (!o) { setFormType(null); setEditing(null); } }}
        clubId={clubId}
        userId={user.id}
        type={formType ?? "otro"}
        request={editing}
        onSaved={({ isEdit, type }) => {
          if (isEdit) return;
          if (tab === "todas" && (typeFilter !== "all" && typeFilter !== type)) {
            setTypeFilter("all");
            setStatusFilter("all");
            toast.info("Ajusté los filtros para que veas la solicitud que acabas de crear");
          }
          if (tab !== "mias" && tab !== "todas") setTab("mias");
        }}
      />

      <RequestDetailSheet
        open={!!detail}
        onOpenChange={(o) => { if (!o) setDetailId(null); }}
        request={detail}
        userId={user.id}
        clubId={clubId}
        canDecide={detail ? isApproverOf(detail.type) : false}
        canManage={canManage}
        onEdit={() => {
          if (!detail) return;
          setEditing(detail);
          setDetailId(null);
          setFormType(detail.type);
        }}
      />
    </div>
  );
}

function Chips({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { key: string; label: string }[];
}) {
  return (
    <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {options.map((o) => (
        <button
          key={o.key}
          type="button"
          onClick={() => onChange(o.key)}
          className={cn(
            "shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
            value === o.key
              ? "border-primary bg-primary/10 text-primary"
              : "border-border/60 text-muted-foreground hover:bg-white/[0.04]",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function RequestList({
  requests,
  isLoading,
  highlighted,
  onOpen,
  onCreate,
  emptyMessage,
}: {
  requests: RequestRow[];
  isLoading: boolean;
  highlighted: Set<string>;
  onOpen: (r: RequestRow) => void;
  onCreate: () => void;
  emptyMessage: string;
}) {
  if (isLoading) return <CardGridSkeleton />;
  if (requests.length === 0) {
    return (
      <EmptyState
        icon={ClipboardList}
        title="Sin solicitudes"
        message={emptyMessage}
        action={
          <Button onClick={onCreate} className="glow-primary">
            <Plus className="mr-2 h-4 w-4" /> Nueva solicitud
          </Button>
        }
      />
    );
  }
  return (
    <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
      {requests.map((r) => {
        const def = REQUEST_TYPE_MAP[r.type];
        const money = formatMoney(r.amount, r.currency);
        return (
          <StandardCard
            key={r.id}
            interactive
            icon={def.icon}
            title={r.title}
            subtitle={`${def.label} · ${r.requester?.full_name ?? r.requester?.email ?? "—"}`}
            status={{ label: STATUS_LABEL[r.status], variant: STATUS_VARIANT[r.status] }}
            onClick={() => onOpen(r)}
            className={cn(highlighted.has(r.id) && "border-primary/40 ring-1 ring-primary/25")}
          >
            <div className="space-y-1">
              {def.fields.map((f) => {
                const v = r.details?.[f.key];
                if (v === undefined || v === null || v === "") return null;
                return (
                  <div key={f.key} className="flex items-start justify-between gap-3">
                    <span className="text-xs text-muted-foreground">{f.label}</span>
                    <span className="text-right text-xs text-foreground">
                      {f.type === "money"
                        ? formatMoney(Number(v), r.currency)
                        : f.type === "datetime"
                          ? formatDateTime(String(v))
                          : String(v)}
                    </span>
                  </div>
                );
              })}
              <div className="flex items-center justify-between gap-3 pt-1 text-xs text-muted-foreground">
                <span>{formatDateTime(r.created_at)}</span>
                {money ? <span className="text-foreground">{money}</span> : null}
              </div>
            </div>
          </StandardCard>
        );
      })}
    </div>
  );
}

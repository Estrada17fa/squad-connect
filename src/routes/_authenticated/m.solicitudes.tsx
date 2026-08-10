import * as React from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, ClipboardList, BellRing } from "lucide-react";
import { PageHeader } from "@/components/squad/PageHeader";
import { ModuleTabs } from "@/components/squad/ModuleTabs";
import { EmptyState } from "@/components/squad/EmptyState";
import { LoadingState, CardGridSkeleton } from "@/components/squad/LoadingState";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useApp } from "@/components/squad/AppLayout";
import { useRequests, type RequestRow } from "@/hooks/useRequests";
import { useMyApproverTypes } from "@/hooks/useRequestApprovers";
import {
  REQUEST_TYPES,
  REQUEST_TYPE_MAP,
  requestSummary,
  type RequestStatus,
  type RequestType,
} from "@/lib/requestTypes";
import { RequestFormDialog } from "@/components/solicitudes/RequestFormDialog";
import { RequestTypePicker } from "@/components/solicitudes/RequestTypePicker";
import { RequestDetailSheet } from "@/components/solicitudes/RequestDetailSheet";
import {
  RequestFilters,
  EMPTY_REQUEST_FILTERS,
  type RequestFilterState,
} from "@/components/solicitudes/RequestFilters";
import { RequestGroupList, type RequestGroup } from "@/components/solicitudes/RequestGroupList";
import {
  canEdit as levelCanEdit,
  canRead as levelCanRead,
  isGlobalLevel,
  isPlayerView,
} from "@/lib/permissions";
import { useTeamAccess } from "@/hooks/useTeamAccess";

export const Route = createFileRoute("/_authenticated/m/solicitudes")({
  validateSearch: (search: Record<string, unknown>) => ({
    open: typeof search.open === "string" ? search.open : undefined,
  }),
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
  const { user, profile, isSuperAdmin, getModuleAccess, activeBaseRole, permissionsByTeam, teamOptions } = useApp();
  const clubId = profile?.club_id ?? null;
  const qc = useQueryClient();

  const level = getModuleAccess("solicitudes");
  const canManage = isSuperAdmin || levelCanEdit(level);
  const { levelForTeam } = useTeamAccess("solicitudes");

  /** Categorías donde la persona tiene membresía (alcance de los niveles "categoría"). */
  const scopeOk = React.useCallback(
    (teamId: string | null) => isSuperAdmin || teamId === null || Boolean(permissionsByTeam?.[teamId]),
    [isSuperAdmin, permissionsByTeam],
  );
  const rowLevel = React.useCallback((teamId: string | null) => levelForTeam(teamId), [levelForTeam]);
  const canReadRow = React.useCallback(
    (teamId: string | null) => {
      const lvl = rowLevel(teamId);
      if (isSuperAdmin) return true;
      if (isPlayerView(lvl)) return false; // vista jugador: solo lo suyo
      if (isGlobalLevel(lvl)) return levelCanRead(lvl);
      return levelCanRead(lvl) && scopeOk(teamId);
    },
    [rowLevel, isSuperAdmin, scopeOk],
  );
  const canManageRow = React.useCallback(
    (teamId: string | null) => {
      const lvl = rowLevel(teamId);
      if (isSuperAdmin) return true;
      if (isGlobalLevel(lvl)) return levelCanEdit(lvl);
      return levelCanEdit(lvl) && scopeOk(teamId);
    },
    [rowLevel, isSuperAdmin, scopeOk],
  );

  const myApproverTypes = useMyApproverTypes(clubId, user.id, isSuperAdmin, getModuleAccess);
  const isApproverOf = React.useCallback((type: RequestType) => myApproverTypes.has(type), [myApproverTypes]);
  const approvesSomething = REQUEST_TYPES.some((t) => isApproverOf(t.key));
  const canAccess = isSuperAdmin || levelCanRead(level) || approvesSomething;
  /** Alcance más allá de lo propio: cualquier nivel de lectura que no sea vista jugador. */
  const canSeeAll = isSuperAdmin || (levelCanRead(level) && !isPlayerView(level)) || approvesSomething;

  const isPlayer = activeBaseRole === "jugador" && !isSuperAdmin;
  const allowedTypes = React.useMemo<RequestType[]>(
    () => REQUEST_TYPES.filter((t) => (isPlayer ? t.playerAllowed : true)).map((t) => t.key),
    [isPlayer],
  );

  const requestsQ = useRequests(clubId);

  const [picker, setPicker] = React.useState(false);
  const [formType, setFormType] = React.useState<RequestType | null>(null);
  const [editing, setEditing] = React.useState<RequestRow | null>(null);
  const [detailId, setDetailId] = React.useState<string | null>(null);
  const [filters, setFilters] = React.useState<RequestFilterState>(EMPTY_REQUEST_FILTERS);

  // Deep-link desde el centro de notificaciones: /m/solicitudes?open=<id>
  const { open: openParam } = Route.useSearch();
  const navigate = useNavigate();
  React.useEffect(() => {
    if (!openParam) return;
    setDetailId(openParam);
    navigate({ to: "/m/solicitudes", search: () => ({ open: undefined }), replace: true });
  }, [openParam, navigate]);

  const decide = useMutation({
    mutationFn: async ({ id, next }: { id: string; next: RequestStatus }) => {
      const patch: Record<string, any> = { status: next };
      if (next === "aprobada" || next === "rechazada") {
        patch.decided_by = user.id;
        patch.decided_at = new Date().toISOString();
      }
      const { error } = await supabase.from("requests").update(patch as never).eq("id", id);
      if (error) throw error;
      return next;
    },
    onSuccess: (next) => {
      const msg: Record<string, string> = {
        aprobada: "Solicitud aprobada",
        rechazada: "Solicitud rechazada",
        requiere_info: "Se pidió más información al solicitante",
      };
      toast.success(msg[next] ?? "Solicitud actualizada");
      qc.invalidateQueries({ queryKey: ["requests", clubId] });
    },
    onError: (e: any) => toast.error(e.message ?? "No se pudo actualizar"),
  });

  if (!canAccess) {
    return (
      <div className="space-y-6">
        <PageHeader hideTitle title="Solicitudes" subtitle="Peticiones del club" />
        <EmptyState icon={ClipboardList} title="Sin acceso" message="Tu rol actual no tiene permisos para este módulo." />
      </div>
    );
  }

  if (!clubId) return <LoadingState />;

  const rows = requestsQ.data ?? [];
  // Visibilidad: propio, alcance de lectura del nivel, o aprobador con alcance.
  const all = rows.filter(
    (r) =>
      r.requester_id === user.id ||
      canReadRow(r.team_id) ||
      (isApproverOf(r.type) && scopeOk(r.team_id)),
  );

  const scoped = canSeeAll && !filters.mine ? all : all.filter((r) => r.requester_id === user.id);
  const term = filters.search.trim().toLowerCase();
  const visible = scoped.filter((r) => {
    if (filters.type && r.type !== filters.type) return false;
    if (filters.status && r.status !== filters.status) return false;
    if (filters.teamId) {
      if (filters.teamId === "__club__" ? r.team_id !== null : r.team_id !== filters.teamId) return false;
    }
    if (!term) return true;
    const who = `${r.requester?.full_name ?? ""} ${r.requester?.email ?? ""}`.toLowerCase();
    return (
      requestSummary(r).toLowerCase().includes(term) ||
      r.title.toLowerCase().includes(term) ||
      REQUEST_TYPE_MAP[r.type].label.toLowerCase().includes(term) ||
      who.includes(term)
    );
  });

  const canDecideRow = (r: RequestRow) =>
    r.requester_id !== user.id && isApproverOf(r.type) && scopeOk(r.team_id) && canManageRow(r.team_id);

  const toApprove = visible.filter((r) => r.status === "pendiente" && canDecideRow(r));
  const toApproveIds = new Set(toApprove.map((r) => r.id));
  const allToApprove = all.filter((r) => r.status === "pendiente" && canDecideRow(r));

  const byStatus = (s: RequestStatus, exclude?: Set<string>) =>
    visible.filter((r) => r.status === s && !(exclude?.has(r.id) ?? false));

  const quick = {
    onApprove: (r: RequestRow) => decide.mutate({ id: r.id, next: "aprobada" }),
    onReject: (r: RequestRow) => decide.mutate({ id: r.id, next: "rechazada" }),
    onAskInfo: (r: RequestRow) => decide.mutate({ id: r.id, next: "requiere_info" }),
  };

  const groups: RequestGroup[] = [
    { key: "por_aprobar", label: "Por aprobar", requests: toApprove, quick, accent: true },
    { key: "pendiente", label: "Pendientes", requests: byStatus("pendiente", toApproveIds) },
    { key: "requiere_info", label: "Requieren información", requests: byStatus("requiere_info") },
    { key: "aprobada", label: "Aprobadas", requests: byStatus("aprobada") },
    { key: "rechazada", label: "Rechazadas", requests: byStatus("rechazada") },
    { key: "completada", label: "Completadas", requests: byStatus("completada") },
    { key: "cancelada", label: "Canceladas", requests: byStatus("cancelada") },
  ].filter((g) => g.requests.length > 0);

  const detail = detailId ? all.find((r) => r.id === detailId) ?? null : null;
  const myTeamIds = teamOptions.map((t) => t.id).filter(Boolean) as string[];

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

      {allToApprove.length > 0 ? (
        <div className="glass flex items-center gap-3 border-primary/30 p-3">
          <BellRing className="h-4 w-4 shrink-0 text-primary" />
          <p className="text-sm text-foreground">
            Tienes <span className="font-semibold text-primary">{allToApprove.length}</span>{" "}
            {allToApprove.length === 1 ? "solicitud pendiente" : "solicitudes pendientes"} por aprobar.
          </p>
        </div>
      ) : null}

      <RequestFilters
        value={filters}
        onChange={setFilters}
        teams={teamOptions.filter((t) => t.id).map((t) => ({ id: t.id as string, name: t.name }))}
        count={visible.length}
        showScope={canSeeAll}
      />

      {requestsQ.isLoading ? (
        <CardGridSkeleton />
      ) : groups.length === 0 ? (
        <EmptyState
          icon={ClipboardList}
          title="Sin solicitudes"
          message={
            filters.mine ? "Aún no has creado ninguna solicitud." : "No hay solicitudes con estos filtros."
          }
          action={
            <Button onClick={openCreate} className="glow-primary">
              <Plus className="mr-2 h-4 w-4" /> Nueva solicitud
            </Button>
          }
        />
      ) : (
        <RequestGroupList
          groups={groups}
          onOpen={(r) => setDetailId(r.id)}
          highlighted={toApproveIds}
          busy={decide.isPending}
        />
      )}

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
        defaultTeamId={
          filters.teamId && filters.teamId !== "__club__"
            ? filters.teamId
            : myTeamIds.length === 1
              ? myTeamIds[0]
              : null
        }
        allowedTeamIds={isSuperAdmin || isGlobalLevel(level) ? null : myTeamIds}
        onSaved={({ isEdit, type }) => {
          if (isEdit) return;
          if (filters.type && filters.type !== type) {
            setFilters((f) => ({ ...f, type: null, status: null }));
            toast.info("Ajusté los filtros para que veas la solicitud que acabas de crear");
          }
        }}
      />

      <RequestDetailSheet
        open={!!detail}
        onOpenChange={(o) => { if (!o) setDetailId(null); }}
        request={detail}
        userId={user.id}
        clubId={clubId}
        canDecide={detail ? isApproverOf(detail.type) && scopeOk(detail.team_id) && canManageRow(detail.team_id) : false}
        canManage={detail ? canManageRow(detail.team_id) : false}
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

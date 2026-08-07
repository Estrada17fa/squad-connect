import * as React from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Check,
  X as XIcon,
  Pencil,
  Trash2,
  Ban,
  PackageCheck,
  History,
  AlertTriangle,
  Link as LinkIcon,
  Receipt,
  Stethoscope,
} from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import {
  useClubTeams,
  useInventoryCatalog,
  useInventoryThumbnails,
  useRequestAttachmentUrl,
  useRequestLoan,
  loanOutstanding,
} from "@/hooks/useInventory";
import { LoanFormDialog } from "@/components/inventario/LoanFormDialog";
import { ExpenseFormDialog } from "@/components/compras/ExpenseFormDialog";
import { useRequestExpense } from "@/hooks/useExpenses";
import { expenseDraftFromRequest, formatMoney as formatExpenseMoney } from "@/lib/expenses";
import { useApp } from "@/components/squad/AppLayout";
import { useTeamAccess } from "@/hooks/useTeamAccess";
import { useMedicalRoster, useRequestCheckup } from "@/hooks/useHealth";
import { CheckupFormDialog } from "@/components/salud/CheckupFormDialog";
import { loanDraftFromRequest } from "@/lib/requestTypes";
import { categoryIcon } from "./InventoryItemPicker";

import {
  EntitySheet,
  EntitySheetBody,
  EntitySheetDescription,
  EntitySheetHeader,
  EntitySheetTitle,
} from "@/components/squad/EntitySheet";
import { StatusBadge } from "@/components/squad/StatusBadge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { formatDateTime } from "@/lib/calendar-utils";
import {
  REQUEST_TYPE_MAP,
  STATUS_LABEL,
  STATUS_VARIANT,
  STATUS_EXTRA_CLASS,
  formatMoney,
  type RequestStatus,
  requestSummary,
} from "@/lib/requestTypes";
import { useRequestHistory, type RequestRow } from "@/hooks/useRequests";
import { useRequestTypeApprovers } from "@/hooks/useRequestApprovers";

import { cn } from "@/lib/utils";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  request: RequestRow | null;
  userId: string;
  clubId: string;
  /** Puede aprobar/rechazar este tipo (approver del módulo asociado). */
  canDecide: boolean;
  /** Editor del módulo 'solicitudes' (puede marcar completada). */
  canManage: boolean;
  onEdit: () => void;
}

function fieldDisplay(value: any, type: string, currency?: string | null) {
  if (value === null || value === undefined || value === "") return "—";
  if (type === "money") return formatMoney(Number(value), currency) ?? String(value);
  if (type === "datetime") return formatDateTime(String(value));
  if (type === "date") {
    const d = new Date(`${value}T00:00:00`);
    return Number.isNaN(d.getTime())
      ? String(value)
      : d.toLocaleDateString("es-MX", { day: "2-digit", month: "long", year: "numeric" });
  }
  return String(value);
}

export function RequestDetailSheet({
  open,
  onOpenChange,
  request,
  userId,
  clubId,
  canDecide,
  canManage,
  onEdit,
}: Props) {
  const qc = useQueryClient();
  const historyQ = useRequestHistory(open && request ? request.id : null);
  const approversQ = useRequestTypeApprovers(
    open && request ? clubId : null,
    open && request ? request.type : null,
  );
  const [note, setNote] = React.useState("");
  const [loanOpen, setLoanOpen] = React.useState(false);
  const [expenseOpen, setExpenseOpen] = React.useState(false);
  const [checkupOpen, setCheckupOpen] = React.useState(false);
  const teamsQ = useClubTeams(open && request ? clubId : null);


  // El préstamo es una acción de Inventario: manda el permiso del módulo 'inventario'.
  const { permissions, isSuperAdmin } = useApp();
  const invLevel = permissions.inventario;
  const canCreateLoan = isSuperAdmin || invLevel === "editor" || invLevel === "approver";

  const isMaterial = request?.type === "material";
  const loanQ = useRequestLoan(open && request && isMaterial ? request.id : null);
  const linkedLoan = loanQ.data ?? null;

  // Compras y facturas: el gasto lo registra a mano quien maneja finanzas.
  const isFinancial =
    request?.type === "compra" || request?.type === "pago_proveedor" || request?.type === "reembolso";
  const expLevel = permissions.compras_facturas;
  const canCreateExpense = isSuperAdmin || expLevel === "editor" || expLevel === "approver";
  const expenseQ = useRequestExpense(open && request && isFinancial ? request.id : null);
  const linkedExpense = expenseQ.data ?? null;

  // Salud: la revisión médica la registra un editor de 'salud' del equipo del jugador.
  const isMedical = request?.type === "medica";
  const { canEditTeam: canEditSalud } = useTeamAccess("salud");
  const medicalRosterQ = useMedicalRoster(open && isMedical ? clubId : null);
  const medicalPlayers = React.useMemo(
    () => (medicalRosterQ.data ?? []).filter((p) => canEditSalud(p.teamId)),
    [medicalRosterQ.data, canEditSalud],
  );
  const canCreateCheckup = medicalPlayers.length > 0;
  const checkupQ = useRequestCheckup(open && request && isMedical ? request.id : null);
  const linkedCheckup = checkupQ.data ?? null;

  React.useEffect(() => {
    if (open) setNote("");
    if (!open) {
      setLoanOpen(false);
      setExpenseOpen(false);
      setCheckupOpen(false);
    }
  }, [open, request?.id]);


  const setStatus = useMutation({
    mutationFn: async (next: RequestStatus) => {
      const patch: Record<string, any> = { status: next };
      if (next === "aprobada" || next === "rechazada") {
        patch.decided_by = userId;
        patch.decided_at = new Date().toISOString();
        patch.decision_note = note.trim() || null;
      }
      const { error } = await supabase.from("requests").update(patch as never).eq("id", request!.id);
      if (error) throw error;
      return next;
    },
    onSuccess: (next) => {
      const msg: Record<string, string> = {
        aprobada: "Solicitud aprobada",
        rechazada: "Solicitud rechazada",
        cancelada: "Solicitud cancelada",
        completada: "Solicitud completada",
      };
      toast.success(msg[next] ?? "Solicitud actualizada");
      qc.invalidateQueries({ queryKey: ["requests", clubId] });
      qc.invalidateQueries({ queryKey: ["request-history", request!.id] });
      setNote("");
      // Aprobar material abre de inmediato el formulario de préstamo pre-llenado.
      if (next === "aprobada" && isMaterial && canCreateLoan && !linkedLoan) setLoanOpen(true);
      if (next === "aprobada" && isFinancial && canCreateExpense && !linkedExpense) setExpenseOpen(true);
      if (next === "aprobada" && isMedical && canCreateCheckup && !linkedCheckup) setCheckupOpen(true);

    },
    onError: (e: any) => toast.error(e.message ?? "No se pudo actualizar"),
  });

  const remove = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("requests").delete().eq("id", request!.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Solicitud eliminada");
      qc.invalidateQueries({ queryKey: ["requests", clubId] });
      onOpenChange(false);
    },
    onError: (e: any) => toast.error(e.message ?? "No se pudo eliminar"),
  });


  if (!request) return null;

  const def = REQUEST_TYPE_MAP[request.type];
  const Icon = def.icon;
  const isOwner = request.requester_id === userId;
  const isPending = request.status === "pendiente";
  // Regla infranqueable: nadie decide su propia solicitud (también forzado en el servidor).
  const showDecision = canDecide && isPending && !isOwner;
  const canCancel = isOwner && isPending;
  const isApproved = request.status === "aprobada";
  // El material se completa registrando el préstamo real, no a mano.
  const showLoanButton = isMaterial && isApproved && !linkedLoan && canCreateLoan;
  // El gasto es la forma de completar compras, pagos a proveedor y reembolsos.
  const showExpenseButton = isFinancial && isApproved && !linkedExpense && canCreateExpense;
  // La solicitud médica se completa registrando la revisión.
  const showCheckupButton = isMedical && isApproved && !linkedCheckup && canCreateCheckup;
  const canComplete =
    canManage && def.completable && isApproved && !isMaterial && !isFinancial && !isMedical;
  const canEditRow = isOwner && isPending;


  return (
    <>
    <EntitySheet open={open} onOpenChange={onOpenChange}>

      <EntitySheetHeader>
        <EntitySheetTitle>{requestSummary(request)}</EntitySheetTitle>
        <EntitySheetDescription>
          {def.label} · Solicitada por {request.requester?.full_name ?? request.requester?.email ?? "—"}
        </EntitySheetDescription>
      </EntitySheetHeader>

      <EntitySheetBody>
        {/* Acciones arriba */}
        {(canEditRow || canManage || canCancel || showLoanButton || showExpenseButton || showCheckupButton) && (
          <div className="flex flex-wrap gap-2">
            {canEditRow ? (
              <Button type="button" variant="outline" size="sm" onClick={onEdit}>
                <Pencil className="mr-2 h-4 w-4" /> Editar
              </Button>
            ) : null}
            {canCancel ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setStatus.mutate("cancelada")}
                disabled={setStatus.isPending}
              >
                <Ban className="mr-2 h-4 w-4" /> Cancelar solicitud
              </Button>
            ) : null}
            {showLoanButton ? (
              <Button
                type="button"
                size="sm"
                className="glow-primary"
                onClick={() => setLoanOpen(true)}
              >
                <PackageCheck className="mr-2 h-4 w-4" /> Generar préstamo
              </Button>
            ) : null}
            {showExpenseButton ? (
              <Button type="button" size="sm" className="glow-primary" onClick={() => setExpenseOpen(true)}>
                <Receipt className="mr-2 h-4 w-4" /> Registrar gasto
              </Button>
            ) : null}
            {showCheckupButton ? (
              <Button type="button" size="sm" className="glow-primary" onClick={() => setCheckupOpen(true)}>
                <Stethoscope className="mr-2 h-4 w-4" /> Registrar revisión
              </Button>
            ) : null}
            {canComplete ? (
              <Button type="button" size="sm" onClick={() => setStatus.mutate("completada")} disabled={setStatus.isPending}>
                <PackageCheck className="mr-2 h-4 w-4" /> Marcar completada
              </Button>
            ) : null}

            {canManage ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                onClick={() => remove.mutate()}
                disabled={remove.isPending}
              >
                <Trash2 className="mr-2 h-4 w-4" /> Eliminar
              </Button>
            ) : null}
          </div>
        )}

        <div className="glass flex items-center gap-3 p-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/5 text-primary">
            <Icon className="h-5 w-5" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-xs text-muted-foreground">Creada el {formatDateTime(request.created_at)}</p>
          </div>
          <StatusBadge
            variant={STATUS_VARIANT[request.status]}
            className={STATUS_EXTRA_CLASS[request.status]}
          >
            {STATUS_LABEL[request.status]}
          </StatusBadge>
        </div>

        {approversQ.isLoading ? null : (approversQ.data ?? []).filter((a) => a.id !== request.requester_id).length === 0 ? (
          <div className="flex items-start gap-2 rounded-lg border border-amber-400/40 bg-amber-400/10 p-3 text-xs text-amber-200">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>
              Nadie puede aprobar esta solicitud ahora mismo. Asigna a alguien como aprobador de
              “{def.label}” en Usuarios (por rol o de forma individual).
            </span>
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">
            <span className="uppercase tracking-wide">Aprueban:</span>{" "}
            {(approversQ.data ?? [])
              .filter((a) => a.id !== request.requester_id)
              .map((a) => a.name)
              .join(", ")}
          </p>
        )}



        <div className="space-y-2">
          {def.fields.map((f) => (
            <div key={f.key} className="flex items-start justify-between gap-4 border-b border-border/40 pb-2">
              <span className="text-xs uppercase tracking-wide text-muted-foreground">{f.label}</span>
              <span className="text-right text-sm text-foreground">
                {f.type === "item" ? (
                  <ItemValue name={request.details?.articulo} itemId={request.details?.item_id} clubId={clubId} />
                ) : f.type === "team" ? (
                  <>{teamsQ.data?.find((t) => t.id === request.details?.[f.key])?.name ?? "—"}</>
                ) : f.type === "url" ? (
                  <LinkValue url={request.details?.[f.key]} />
                ) : f.type === "image" ? (
                  <PhotoValue path={request.details?.[f.key]} />

                ) : (
                  fieldDisplay(request.details?.[f.key], f.type, request.currency)
                )}
              </span>
            </div>
          ))}
          {request.description ? (
            <div className="pt-1">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Notas</p>
              <p className="mt-1 whitespace-pre-wrap text-sm text-foreground">{request.description}</p>
            </div>
          ) : null}
        </div>

        {request.decided_at ? (
          <div className="glass p-3 text-sm">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Decisión</p>
            <p className="mt-1 text-foreground">
              {STATUS_LABEL[request.status]} por {request.decider?.full_name ?? "—"} · {formatDateTime(request.decided_at)}
            </p>
            {request.decision_note ? (
              <p className="mt-1 whitespace-pre-wrap text-muted-foreground">{request.decision_note}</p>
            ) : null}
          </div>
        ) : null}

        {showDecision ? (
          <div className="glass space-y-2 p-3">
            <Label htmlFor="req-note">Nota de la decisión (opcional)</Label>
            <Textarea id="req-note" rows={2} value={note} onChange={(e) => setNote(e.target.value)} />
            <div className="flex gap-2">
              <Button
                type="button"
                className="flex-1"
                onClick={() => setStatus.mutate("aprobada")}
                disabled={setStatus.isPending}
              >
                <Check className="mr-2 h-4 w-4" /> Aprobar
              </Button>
              <Button
                type="button"
                variant="outline"
                className="flex-1 text-destructive hover:bg-destructive/10 hover:text-destructive"
                onClick={() => setStatus.mutate("rechazada")}
                disabled={setStatus.isPending}
              >
                <XIcon className="mr-2 h-4 w-4" /> Rechazar
              </Button>
            </div>
          </div>
        ) : null}

        {canDecide && isPending && isOwner ? (
          <p className="text-xs text-muted-foreground">
            No puedes aprobar tu propia solicitud; otro aprobador debe decidirla.
          </p>
        ) : null}

        <div className="space-y-2">
          <p className="flex items-center gap-2 text-xs uppercase tracking-wide text-muted-foreground">
            <History className="h-3.5 w-3.5" /> Historial
          </p>
          {(historyQ.data ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground">Sin cambios de estatus todavía.</p>
          ) : (
            <ol className="space-y-2">
              {(historyQ.data ?? []).map((h) => (
                <li key={h.id} className="flex items-start gap-3 text-sm">
                  <span className={cn("mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary")} />
                  <div className="min-w-0">
                    <p className="text-foreground">
                      {h.from_status ? `${STATUS_LABEL[h.from_status]} → ` : ""}
                      {STATUS_LABEL[h.to_status]}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatDateTime(h.created_at)}
                      {h.actor ? ` · ${h.actor.full_name ?? h.actor.email}` : ""}
                    </p>
                    {h.note ? <p className="text-xs text-muted-foreground">{h.note}</p> : null}
                  </div>
                </li>
              ))}
            </ol>
          )}
        </div>

        {linkedLoan ? (
          <div className="glass space-y-1 p-3 text-sm">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Préstamo generado</p>
            <p className="text-foreground">
              {linkedLoan.item?.name ?? "Artículo"} ×{linkedLoan.quantity}
              {linkedLoan.team?.name ? ` · ${linkedLoan.team.name}` : ""}
            </p>
            <p className="text-xs text-muted-foreground">
              {loanOutstanding(linkedLoan) > 0
                ? `Pendiente de devolver: ${loanOutstanding(linkedLoan)}`
                : "Devuelto por completo"}
              {linkedLoan.expected_return_at
                ? ` · Devolución: ${formatDateTime(linkedLoan.expected_return_at)}`
                : ""}
            </p>
          </div>
        ) : null}
        {linkedExpense ? (
          <div className="glass space-y-1 p-3 text-sm">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Gasto registrado</p>
            <p className="text-foreground">
              {linkedExpense.concept} · {formatExpenseMoney(linkedExpense.amount, linkedExpense.currency)}
            </p>
            <p className="text-xs text-muted-foreground">
              {linkedExpense.payment_status === "pagado" ? "Pagado" : "Pendiente de pago"}
              {linkedExpense.supplier?.name || linkedExpense.supplier_name
                ? ` · ${linkedExpense.supplier?.name ?? linkedExpense.supplier_name}`
                : ""}
            </p>
          </div>
        ) : null}
      </EntitySheetBody>
    </EntitySheet>

    {isMaterial && canCreateLoan ? (
      <LoanFormDialog
        open={loanOpen}
        onOpenChange={setLoanOpen}
        clubId={clubId}
        userId={userId}
        requestId={request.id}
        initial={(() => {
          const d = loanDraftFromRequest(request as any);
          return {
            itemId: d.item_id,
            quantity: d.quantity,
            borrowerUserId: d.borrower_user_id,
            notes: d.notes,
            teamId: d.team_id,
            expectedReturnAt: d.expected_return_at,
          };
        })()}
      />
    ) : null}

    {isFinancial && canCreateExpense ? (
      <ExpenseFormDialog
        open={expenseOpen}
        onOpenChange={setExpenseOpen}
        clubId={clubId}
        userId={userId}
        requestId={request.id}
        initial={(() => {
          const d = expenseDraftFromRequest(request as any);
          return {
            concept: d.concept,
            amount: d.amount,
            currency: d.currency,
            category: d.category,
            supplierName: d.supplierName,
            expenseDate: d.expenseDate,
            notes: d.notes,
            requestPhotoPath: d.requestPhotoPath,
          };
        })()}
      />
    ) : null}

    {isMedical && canCreateCheckup ? (
      <CheckupFormDialog
        open={checkupOpen}
        onOpenChange={setCheckupOpen}
        clubId={clubId}
        userId={userId}
        players={medicalPlayers}
        draft={{
          requestId: request.id,
          playerUserId:
            medicalPlayers.find((p) => p.userId === request.requester_id)?.userId ?? null,
          reason:
            [(request.details as any)?.tipo_atencion, (request.details as any)?.urgencia
              ? `Urgencia ${(request.details as any).urgencia}`
              : null]
              .filter(Boolean)
              .join(" · ") || request.title,
          notes: (request.details as any)?.descripcion ?? request.description ?? null,
        }}
      />
    ) : null}
    </>
  );

}

/** Artículo del inventario: miniatura (o ícono de categoría) + nombre. */
function ItemValue({ name, itemId, clubId }: { name?: string; itemId?: string; clubId: string }) {
  const catalogQ = useInventoryCatalog(clubId);
  const item = (catalogQ.data ?? []).find((i) => i.id === itemId) ?? null;
  const thumbsQ = useInventoryThumbnails([item?.image_path]);
  const thumb = item?.image_path ? thumbsQ.data?.[item.image_path] : undefined;
  const Icon = categoryIcon(item?.category);
  const label = item?.name ?? name;
  if (!label) return <>—</>;
  return (
    <span className="inline-flex items-center gap-2">
      {thumb ? (
        <img src={thumb} alt="" className="h-8 w-8 rounded-lg object-cover" />
      ) : (
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/5 text-primary">
          <Icon className="h-4 w-4" />
        </span>
      )}
      <span>{label}</span>
    </span>
  );
}

function LinkValue({ url }: { url?: string }) {
  if (!url) return <>—</>;
  let host = url;
  try {
    host = new URL(url).hostname.replace(/^www\./, "");
  } catch {
    /* noop */
  }
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1 text-primary underline underline-offset-2"
    >
      <LinkIcon className="h-3.5 w-3.5" /> {host}
    </a>
  );
}

function PhotoValue({ path }: { path?: string }) {
  const urlQ = useRequestAttachmentUrl(path ?? null);
  const [zoom, setZoom] = React.useState(false);
  if (!path) return <>—</>;
  if (!urlQ.data) return <span className="text-muted-foreground">Cargando…</span>;
  return (
    <>
      <button type="button" onClick={() => setZoom(true)}>
        <img src={urlQ.data} alt="Foto de referencia" className="h-16 w-16 rounded-lg object-cover" />
      </button>
      <Dialog open={zoom} onOpenChange={setZoom}>
        <DialogContent className="max-w-3xl border-border/60 bg-background/95 p-2">
          <img src={urlQ.data} alt="Foto de referencia" className="max-h-[80vh] w-full rounded-lg object-contain" />
        </DialogContent>
      </Dialog>
    </>
  );
}


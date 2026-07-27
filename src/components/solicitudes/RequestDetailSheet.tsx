import * as React from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Trash2, Pencil, CheckCircle2, XCircle, Bell, Ban, User as UserIcon,
  Package, Send,
} from "lucide-react";
import {
  EntitySheet,
  EntitySheetBody,
  EntitySheetDescription,
  EntitySheetFooter,
  EntitySheetHeader,
  EntitySheetTitle,
} from "@/components/squad/EntitySheet";
import { StatusBadge, type StatusVariant } from "@/components/squad/StatusBadge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import {
  useRequestComments, REQUEST_TYPE_LABEL, REQUEST_STATUS_LABEL,
  type RequestRow, type RequestStatus,
} from "@/hooks/useRequests";
import { formatDateTime } from "@/lib/calendar-utils";
import { cn } from "@/lib/utils";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  request: RequestRow | null;
  clubId: string;
  userId: string;
  canEditModule: boolean;
  canApprove: boolean;
  onEdit: () => void;
  onConvertToLoan?: (r: RequestRow) => void;
}

const STATUS_VARIANT: Record<RequestStatus, StatusVariant> = {
  pendiente: "pending",
  aprobada: "info",
  rechazada: "rejected",
  cancelada: "rejected",
  completada: "approved",
};

export function RequestDetailSheet({
  open, onOpenChange, request, clubId, userId, canEditModule, canApprove, onEdit, onConvertToLoan,
}: Props) {
  const qc = useQueryClient();
  const commentsQ = useRequestComments(request?.id);
  const [comment, setComment] = React.useState("");
  const [decisionNote, setDecisionNote] = React.useState("");

  React.useEffect(() => { setDecisionNote(""); setComment(""); }, [request?.id]);

  const isOwner = !!request && request.requester_id === userId;
  const isPending = request?.status === "pendiente";

  const del = useMutation({
    mutationFn: async () => {
      if (!request) return;
      const { error } = await supabase.from("requests").delete().eq("id", request.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Solicitud eliminada");
      qc.invalidateQueries({ queryKey: ["requests", clubId] });
      onOpenChange(false);
    },
    onError: (e: any) => toast.error(e.message ?? "No se pudo eliminar"),
  });

  const decide = useMutation({
    mutationFn: async (newStatus: RequestStatus) => {
      if (!request) return;
      const payload: any = {
        status: newStatus,
        decided_by: userId,
        decided_at: new Date().toISOString(),
        decision_note: decisionNote.trim() || null,
      };
      const { error } = await supabase.from("requests").update(payload).eq("id", request.id);
      if (error) throw error;

      await supabase.from("request_comments").insert({
        request_id: request.id,
        user_id: userId,
        kind: "system",
        body: `Solicitud ${REQUEST_STATUS_LABEL[newStatus].toLowerCase()}${decisionNote.trim() ? ` — ${decisionNote.trim()}` : ""}`,
      });
    },
    onSuccess: (_d, status) => {
      toast.success(`Solicitud ${REQUEST_STATUS_LABEL[status as RequestStatus].toLowerCase()}`);
      qc.invalidateQueries({ queryKey: ["requests", clubId] });
    },
    onError: (e: any) => toast.error(e.message ?? "No se pudo actualizar"),
  });

  const cancelOwn = useMutation({
    mutationFn: async () => {
      if (!request) return;
      const { error } = await supabase
        .from("requests")
        .update({ status: "cancelada" as RequestStatus })
        .eq("id", request.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Solicitud cancelada");
      qc.invalidateQueries({ queryKey: ["requests", clubId] });
    },
    onError: (e: any) => toast.error(e.message ?? "No se pudo cancelar"),
  });

  const addComment = useMutation({
    mutationFn: async (kind: "comment" | "reminder") => {
      if (!request) return;
      const body = kind === "reminder"
        ? (comment.trim() || "Recordatorio: por favor revisa esta solicitud.")
        : comment.trim();
      if (!body) throw new Error("Escribe un mensaje");
      const { error } = await supabase.from("request_comments").insert({
        request_id: request.id,
        user_id: userId,
        kind,
        body,
      });
      if (error) throw error;
    },
    onSuccess: (_d, kind) => {
      setComment("");
      toast.success(kind === "reminder" ? "Recordatorio enviado" : "Comentario enviado");
    },
    onError: (e: any) => toast.error(e.message ?? "No se pudo enviar"),
  });

  if (!request) return null;

  const requesterName = request.requester?.full_name ?? request.requester?.email ?? "Miembro";
  const deciderName = request.decider?.full_name ?? request.decider?.email ?? null;

  return (
    <EntitySheet open={open} onOpenChange={onOpenChange}>
      <EntitySheetHeader>
        <EntitySheetTitle>{request.title}</EntitySheetTitle>
        <EntitySheetDescription>
          {REQUEST_TYPE_LABEL[request.type]} · <StatusBadge variant={STATUS_VARIANT[request.status]}>{REQUEST_STATUS_LABEL[request.status]}</StatusBadge>
        </EntitySheetDescription>

        <div className="mt-3 flex flex-wrap gap-2">
          {isPending && canApprove ? (
            <>
              <Button size="sm" variant="secondary" onClick={() => decide.mutate("aprobada")} disabled={decide.isPending}>
                <CheckCircle2 className="mr-2 h-3.5 w-3.5" /> Aprobar
              </Button>
              <Button size="sm" variant="ghost" className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                onClick={() => decide.mutate("rechazada")} disabled={decide.isPending}>
                <XCircle className="mr-2 h-3.5 w-3.5" /> Rechazar
              </Button>
            </>
          ) : null}

          {request.type === "material" && request.status === "aprobada" && canApprove && onConvertToLoan ? (
            <Button size="sm" variant="secondary" onClick={() => onConvertToLoan(request)}>
              <Package className="mr-2 h-3.5 w-3.5" /> Crear préstamo
            </Button>
          ) : null}

          {(canEditModule || (isOwner && isPending)) ? (
            <Button size="sm" variant="secondary" onClick={onEdit}>
              <Pencil className="mr-2 h-3.5 w-3.5" /> Editar
            </Button>
          ) : null}

          {isOwner && isPending ? (
            <Button size="sm" variant="ghost" onClick={() => cancelOwn.mutate()} disabled={cancelOwn.isPending}>
              <Ban className="mr-2 h-3.5 w-3.5" /> Cancelar
            </Button>
          ) : null}

          {(canEditModule || (isOwner && (isPending || request.status === "cancelada" || request.status === "rechazada"))) ? (
            <Button size="sm" variant="ghost" className="text-destructive hover:bg-destructive/10 hover:text-destructive"
              onClick={() => { if (confirm("¿Eliminar esta solicitud?")) del.mutate(); }} disabled={del.isPending}>
              <Trash2 className="mr-2 h-3.5 w-3.5" /> Eliminar
            </Button>
          ) : null}
        </div>

        {isPending && canApprove ? (
          <div className="mt-3">
            <Textarea rows={2} placeholder="Nota de la decisión (opcional)"
              value={decisionNote} onChange={(e) => setDecisionNote(e.target.value)} />
          </div>
        ) : null}
      </EntitySheetHeader>

      <EntitySheetBody>
        <Field label="Solicitante">
          <span className="inline-flex items-center gap-1.5 text-foreground">
            <UserIcon className="h-3.5 w-3.5 text-muted-foreground" /> {requesterName}
          </span>
        </Field>

        {request.description ? (
          <Field label="Descripción">
            <p className="whitespace-pre-wrap text-sm text-foreground/90">{request.description}</p>
          </Field>
        ) : null}

        <TypeSpecificFields request={request} />

        {request.amount != null ? (
          <div className="grid grid-cols-2 gap-3">
            <Field label="Monto"><span className="text-foreground">{request.amount.toFixed(2)} {request.currency ?? ""}</span></Field>
            {request.needed_at ? (
              <Field label="Fecha necesaria"><span className="text-foreground">{formatDateTime(request.needed_at)}</span></Field>
            ) : null}
          </div>
        ) : request.needed_at ? (
          <Field label="Fecha necesaria"><span className="text-foreground">{formatDateTime(request.needed_at)}</span></Field>
        ) : null}

        {request.decided_at ? (
          <div className="rounded-lg border border-border/60 bg-white/[0.02] p-3 space-y-1">
            <div className="text-xs uppercase tracking-wider text-muted-foreground">Decisión</div>
            <div className="text-sm text-foreground">
              {REQUEST_STATUS_LABEL[request.status]} · {deciderName ?? "—"} · {formatDateTime(request.decided_at)}
            </div>
            {request.decision_note ? (
              <p className="text-sm text-foreground/90 whitespace-pre-wrap">{request.decision_note}</p>
            ) : null}
          </div>
        ) : null}

        {/* Historial */}
        <div className="space-y-2 pt-2">
          <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Actividad</div>
          {(commentsQ.data ?? []).length === 0 ? (
            <p className="text-xs text-muted-foreground">Sin actividad todavía.</p>
          ) : (
            <ul className="space-y-2">
              {commentsQ.data!.map((c) => (
                <li key={c.id} className={cn(
                  "rounded-lg border border-border/60 px-3 py-2 text-sm",
                  c.kind === "reminder" && "border-status-pending/40 bg-status-pending/5",
                  c.kind === "system" && "bg-white/[0.02] text-muted-foreground",
                )}>
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>{c.author?.full_name ?? c.author?.email ?? "Sistema"} {c.kind === "reminder" ? "· recordatorio" : ""}</span>
                    <span>{formatDateTime(c.created_at)}</span>
                  </div>
                  <p className="mt-1 whitespace-pre-wrap text-foreground/90">{c.body}</p>
                </li>
              ))}
            </ul>
          )}

          <div className="pt-2 space-y-2">
            <Textarea rows={2} placeholder="Escribe un comentario…" value={comment} onChange={(e) => setComment(e.target.value)} />
            <div className="flex flex-wrap gap-2 justify-end">
              {isOwner && isPending ? (
                <Button type="button" size="sm" variant="secondary"
                  onClick={() => addComment.mutate("reminder")} disabled={addComment.isPending}>
                  <Bell className="mr-2 h-3.5 w-3.5" /> Recordar al aprobador
                </Button>
              ) : null}
              <Button type="button" size="sm" onClick={() => addComment.mutate("comment")} disabled={addComment.isPending || !comment.trim()}>
                <Send className="mr-2 h-3.5 w-3.5" /> Comentar
              </Button>
            </div>
          </div>
        </div>
      </EntitySheetBody>

      <EntitySheetFooter>
        <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cerrar</Button>
      </EntitySheetFooter>
    </EntitySheet>
  );
}

function TypeSpecificFields({ request }: { request: RequestRow }) {
  const d = request.details ?? {};
  switch (request.type) {
    case "material":
      return (
        <div className="grid grid-cols-2 gap-3">
          <Field label="Artículo"><span className="text-foreground">{request.item?.name ?? "—"}</span></Field>
          <Field label="Cantidad"><span className="text-foreground">{d.quantity ?? "—"}{request.item?.unit ? ` ${request.item.unit}` : ""}</span></Field>
        </div>
      );
    case "compra":
      return (
        <div className="grid grid-cols-2 gap-3">
          <Field label="Categoría"><span className="text-foreground">{d.category ?? "—"}</span></Field>
          <Field label="Urgencia"><span className="text-foreground capitalize">{d.urgency ?? "normal"}</span></Field>
        </div>
      );
    case "pago_proveedor":
      return (
        <>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Proveedor"><span className="text-foreground">{d.vendor ?? "—"}</span></Field>
            <Field label="Concepto"><span className="text-foreground">{d.invoice ?? "—"}</span></Field>
          </div>
          {d.attachment_url ? (
            <Field label="Comprobante"><a href={d.attachment_url} target="_blank" rel="noreferrer" className="text-primary underline">Abrir enlace</a></Field>
          ) : null}
        </>
      );
    case "permiso":
      return (
        <>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Desde"><span className="text-foreground">{d.start_date ?? "—"}</span></Field>
            <Field label="Hasta"><span className="text-foreground">{d.end_date ?? "—"}</span></Field>
          </div>
          <Field label="Motivo"><span className="text-foreground capitalize">{d.reason ?? "personal"}</span></Field>
        </>
      );
    case "cortesias":
      return (
        <>
          <Field label="Partido"><span className="text-foreground">{request.event?.title ?? "—"}</span></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Boletos"><span className="text-foreground">{d.tickets ?? "—"}</span></Field>
            <Field label="Para"><span className="text-foreground">{d.attendees ?? "—"}</span></Field>
          </div>
        </>
      );
    case "reembolso":
      return (
        <>
          <Field label="Concepto"><span className="text-foreground">{d.concept ?? "—"}</span></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Fecha del gasto"><span className="text-foreground">{d.spent_at ?? "—"}</span></Field>
            {d.receipt_url ? (
              <Field label="Comprobante"><a href={d.receipt_url} target="_blank" rel="noreferrer" className="text-primary underline">Abrir</a></Field>
            ) : null}
          </div>
        </>
      );
    case "medica":
      return (
        <>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Tipo"><span className="text-foreground capitalize">{d.medical_kind ?? "consulta"}</span></Field>
            <Field label="Urgencia"><span className="text-foreground capitalize">{d.urgency ?? "normal"}</span></Field>
          </div>
          <Field label="Especialidad"><span className="text-foreground">{d.specialty ?? "—"}</span></Field>
        </>
      );
    default:
      return null;
  }
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</div>
      <div>{children}</div>
    </div>
  );
}

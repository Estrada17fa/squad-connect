import * as React from "react";
import { Package, User, Users, CalendarClock, StickyNote, Clock, Undo2 } from "lucide-react";
import { DetailSheet, DetailField, DetailGrid } from "@/components/squad/DetailSheet";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { StatusBadge } from "@/components/squad/StatusBadge";
import { categoryIcon, formatDate } from "@/lib/inventory";
import { formatDateTime } from "@/lib/calendar-utils";
import { isLoanOverdue, loanOutstanding, useInventoryThumbnails, type LoanRow } from "@/hooks/useInventory";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  loan: LoanRow | null;
  canEdit: boolean;
  onReturn: (loan: LoanRow) => void;
}

export function LoanDetailSheet({ open, onOpenChange, loan, canEdit, onReturn }: Props) {
  const thumbsQ = useInventoryThumbnails([loan?.item?.image_path]);
  const thumb = loan?.item?.image_path ? thumbsQ.data?.[loan.item.image_path] : undefined;

  if (!loan) return null;

  const pending = loanOutstanding(loan);
  const overdue = isLoanOverdue(loan);
  const Icon = categoryIcon(loan.item?.category);
  const borrowerName = loan.borrower?.full_name ?? loan.borrower?.email ?? "—";
  const status = loan.returned_at
    ? { label: "Devuelto", variant: "approved" as const }
    : overdue
      ? { label: "Vencido", variant: "rejected" as const }
      : loan.returned_quantity > 0
        ? { label: "Devolución parcial", variant: "pending" as const }
        : { label: "Activo", variant: "info" as const };

  return (
    <DetailSheet
      open={open}
      onOpenChange={onOpenChange}
      title={loan.item?.name ?? "Artículo"}
      icon={PackageOpen}
      description={`${loan.quantity} ${loan.item?.unit ?? "piezas"} prestadas a ${borrowerName}`}
      headerActions={
        canEdit && pending > 0 ? (
          <Button type="button" size="sm" onClick={() => onReturn(loan)}>
            Registrar devolución
          </Button>
        ) : null
      }
    >
      <div className="flex items-center gap-3">
        {thumb ? (
          <img src={thumb} alt="" className="h-14 w-14 rounded-xl object-cover" />
        ) : (
          <span className="flex h-14 w-14 items-center justify-center rounded-xl bg-white/5 text-primary">
            <Icon className="h-6 w-6" />
          </span>
        )}
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-foreground">{loan.item?.name ?? "—"}</p>
          <p className="text-xs text-muted-foreground">{loan.item?.category ?? "Sin categoría"}</p>
        </div>
        <StatusBadge variant={status.variant}>{status.label}</StatusBadge>
      </div>

      <Row icon={Package} label="Cantidad prestada" value={`${loan.quantity}`} />
      <Row icon={Undo2} label="Devuelto" value={`${loan.returned_quantity}`} />
      <Row
        icon={Clock}
        label="Saldo pendiente"
        value={pending > 0 ? `${pending}` : "Sin saldo"}
        highlight={pending > 0}
      />

      <div className="flex items-center gap-3 border-t border-white/5 pt-3">
        <Avatar className="h-8 w-8">
          <AvatarImage src={loan.borrower?.avatar_url ?? undefined} alt="" />
          <AvatarFallback>{(borrowerName ?? "?").slice(0, 1).toUpperCase()}</AvatarFallback>
        </Avatar>
        <div>
          <p className="text-xs text-muted-foreground">Prestado a</p>
          <p className="text-sm text-foreground">{borrowerName}</p>
        </div>
      </div>

      <Row icon={Users} label="Equipo" value={loan.team?.name ?? "Sin equipo"} />
      <Row icon={StickyNote} label="Motivo" value={loan.notes ?? "Sin motivo capturado"} />
      <Row icon={CalendarClock} label="Fecha de préstamo" value={formatDateTime(loan.created_at)} />
      <Row
        icon={CalendarClock}
        label="Devolución esperada"
        value={loan.expected_return_at ? formatDateTime(loan.expected_return_at) : "Sin fecha"}
        highlight={overdue}
      />
      <Row
        icon={CalendarClock}
        label="Devolución real"
        value={loan.returned_at ? formatDate(loan.returned_at) : "Pendiente"}
      />
      {loan.request_id ? (
        <Row icon={User} label="Origen" value="Generado desde una solicitud de material" />
      ) : null}
    </DetailSheet>
  );
}

function Row({
  icon: Icon,
  label,
  value,
  highlight,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div className="flex items-start gap-3">
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className={highlight ? "text-sm text-destructive" : "text-sm text-foreground"}>{value}</p>
      </div>
    </div>
  );
}

import * as React from "react";
import { CalendarClock, User as UserIcon, Users as UsersIcon } from "lucide-react";
import { StandardCard } from "@/components/squad/StandardCard";
import { StatusBadge } from "@/components/squad/StatusBadge";
import {
  CATEGORY_LABEL,
  expiryStateOf,
  fileIconOf,
  formatDocDate,
  type DocumentRow,
} from "@/hooks/useDocuments";

/** Tarjeta escaneable: icono del archivo, título, tipo, categoría y vigencia. */
export function DocumentCard({ doc, onOpen }: { doc: DocumentRow; onOpen: (d: DocumentRow) => void }) {
  const Icon = fileIconOf(doc);
  const state = expiryStateOf(doc.expiry_date);
  const status =
    state === "expired"
      ? { label: "Vencido", variant: "rejected" as const }
      : state === "soon"
        ? { label: "Por vencer", variant: "pending" as const }
        : state === "ok"
          ? { label: "Vigente", variant: "approved" as const }
          : undefined;

  const issued = formatDocDate(doc.issue_date);
  const expires = formatDocDate(doc.expiry_date);

  return (
    <StandardCard
      interactive
      icon={Icon}
      title={doc.title}
      status={status}
      onClick={() => onOpen(doc)}
    >
      <div className="flex flex-wrap items-center gap-1.5">
        <StatusBadge variant="info">{CATEGORY_LABEL[doc.category]}</StatusBadge>
        <span className="inline-flex min-w-0 items-center gap-1 rounded-full bg-white/5 px-2 py-0.5 text-xs text-muted-foreground ring-1 ring-inset ring-white/5">
          <UsersIcon className="h-3 w-3 shrink-0" />
          <span className="truncate">{doc.team?.name ?? "Todo el club"}</span>
        </span>
        {doc.related_user ? (
          <span className="inline-flex min-w-0 items-center gap-1 rounded-full bg-white/5 px-2 py-0.5 text-xs text-muted-foreground ring-1 ring-inset ring-white/5">
            <UserIcon className="h-3 w-3 shrink-0" />
            <span className="truncate">{doc.related_user.full_name ?? "Personal"}</span>
          </span>
        ) : null}
        {expires ? (
          <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
            <CalendarClock className="h-3 w-3 shrink-0" /> Vence {expires}
          </span>
        ) : issued ? (
          <span className="text-xs text-muted-foreground">Emitido {issued}</span>
        ) : null}
      </div>
    </StandardCard>
  );
}

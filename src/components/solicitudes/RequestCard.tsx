import * as React from "react";
import { Check, X as XIcon, MessageCircleQuestion } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { StandardCard } from "@/components/squad/StandardCard";
import { formatDateTime } from "@/lib/calendar-utils";
import {
  REQUEST_TYPE_MAP,
  STATUS_LABEL,
  STATUS_VARIANT,
  formatMoney,
  requestSummary,
} from "@/lib/requestTypes";
import type { RequestRow } from "@/hooks/useRequests";
import { cn } from "@/lib/utils";

export interface QuickActions {
  onApprove: (r: RequestRow) => void;
  onReject: (r: RequestRow) => void;
  onAskInfo: (r: RequestRow) => void;
}

/** Fila escaneable de una solicitud, con acciones rápidas para el aprobador. */
export function RequestCard({
  request,
  highlighted,
  onOpen,
  quick,
  busy,
}: {
  request: RequestRow;
  highlighted?: boolean;
  onOpen: (r: RequestRow) => void;
  quick?: QuickActions;
  busy?: boolean;
}) {
  const def = REQUEST_TYPE_MAP[request.type];
  const money = formatMoney(request.amount, request.currency);
  const who = request.requester?.full_name ?? request.requester?.email ?? "—";

  return (
    <StandardCard
      interactive
      icon={def.icon}
      title={requestSummary(request)}
      subtitle={def.label}
      status={{ label: STATUS_LABEL[request.status], variant: STATUS_VARIANT[request.status] }}
      onClick={() => onOpen(request)}
      className={cn(highlighted && "border-primary/40 ring-1 ring-primary/25")}
    >
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
        <span className="flex min-w-0 items-center gap-2">
          <Avatar className="h-6 w-6">
            <AvatarImage src={request.requester?.avatar_url ?? undefined} alt={who} />
            <AvatarFallback className="text-[10px]">{who.slice(0, 2).toUpperCase()}</AvatarFallback>
          </Avatar>
          <span className="truncate text-foreground">{who}</span>
          <span className="shrink-0 rounded-full border border-border/60 bg-white/[0.04] px-2 py-0.5 text-[11px]">
            {request.team?.name ?? "Todo el club"}
          </span>
        </span>
        <span className="flex shrink-0 items-center gap-3">
          <span>{formatDateTime(request.created_at)}</span>
          {money ? <span className="text-foreground">{money}</span> : null}
        </span>
      </div>

      {quick ? (
        <div className="mt-3 flex flex-wrap gap-2" onClick={(e) => e.stopPropagation()}>
          <Button type="button" size="sm" className="glow-primary" disabled={busy} onClick={() => quick.onApprove(request)}>
            <Check className="mr-2 h-4 w-4" /> Aprobar
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={busy}
            className="text-destructive hover:bg-destructive/10 hover:text-destructive"
            onClick={() => quick.onReject(request)}
          >
            <XIcon className="mr-2 h-4 w-4" /> Rechazar
          </Button>
          <Button type="button" size="sm" variant="outline" disabled={busy} onClick={() => quick.onAskInfo(request)}>
            <MessageCircleQuestion className="mr-2 h-4 w-4" /> Pedir info
          </Button>
        </div>
      ) : null}
    </StandardCard>
  );
}

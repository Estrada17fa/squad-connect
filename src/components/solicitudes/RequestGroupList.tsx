import * as React from "react";
import { ChevronDown } from "lucide-react";
import { RequestCard, type QuickActions } from "./RequestCard";
import type { RequestRow } from "@/hooks/useRequests";
import { cn } from "@/lib/utils";

export interface RequestGroup {
  key: string;
  label: string;
  requests: RequestRow[];
  /** Acciones rápidas del aprobador (solo en el grupo "Por aprobar"). */
  quick?: QuickActions;
  accent?: boolean;
}

/** Grupos colapsables por estado, estilo tablero. */
export function RequestGroupList({
  groups,
  onOpen,
  highlighted,
  busy,
}: {
  groups: RequestGroup[];
  onOpen: (r: RequestRow) => void;
  highlighted: Set<string>;
  busy?: boolean;
}) {
  const [collapsed, setCollapsed] = React.useState<Record<string, boolean>>({});

  return (
    <div className="space-y-4">
      {groups.map((g) => {
        const isCollapsed = collapsed[g.key] ?? false;
        return (
          <section key={g.key} className="space-y-2">
            <button
              type="button"
              onClick={() => setCollapsed((c) => ({ ...c, [g.key]: !isCollapsed }))}
              className="flex w-full items-center gap-2 border-b border-border/40 pb-2 text-left"
            >
              <ChevronDown
                className={cn(
                  "h-4 w-4 shrink-0 text-muted-foreground transition-transform",
                  isCollapsed && "-rotate-90",
                )}
              />
              <span
                className={cn(
                  "font-display text-sm font-semibold uppercase tracking-wide",
                  g.accent ? "text-primary" : "text-foreground",
                )}
              >
                {g.label}
              </span>
              <span className="ml-auto inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-white/[0.06] px-1.5 text-[11px] font-semibold text-muted-foreground">
                {g.requests.length}
              </span>
            </button>

            {isCollapsed ? null : (
              <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
                {g.requests.map((r) => (
                  <RequestCard
                    key={r.id}
                    request={r}
                    onOpen={onOpen}
                    quick={g.quick}
                    busy={busy}
                    highlighted={highlighted.has(r.id)}
                  />
                ))}
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
}

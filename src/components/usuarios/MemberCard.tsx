import * as React from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { StatusBadge } from "@/components/squad/StatusBadge";
import { cn } from "@/lib/utils";
import {
  displayName,
  initials,
  roleVariant,
  type MemberProfile,
  type MembershipLite,
} from "./memberUtils";

/**
 * Tarjeta de persona: foto + nombre + badges de rol/estado. Pensada para
 * identificar a alguien de un vistazo, sin leer texto corrido.
 */
export function MemberCard({
  member,
  memberships,
  selected,
  onClick,
}: {
  member: MemberProfile;
  memberships: MembershipLite[];
  selected?: boolean;
  onClick: () => void;
}) {
  const name = displayName(member);
  const isBaja = (member.status ?? "activo") === "baja";
  const roles = Array.from(
    new Set(memberships.map((m) => m.roleName).filter((r): r is string => !!r)),
  );
  const scopes = memberships
    .map((m) => [m.teamName ?? "Todo el club", m.job_title].filter(Boolean).join(" · "))
    .slice(0, 2);

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "glass w-full rounded-xl p-3 text-left transition-colors hover:bg-white/[0.06]",
        selected && "border-primary/60 bg-white/[0.06]",
        isBaja && "opacity-70",
      )}
    >
      <div className="flex items-start gap-3">
        <Avatar className="h-11 w-11 shrink-0">
          {member.avatar_url ? <AvatarImage src={member.avatar_url} alt={name} /> : null}
          <AvatarFallback className="text-xs font-semibold">{initials(name)}</AvatarFallback>
        </Avatar>

        <div className="min-w-0 flex-1 space-y-1.5">
          <div className="flex items-start justify-between gap-2">
            <p className="min-w-0 truncate font-display text-sm font-semibold leading-tight">
              {name}
            </p>
            <StatusBadge variant={isBaja ? "rejected" : "approved"}>
              {isBaja ? "Baja" : "Activo"}
            </StatusBadge>
          </div>

          <div className="flex flex-wrap gap-1.5">
            {roles.length > 0 ? (
              roles.map((r) => (
                <StatusBadge key={r} variant={roleVariant(r)}>
                  {r}
                </StatusBadge>
              ))
            ) : (
              <StatusBadge variant="pending">Sin rol</StatusBadge>
            )}
            {member.name_completed === false ? (
              <StatusBadge variant="pending">Completar nombre</StatusBadge>
            ) : null}
          </div>

          {scopes.length > 0 ? (
            <p className="truncate text-[11px] text-muted-foreground">{scopes.join(" | ")}</p>
          ) : null}
          {member.email ? (
            <p className="truncate text-[11px] text-muted-foreground">{member.email}</p>
          ) : null}
        </div>
      </div>
    </button>
  );
}

import * as React from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useClub, useClubLogoUrl } from "@/hooks/useClubSettings";
import { initials } from "@/components/usuarios/memberUtils";
import { cn } from "@/lib/utils";

/**
 * Identidad del club en la cabecera: escudo (bucket privado, URL firmada) y
 * nombre. Sin escudo cae a iniciales; sin club no renderiza nada.
 * Solo presentación — lee lo que ya existe en la configuración del club.
 */
export function ClubCrest({
  clubId,
  clubName,
  className,
}: {
  clubId: string | null;
  clubName: string | null;
  className?: string;
}) {
  const { data: club } = useClub(clubId);
  const { data: logoUrl } = useClubLogoUrl(club?.logo_url);
  const name = club?.name ?? clubName;

  if (!clubId && !name) return null;

  return (
    <div className={cn("flex min-w-0 items-center gap-2", className)}>
      {logoUrl ? (
        <img
          src={logoUrl}
          alt={name ?? "Escudo del club"}
          className="h-9 w-auto max-w-[120px] shrink-0 object-contain"
        />
      ) : (
        <Avatar className="h-8 w-8 shrink-0 border border-border/60 bg-white/5">
          <AvatarFallback className="bg-white/5 text-[10px] font-semibold text-muted-foreground">
            {initials(name || "?")}
          </AvatarFallback>
        </Avatar>
      )}

      {name ? (
        <span className="hidden max-w-[200px] truncate font-display text-sm font-semibold text-foreground sm:inline">
          {name}
        </span>
      ) : null}
    </div>
  );
}

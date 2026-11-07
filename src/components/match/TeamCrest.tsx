import * as React from "react";
import { cn } from "@/lib/utils";
import { useApp } from "@/components/squad/app-context";
import { useClub, useClubLogoUrl } from "@/hooks/useClubSettings";

export type CrestSize = "sm" | "md" | "lg";
const SIZE: Record<CrestSize, string> = {
  sm: "h-6 w-6 text-[9px]",
  md: "h-9 w-9 text-[11px]",
  lg: "h-14 w-14 text-sm",
};

export interface CrestTeam {
  /** Nombre corto (ej. "Racing"); se usa para iniciales y texto alternativo. */
  shortName: string;
  /** URL de imagen ya resuelta (crest_path / logo_url firmada). */
  src?: string | null;
  /** true = escudo del club propio (se resuelve desde la configuración del club). */
  own?: boolean;
}

const initialsOf = (name: string) => {
  const w = name.trim().split(/\s+/).filter(Boolean);
  if (w.length >= 2) return (w[0][0] + w[1][0]).toUpperCase();
  return (w[0] ?? "?").slice(0, 2).toUpperCase();
};

/** Escudo completo en caja cuadrada (sin fondo ni borde); si no hay imagen o falla, muestra iniciales. Nunca imagen rota. */
export function TeamCrest({ team, size = "md", className }: { team: CrestTeam; size?: CrestSize; className?: string }) {
  if (team.own) return <OwnCrest team={team} size={size} className={className} />;
  return <CrestView src={team.src} name={team.shortName} size={size} className={className} />;
}

function OwnCrest({ team, size, className }: { team: CrestTeam; size: CrestSize; className?: string }) {
  const { profile } = useApp();
  const { data: club } = useClub(profile?.club_id ?? null);
  const { data: url } = useClubLogoUrl(club?.logo_url);
  return <CrestView src={team.src ?? url} name={team.shortName} size={size} className={className} />;
}

function CrestView({ src, name, size, className }: { src?: string | null; name: string; size: CrestSize; className?: string }) {
  const [failed, setFailed] = React.useState(false);
  React.useEffect(() => setFailed(false), [src]);
  const showImg = !!src && !failed;
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center justify-center font-bold text-muted-foreground",
        !showImg && "overflow-hidden rounded-full bg-muted",
        SIZE[size],
        className,
      )}
    >
      {showImg ? (
        <img src={src!} alt={name} onError={() => setFailed(true)} className="h-full w-full object-contain" />
      ) : (
        <span aria-label={name}>{initialsOf(name)}</span>
      )}
    </span>
  );
}

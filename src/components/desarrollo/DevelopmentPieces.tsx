import * as React from "react";
import type { LucideIcon } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { EmptyState } from "@/components/squad/EmptyState";
import { cn } from "@/lib/utils";

/**
 * Piezas compartidas de las fichas de Desarrollo.
 * Mismo estándar visual que Usuarios y Salud: cabecera con avatar grande,
 * secciones con encabezado + icono y mini-tarjetas escaneables.
 */

export function DevPersonHeader({
  name,
  avatarUrl,
  subtitle,
  badges,
}: {
  name: string;
  avatarUrl?: string | null;
  subtitle?: React.ReactNode;
  badges?: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-4">
      <Avatar className="h-16 w-16 shrink-0">
        {avatarUrl ? <AvatarImage src={avatarUrl} alt={name} /> : null}
        <AvatarFallback className="text-base font-semibold">
          {(name || "?").slice(0, 1).toUpperCase()}
        </AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1 space-y-1.5">
        <p className="break-words font-display text-lg font-semibold leading-tight [overflow-wrap:anywhere]">
          {name}
        </p>
        {subtitle ? (
          <p className="break-words text-xs text-muted-foreground [overflow-wrap:anywhere]">{subtitle}</p>
        ) : null}
        {badges ? <div className="flex flex-wrap gap-1.5">{badges}</div> : null}
      </div>
    </div>
  );
}

export function DevSection({
  icon: Icon,
  title,
  action,
  children,
}: {
  icon: LucideIcon;
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <h3 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          <Icon className="h-3.5 w-3.5" /> {title}
        </h3>
        {action}
      </div>
      {children}
    </section>
  );
}

/** Mini-tarjeta escaneable: título + badge, metadatos con icono y nota. */
export function DevCard({
  title,
  badge,
  meta,
  metaIcon: MetaIcon,
  metaTone = "muted",
  note,
  children,
  onClick,
  className,
}: {
  title: React.ReactNode;
  badge?: React.ReactNode;
  meta?: React.ReactNode;
  metaIcon?: LucideIcon;
  metaTone?: "muted" | "danger";
  note?: React.ReactNode;
  children?: React.ReactNode;
  onClick?: () => void;
  className?: string;
}) {
  const interactive = !!onClick;
  return (
    <div
      role={interactive ? "button" : undefined}
      tabIndex={interactive ? 0 : undefined}
      onClick={onClick}
      onKeyDown={
        interactive
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onClick?.();
              }
            }
          : undefined
      }
      className={cn(
        "glass space-y-1.5 rounded-lg p-3",
        interactive && "cursor-pointer transition-colors hover:border-white/15 hover:bg-white/[0.06]",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="min-w-0 break-words text-sm font-medium text-foreground [overflow-wrap:anywhere]">
          {title}
        </p>
        {badge ? <div className="shrink-0">{badge}</div> : null}
      </div>
      {meta ? (
        <p
          className={cn(
            "flex items-center gap-1.5 text-xs",
            metaTone === "danger" ? "text-destructive" : "text-muted-foreground",
          )}
        >
          {MetaIcon ? <MetaIcon className="h-3.5 w-3.5 shrink-0" /> : null}
          <span className="break-words [overflow-wrap:anywhere]">{meta}</span>
        </p>
      ) : null}
      {note ? (
        <p className="whitespace-pre-wrap break-words text-sm text-muted-foreground [overflow-wrap:anywhere]">
          {note}
        </p>
      ) : null}
      {children}
    </div>
  );
}

/** Número destacado para las estadísticas de competencia. */
export function StatTile({ value, label }: { value: React.ReactNode; label: string }) {
  return (
    <div className="glass rounded-lg px-3 py-2.5 text-center">
      <p className="font-display text-xl font-semibold leading-tight text-foreground">{value}</p>
      <p className="mt-0.5 text-[11px] uppercase tracking-wider text-muted-foreground">{label}</p>
    </div>
  );
}

export function DevEmpty({
  icon,
  title,
  message,
}: {
  icon: LucideIcon;
  title: string;
  message?: string;
}) {
  return <EmptyState icon={icon} title={title} message={message} className="px-4 py-8" />;
}

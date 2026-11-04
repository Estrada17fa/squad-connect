import * as React from "react";
import { Link } from "@tanstack/react-router";
import { ChevronLeft, ChevronRight, Copy, MessageCircle, Check } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { initials } from "@/components/usuarios/memberUtils";
import { getShareAppUrl } from "@/lib/appConfig";

/** Encabezado de página: "‹ Regresar" + título + acciones a la derecha. */
export function UsersHeader({
  back, backLabel, title, actions,
}: { back: React.ReactNode; backLabel?: string; title?: string; actions?: React.ReactNode }) {
  return (
    <header className="sticky top-0 z-20 -mx-4 -mt-2 bg-background/90 px-4 pb-1 pt-1 backdrop-blur">
      <div className="flex min-h-11 items-center justify-between gap-2">
        <div className="flex min-w-0 items-center">{back}</div>
        {actions ? <div className="flex shrink-0 items-center gap-1">{actions}</div> : null}
      </div>
      {title ? <h1 className="font-display text-[20px] font-bold leading-tight">{title}</h1> : null}
      {backLabel ? <span className="sr-only">{backLabel}</span> : null}
    </header>
  );
}

export function BackLabel({ children }: { children: React.ReactNode }) {
  return (
    <span className="coord-press -ml-2 inline-flex min-h-11 items-center gap-0.5 rounded-xl px-2 text-sm font-semibold">
      <ChevronLeft className="h-5 w-5" /> {children}
    </span>
  );
}

export function IconBtn({ label, onClick, children, active }: { label: string; onClick?: () => void; children: React.ReactNode; active?: boolean }) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className={cn(
        "coord-press flex h-10 w-10 items-center justify-center rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-ring",
        active && "bg-primary/15 text-primary",
      )}
    >
      {children}
    </button>
  );
}

export function SectionLabel({ children, action }: { children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="mb-1.5 flex items-center justify-between px-1">
      <h2 className="text-xs font-semibold text-muted-foreground">{children}</h2>
      {action}
    </div>
  );
}

/** Tarjeta agrupada sin borde: filas separadas por línea fina. */
export function GroupCard({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn("divide-y divide-border/40 overflow-hidden rounded-[14px] bg-card", className)}>{children}</div>;
}

export function InfoRow({ label, value, href }: { label: string; value: React.ReactNode; href?: string }) {
  const empty = value === null || value === undefined || value === "";
  return (
    <div className="flex min-h-11 items-center justify-between gap-4 px-3 py-2">
      <span className="shrink-0 text-sm text-muted-foreground">{label}</span>
      {href && !empty ? (
        <a href={href} className="min-w-0 truncate text-right text-sm font-medium text-primary">{value}</a>
      ) : (
        <span className={cn("min-w-0 text-right text-sm font-medium [overflow-wrap:anywhere]", empty && "text-muted-foreground/60")}>
          {empty ? "—" : value}
        </span>
      )}
    </div>
  );
}

export function RowButton({
  onClick, children, chevron = true, className,
}: { onClick?: () => void; children: React.ReactNode; chevron?: boolean; className?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn("coord-press flex min-h-12 w-full items-center gap-3 px-3 py-2 text-left outline-none hover:bg-muted/40 focus-visible:bg-muted/50", className)}
    >
      <span className="min-w-0 flex-1">{children}</span>
      {chevron ? <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground/60" /> : null}
    </button>
  );
}

export function PersonAvatar({
  name, src, size = 40, dot,
}: { name: string; src?: string | null; size?: number; dot?: "red" | "amber" | null }) {
  return (
    <span className="relative inline-flex shrink-0" style={{ width: size, height: size }}>
      <Avatar className="h-full w-full">
        {src ? <AvatarImage src={src} alt={name} /> : null}
        <AvatarFallback className="text-xs font-semibold" style={{ fontSize: size / 3 }}>{initials(name)}</AvatarFallback>
      </Avatar>
      {dot ? (
        <span
          aria-label={dot === "red" ? "Sin categoría" : "Nunca ha entrado"}
          className={cn(
            "absolute -right-0.5 -top-0.5 h-3 w-3 rounded-full ring-2 ring-background",
            dot === "red" ? "bg-urgency-red" : "bg-urgency-amber",
          )}
        />
      ) : null}
    </span>
  );
}

export function Pill({ children, tone = "default", active, onClick }: {
  children: React.ReactNode; tone?: "default" | "red" | "amber" | "gray"; active?: boolean; onClick?: () => void;
}) {
  const toneCls = {
    default: active ? "bg-primary text-primary-foreground" : "bg-muted/60 text-foreground",
    red: "bg-urgency-red-soft text-urgency-red",
    amber: "bg-urgency-amber-soft text-urgency-amber",
    gray: "bg-urgency-gray-soft text-urgency-gray",
  }[tone];
  const Cmp: any = onClick ? "button" : "span";
  return (
    <Cmp
      type={onClick ? "button" : undefined}
      onClick={onClick}
      className={cn(
        "inline-flex shrink-0 items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold",
        onClick && "coord-press min-h-8 outline-none focus-visible:ring-2 focus-visible:ring-ring",
        toneCls,
      )}
    >
      {children}
    </Cmp>
  );
}

export function UsersTabs<T extends string>({ tabs, value, onChange }: { tabs: { key: T; label: string }[]; value: T; onChange: (v: T) => void }) {
  return (
    <div role="tablist" className="flex gap-5 border-b border-border/40">
      {tabs.map((t) => (
        <button
          key={t.key}
          role="tab"
          aria-selected={value === t.key}
          onClick={() => onChange(t.key)}
          className={cn(
            "relative h-10 text-sm font-semibold outline-none transition-colors",
            value === t.key ? "text-foreground" : "text-muted-foreground",
          )}
        >
          {t.label}
          {value === t.key ? <span className="absolute inset-x-0 -bottom-px h-0.5 rounded-full bg-primary" /> : null}
        </button>
      ))}
    </div>
  );
}

export function Fab({ label, onClick, to, children }: { label: string; onClick?: () => void; to?: string; children: React.ReactNode }) {
  const cls = "coord-press fixed bottom-24 right-5 z-30 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg outline-none focus-visible:ring-2 focus-visible:ring-ring md:bottom-8";
  if (to) return <Link to={to as any} aria-label={label} className={cls}>{children}</Link>;
  return <button aria-label={label} onClick={onClick} className={cls}>{children}</button>;
}

export function StepIndicator({ steps, current }: { steps: string[]; current: number }) {
  return (
    <ol className="flex items-center gap-2">
      {steps.map((s, i) => (
        <li key={s} className="flex min-w-0 flex-1 items-center gap-2">
          <span
            className={cn(
              "flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold",
              i < current ? "bg-primary/20 text-primary" : i === current ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground",
            )}
          >
            {i < current ? <Check className="h-3.5 w-3.5" /> : i + 1}
          </span>
          <span className={cn("truncate text-xs font-semibold", i === current ? "text-foreground" : "text-muted-foreground")}>{s}</span>
        </li>
      ))}
    </ol>
  );
}

export function accessMessage(name: string, email: string, password: string) {
  return `Hola ${name}, ya tienes acceso a Squad.\n\nEntra en: ${getShareAppUrl()}\nCorreo: ${email}\nContraseña temporal: ${password}\n\nAl entrar te pedirá cambiar la contraseña.`;
}

export function whatsappUrl(text: string, phone?: string | null) {
  let digits = (phone ?? "").replace(/\D/g, "");
  // Números de 10 dígitos se asumen de México (+52), como el resto del club.
  if (digits.length === 10) digits = `52${digits}`;
  return `https://wa.me/${digits}?text=${encodeURIComponent(text)}`;
}

/** Pantalla "Listo": acceso para copiar o enviar por WhatsApp. */
export function AccessReady({
  title, name, email, password, phone, children,
}: { title: string; name: string; email: string; password: string; phone?: string | null; children?: React.ReactNode }) {
  const msg = accessMessage(name, email, password);
  async function copy() {
    try {
      await navigator.clipboard.writeText(msg);
      toast.success("Acceso copiado");
    } catch {
      toast.error("No se pudo copiar");
    }
  }
  return (
    <div className="space-y-5 text-center">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary/15">
        <Check className="h-7 w-7 text-primary" />
      </div>
      <div>
        <h2 className="font-display text-xl font-bold">{title}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{name}</p>
      </div>
      <GroupCard className="text-left">
        <InfoRow label="Correo" value={email} />
        <InfoRow label="Contraseña temporal" value={<span className="font-mono">{password}</span>} />
      </GroupCard>
      <p className="text-xs text-muted-foreground">Deberá cambiarla la primera vez que entre.</p>
      <div className="grid grid-cols-2 gap-2">
        <button onClick={copy} className="coord-press inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-muted text-sm font-semibold">
          <Copy className="h-4 w-4" /> Copiar acceso
        </button>
        <a
          href={whatsappUrl(msg, phone)}
          target="_blank"
          rel="noreferrer"
          className="coord-press inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-primary text-sm font-semibold text-primary-foreground"
        >
          <MessageCircle className="h-4 w-4" /> Enviar por WhatsApp
        </a>
      </div>
      {children}
    </div>
  );
}

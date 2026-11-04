import * as React from "react";
import { cn } from "@/lib/utils";
import { initials, type MembershipLite } from "@/components/usuarios/memberUtils";
import { shortName, type AdminMember } from "@/hooks/useAdminUsers";

export type UsersTab = "staff" | "jugadores" | "bajas";
export type Alerta = "sin_categoria" | "sin_entrar";

const TABS: { key: UsersTab; label: string }[] = [
  { key: "staff", label: "Staff" },
  { key: "jugadores", label: "Jugadores" },
  { key: "bajas", label: "Bajas" },
];

/** Pestañas con subrayado verde y conteo en gris (mismo lenguaje que Coordinación). */
export function UserTabs({ value, counts, onChange }: { value: UsersTab | null; counts: Record<UsersTab, number>; onChange: (t: UsersTab) => void }) {
  return (
    <div role="tablist" className="flex gap-5 border-b border-border/40">
      {TABS.map((t) => (
        <button
          key={t.key}
          role="tab"
          aria-selected={value === t.key}
          onClick={() => onChange(t.key)}
          className={cn("relative h-10 text-sm font-semibold outline-none transition-colors", value === t.key ? "text-foreground" : "text-muted-foreground")}
        >
          {t.label} <span className="ml-0.5 font-normal text-muted-foreground">{counts[t.key]}</span>
          {value === t.key ? <span className="absolute inset-x-0 -bottom-px h-0.5 rounded-full bg-primary" /> : null}
        </button>
      ))}
    </div>
  );
}

/** Una línea por alerta, sin tarjeta: punto, texto y "Ver"/"Quitar filtro". */
export function AlertLines({
  sinCategoria, sinEntrar, active, onToggle,
}: { sinCategoria: number; sinEntrar: number; active: Alerta | null; onToggle: (a: Alerta | null) => void }) {
  const rows: { key: Alerta; dot: string; text: string; n: number }[] = [
    { key: "sin_categoria", dot: "bg-urgency-red", n: sinCategoria, text: `${sinCategoria} sin categoría · no ve nada en la app` },
    { key: "sin_entrar", dot: "bg-urgency-amber", n: sinEntrar, text: `${sinEntrar} aún no ${sinEntrar === 1 ? "entra" : "entran"} a la app` },
  ];
  const visible = rows.filter((r) => r.n > 0 || r.key === active);
  if (!visible.length) return null;
  return (
    <div>
      {visible.map((r) => {
        const on = active === r.key;
        return (
          <button
            key={r.key}
            onClick={() => onToggle(on ? null : r.key)}
            className="coord-press flex min-h-10 w-full items-center gap-2.5 text-left text-[13px] outline-none"
          >
            <span className={cn("h-2 w-2 shrink-0 rounded-full", r.dot)} />
            <span className={cn("min-w-0 flex-1 truncate", on ? "font-semibold" : "text-muted-foreground")}>{r.text}</span>
            <span className="shrink-0 text-xs font-semibold text-foreground">{on ? "Quitar filtro" : "Ver"}</span>
          </button>
        );
      })}
    </div>
  );
}

export function PersonGrid({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">{children}</div>;
}

/** "Rol · categoría": "Admin · Todas", "Staff · 2 categorías", "Técnico · Primer Equipo". */
export function roleCategoryLine(mems: MembershipLite[], allCats: boolean) {
  if (mems.length === 0) return "Sin categoría";
  const roles = Array.from(new Set(mems.map((m) => m.roleName).filter(Boolean)));
  const role = roles.join(" / ") || "—";
  if (allCats) return `${role} · Todas`;
  const teams = Array.from(new Set(mems.map((m) => m.teamName ?? "Todo el club")));
  return `${role} · ${teams.length === 1 ? teams[0] : `${teams.length} categorías`}`;
}

export function PersonTile({
  member, subtitle, dot, number, onClick,
}: { member: AdminMember; subtitle: string; dot: "red" | "amber" | null; number?: number | null; onClick: () => void }) {
  const name = shortName(member);
  return (
    <button
      type="button"
      onClick={onClick}
      className="coord-press overflow-hidden rounded-[14px] bg-card text-left outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <span className="relative block aspect-square w-full bg-muted">
        {member.avatar_url ? (
          <img src={member.avatar_url} alt={name} loading="lazy" className="h-full w-full object-cover" />
        ) : (
          <span className="flex h-full w-full items-center justify-center font-display text-2xl font-bold text-muted-foreground">{initials(name)}</span>
        )}
        <span className="pointer-events-none absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-card/80 to-transparent" />
        {number != null ? (
          <span className="absolute left-2 top-2 rounded-full bg-background/80 px-1.5 py-0.5 text-[11px] font-bold tabular-nums backdrop-blur">{number}</span>
        ) : null}
        {dot ? (
          <span
            aria-label={dot === "red" ? "Sin categoría" : "Nunca ha entrado"}
            className={cn("absolute right-2 top-2 h-2.5 w-2.5 rounded-full ring-2 ring-card", dot === "red" ? "bg-urgency-red" : "bg-urgency-amber")}
          />
        ) : null}
      </span>
      <span className="block px-2.5 pb-2.5 pt-1.5">
        <span className="block truncate text-[13px] font-semibold">{name}</span>
        <span className="block truncate text-[11px] text-muted-foreground">{subtitle}</span>
      </span>
    </button>
  );
}

/** Hasta 3 fotos pequeñas superpuestas. */
export function FaceStack({ people }: { people: Pick<AdminMember, "id" | "avatar_url" | "first_name" | "paternal_last_name" | "full_name" | "email">[] }) {
  return (
    <span className="flex -space-x-2">
      {people.slice(0, 3).map((p) => (
        <span key={p.id} className="flex h-6 w-6 items-center justify-center overflow-hidden rounded-full bg-muted text-[9px] font-semibold text-muted-foreground ring-2 ring-card">
          {p.avatar_url ? <img src={p.avatar_url} alt="" className="h-full w-full object-cover" /> : initials(shortName(p))}
        </span>
      ))}
    </span>
  );
}

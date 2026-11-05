import { createFileRoute, Link } from "@tanstack/react-router";
import { ChevronLeft, ChevronRight, Building2, UserX, Tag, IdCard } from "lucide-react";
import { useApp } from "@/components/squad/AppLayout";
import { ClubCrest } from "@/components/squad/ClubCrest";
import { cn } from "@/lib/utils";
import { ADMIN_MODULES, ADMIN_SEASON } from "@/lib/admin/mockData";
import { useAdminUsers, neverSignedIn } from "@/hooks/useAdminUsers";

export const Route = createFileRoute("/_authenticated/administracion/")({
  head: () => ({
    meta: [
      { title: "Administración — Squad" },
      { name: "description", content: "Administra usuarios, torneos y la identidad de tu club." },
      { property: "og:title", content: "Administración — Squad" },
      { property: "og:description", content: "Administra usuarios, torneos y la identidad de tu club." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AdministracionPage,
});

const PILL = {
  red: "bg-urgency-red-soft text-urgency-red",
  amber: "bg-urgency-amber-soft text-urgency-amber",
  gray: "bg-urgency-gray-soft text-urgency-gray",
} as const;

function AdministracionPage() {
  const { clubName, profile, isSuperAdmin } = useApp() as any;
  const data = useAdminUsers(profile?.club_id ?? null);
  const active = (data.members.data ?? []).filter((m) => (m.status ?? "activo") === "activo");
  const sinCategoria = active.filter((m) => (data.byUser.get(m.id) ?? []).length === 0).length;
  const sinEntrar = active.filter((m) => neverSignedIn(m, data.signInMap, data.signInAvailable)).length;
  const loading = data.members.isLoading || data.memberships.isLoading;
  const show = (n: number) => (loading ? "…" : String(n));
  const teamsCount = (data.teams.data ?? []).length;

  const stats = [
    { value: show(active.length), label: "miembros" },
    { value: data.teams.isLoading ? "…" : String(teamsCount), label: "categorías" },
    { value: "1", label: "torneo en curso" },
  ];

  const pending = [
    { key: "sin_categoria", icon: Tag, text: "Sin categoría", context: "Miembros sin rol asignado", value: sinCategoria, urgency: sinCategoria ? "red" : "gray" },
    { key: "sin_entrar", icon: UserX, text: "Sin entrar a la app", context: "Nunca han iniciado sesión", value: sinEntrar, urgency: sinEntrar ? "amber" : "gray" },
    ...(data.sinFicha.size > 0
      ? [{ key: "sin_ficha", icon: IdCard, text: "Jugadores sin ficha deportiva", context: "Sin dorsal ni posición", value: data.sinFicha.size, urgency: "gray" }]
      : []),
  ] as const;

  const statFor = (key: string, fallback: string) =>
    key === "usuarios" ? `${show(active.length)} activos` : key === "club" ? `${teamsCount} categorías` : fallback;

  return (
    <div className="-mt-2 space-y-5">
      <header className="flex items-center gap-1">
        <Link to="/" aria-label="Regresar" className="coord-press -ml-2 flex h-10 w-10 items-center justify-center rounded-xl">
          <ChevronLeft className="h-5 w-5" />
        </Link>
        <h1 className="font-display text-[20px] font-bold">Administración</h1>
      </header>

      <section className="flex items-center gap-4 rounded-[18px] bg-card/60 p-4">
        <ClubCrest clubId={profile?.club_id ?? null} clubName={clubName ?? null} className="shrink-0 [&_img]:h-14 [&_img]:w-auto [&_img]:object-contain [&_img]:rounded-none [&_span]:!hidden" />
        <div className="min-w-0">
          <p className="truncate font-display text-lg font-bold">{clubName ?? "Mi club"}</p>
          <p className="truncate text-[13px] text-muted-foreground">{ADMIN_SEASON}</p>
        </div>
      </section>

      <section className="grid grid-cols-3 gap-2">
        {stats.map((s) => (
          <div key={s.label}>
            <p className="font-display text-3xl font-bold leading-none">{s.value}</p>
            <p className="mt-1 text-xs text-muted-foreground">{s.label}</p>
          </div>
        ))}
      </section>

      <section>
        <h2 className="mb-1.5 text-xs font-semibold text-muted-foreground">Atención</h2>
        <ul className="divide-y divide-border/40 overflow-hidden rounded-[14px] bg-card">
          {pending.map((p) => {
            const I = p.icon;
            return (
              <li key={p.key}>
                <Link
                  to="/administracion/usuarios"
                  search={p.key === "sin_ficha" ? { tab: "jugadores", alerta: p.key } : { alerta: p.key }}
                  className="coord-press flex w-full items-center gap-3 px-3 py-2.5 outline-none hover:bg-muted/40 focus-visible:bg-muted/50"
                >
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10">
                    <I className="h-[15px] w-[15px] text-primary" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">{p.text}</span>
                    <span className="block truncate text-[11px] text-muted-foreground">{p.context}</span>
                  </span>
                  <span className={cn("shrink-0 rounded-full px-2.5 py-0.5 text-xs font-bold", PILL[p.urgency])}>{show(p.value)}</span>
                  <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground/60" />
                </Link>
              </li>
            );
          })}
        </ul>
      </section>

      <section>
        <h2 className="mb-1.5 text-xs font-semibold text-muted-foreground">Administrar</h2>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3 sm:gap-3">
          {ADMIN_MODULES.map((m) => {
            const I = m.icon;
            const cls = "coord-press flex items-center gap-3 rounded-[16px] bg-card px-3 py-2.5 outline-none focus-visible:ring-2 focus-visible:ring-ring sm:flex-col sm:items-start sm:p-4";
            const inner = (
              <>
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                  <I className="h-5 w-5 text-primary" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block font-display text-[15px] font-bold leading-tight">{m.name}</span>
                  <span className="block truncate text-xs text-muted-foreground">{m.line} · <span className="font-semibold text-primary">{statFor(m.key, m.stat)}</span></span>
                </span>
                <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground/60 sm:hidden" />
              </>
            );
            return m.key === "usuarios" ? (
              <Link key={m.key} to="/administracion/usuarios" className={cls}>{inner}</Link>
            ) : (
              <Link key={m.key} to="/administracion/$module" params={{ module: m.key }} className={cls}>{inner}</Link>
            );
          })}
        </div>
      </section>

      <div className="flex flex-col items-center gap-3 pt-4 text-xs text-muted-foreground">
        {isSuperAdmin ? (
          <Link to="/admin/clubs" className="inline-flex items-center gap-1.5 hover:text-foreground">
            <Building2 className="h-3.5 w-3.5" /> Clubes
          </Link>
        ) : null}
        <Link to="/admin" className="underline-offset-2 hover:underline">Ver versión actual</Link>
      </div>
    </div>
  );
}

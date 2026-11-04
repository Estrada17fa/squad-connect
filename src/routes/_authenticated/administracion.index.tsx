import { createFileRoute, Link } from "@tanstack/react-router";
import { ChevronLeft, ChevronRight, Building2 } from "lucide-react";
import { useApp } from "@/components/squad/AppLayout";
import { ClubCrest } from "@/components/squad/ClubCrest";
import { PendingList } from "@/components/coord/PendingList";
import { COORD_AREAS } from "@/lib/coordAreas";
import { ADMIN_MODULES, ADMIN_PENDING, ADMIN_SEASON, ADMIN_STATS } from "@/lib/admin/mockData";

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

function AdministracionPage() {
  const { clubName, profile, isSuperAdmin } = useApp() as any;
  const area = COORD_AREAS[0];
  return (
    <div className="-mt-2 space-y-6">
      <header className="flex items-center gap-1">
        <Link to="/" aria-label="Regresar" className="coord-press -ml-2 flex h-10 w-10 items-center justify-center rounded-xl">
          <ChevronLeft className="h-5 w-5" />
        </Link>
        <h1 className="font-display text-[20px] font-bold">Administración</h1>
      </header>

      <section className="flex items-center gap-4 rounded-[18px] bg-card/60 p-4">
        <ClubCrest clubId={profile?.club_id ?? null} clubName={clubName ?? null} className="shrink-0 [&_img]:h-14 [&_img]:w-auto [&_img]:object-contain [&_img]:rounded-none" />
        <div className="min-w-0">
          <p className="truncate font-display text-lg font-bold">{clubName ?? "Mi club"}</p>
          <p className="truncate text-[13px] text-muted-foreground">{ADMIN_SEASON}</p>
        </div>
      </section>

      <section className="grid grid-cols-3 gap-2">
        {ADMIN_STATS.map((s) => (
          <div key={s.label}>
            <p className="font-display text-3xl font-bold leading-none">{s.value}</p>
            <p className="mt-1 text-xs text-muted-foreground">{s.label}</p>
          </div>
        ))}
      </section>

      <section>
        <h2 className="mb-1.5 text-xs font-semibold text-muted-foreground">Atención</h2>
        <PendingList area={area} items={ADMIN_PENDING} all />
      </section>

      <section>
        <h2 className="mb-1.5 text-xs font-semibold text-muted-foreground">Administrar</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {ADMIN_MODULES.map((m) => {
            const I = m.icon;
            return (
              <Link
                key={m.key}
                to="/administracion/$module"
                params={{ module: m.key }}
                className="coord-press flex items-center gap-4 rounded-[18px] bg-card p-4 outline-none focus-visible:ring-2 focus-visible:ring-ring sm:flex-col sm:items-start"
              >
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary/10">
                  <I className="h-6 w-6 text-primary" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block font-display text-base font-bold">{m.name}</span>
                  <span className="block truncate text-[13px] text-muted-foreground">{m.line}</span>
                  <span className="mt-1 block text-xs font-semibold text-primary">{m.stat}</span>
                </span>
                <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground/60 sm:hidden" />
              </Link>
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

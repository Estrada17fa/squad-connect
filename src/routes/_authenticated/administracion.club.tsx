import { createFileRoute, Link } from "@tanstack/react-router";
import { Shield } from "lucide-react";
import { useApp } from "@/components/squad/AppLayout";
import { canManageUsers } from "@/lib/permissions";
import { EmptyState } from "@/components/squad/EmptyState";
import { UsersHeader, BackLabel, SectionLabel, GroupCard } from "@/components/admin/users/ui";
import { useClubPasswordStatus } from "@/components/admin/users/PasswordChoice";
import { IdentitySection } from "@/components/admin/club/IdentitySection";
import { CategoriesSection } from "@/components/admin/club/CategoriesSection";
import { LocationsSection } from "@/components/admin/club/LocationsSection";
import { PreferencesSection } from "@/components/admin/club/PreferencesSection";
import { ValueRow } from "@/components/admin/club/parts";

export const Route = createFileRoute("/_authenticated/administracion/club")({
  head: () => ({
    meta: [
      { title: "Club — Administración · Squad" },
      { name: "description", content: "Identidad, categorías, ubicaciones y preferencias del club." },
      { property: "og:title", content: "Club — Administración · Squad" },
      { property: "og:description", content: "Identidad, categorías, ubicaciones y preferencias del club." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ClubPage,
});

function ClubPage() {
  const { user, profile, isSuperAdmin, permissions } = useApp();
  const canEdit = isSuperAdmin || canManageUsers(permissions["usuarios"]);
  const clubId = profile?.club_id ?? null;
  const pw = useClubPasswordStatus();

  if (!canEdit) {
    return <EmptyState icon={Shield} title="Acceso restringido" message="Esta sección es solo para quien administra el club." />;
  }

  return (
    <div className="space-y-5 pb-8">
      <UsersHeader back={<Link to="/administracion"><BackLabel>Administración</BackLabel></Link>} title="Club" />
      {clubId ? (
        <>
          <IdentitySection clubId={clubId} canEdit={canEdit} />
          <CategoriesSection clubId={clubId} canEdit={canEdit} />
          <LocationsSection clubId={clubId} userId={user.id} canEdit={canEdit} />
          <PreferencesSection clubId={clubId} canEdit={canEdit} />
          <section>
            <SectionLabel>Seguridad</SectionLabel>
            <GroupCard>
              <ValueRow
                label="Contraseña del club"
                value={
                  pw.isLoading ? "…" : pw.data?.configured ? (
                    <span className="font-semibold text-primary">Configurada</span>
                  ) : (
                    <span className="font-semibold text-urgency-amber">Falta configurar</span>
                  )
                }
              />
            </GroupCard>
            <p className="mt-1.5 px-1 text-[11px] text-muted-foreground">
              Por seguridad se cambia desde la configuración del servidor. Recomendado: cambiarla cada temporada.
            </p>
          </section>
          {isSuperAdmin ? (
            <GroupCard>
              <Link to="/admin/clubs" className="coord-press flex min-h-12 items-center justify-between px-3 text-sm text-muted-foreground">
                Administrar clubes <span aria-hidden>›</span>
              </Link>
            </GroupCard>
          ) : null}
        </>
      ) : null}
    </div>
  );
}

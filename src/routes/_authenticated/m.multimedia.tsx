import * as React from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Images } from "lucide-react";
import { PageHeader } from "@/components/squad/PageHeader";
import { ModuleTabs } from "@/components/squad/ModuleTabs";
import { EmptyState } from "@/components/squad/EmptyState";
import { CardGridSkeleton } from "@/components/squad/LoadingState";
import { useApp } from "@/components/squad/AppLayout";
import { useTeamAccess } from "@/hooks/useTeamAccess";
import { useMediaPosts } from "@/hooks/useMultimedia";
import { MediaFeedCard } from "@/components/multimedia/MediaFeedCard";
import {
  EMPTY_MEDIA_FILTERS,
  MediaFilters,
  matchesMediaFilters,
  type MediaFilterState,
} from "@/components/multimedia/MediaFilters";

export const Route = createFileRoute("/_authenticated/m/multimedia")({
  head: () => ({
    meta: [
      { title: "Squad — Multimedia" },
      {
        name: "description",
        content: "Feed de fotos y videos del club: ver, descargar, dar like y comentar.",
      },
      { property: "og:title", content: "Squad — Multimedia" },
      {
        property: "og:description",
        content: "Fotos y videos de entrenamientos, partidos y eventos de tu categoría.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: MultimediaPage,
});

function MultimediaPage() {
  const { profile, user, teamOptions, isSuperAdmin, accessibleModules } = useApp();
  const clubId = profile?.club_id ?? null;
  const userId = user?.id ?? "";
  const canAccess = isSuperAdmin || accessibleModules.includes("multimedia");
  const { levelForTeam } = useTeamAccess("multimedia");
  const canModerate = isSuperAdmin || levelForTeam(null) === "editor_global";

  const [filters, setFilters] = React.useState<MediaFilterState>(EMPTY_MEDIA_FILTERS);
  const listQ = useMediaPosts(canAccess ? clubId : null, userId);

  const rows = React.useMemo(
    () => (listQ.data ?? []).filter((p) => matchesMediaFilters(p, filters)),
    [listQ.data, filters],
  );

  const realTeams = React.useMemo(
    () => teamOptions.flatMap((t) => (t.id ? [{ id: t.id, name: t.name }] : [])),
    [teamOptions],
  );

  if (!canAccess) {
    return (
      <div className="space-y-6">
        <ModuleTabs activeKey="multimedia" />
        <PageHeader hideTitle title="Multimedia" subtitle="Fotos y videos del club" />
        <EmptyState
          icon={Images}
          title="Sin acceso"
          message="Tu rol actual no tiene permisos para este módulo."
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <ModuleTabs activeKey="multimedia" />
      <PageHeader hideTitle title="Multimedia" subtitle="Fotos y videos de tu categoría" />

      <MediaFilters value={filters} onChange={setFilters} teams={realTeams} count={rows.length} />

      {listQ.isLoading ? (
        <CardGridSkeleton />
      ) : rows.length === 0 ? (
        <EmptyState
          icon={Images}
          title="Sin publicaciones"
          message="Todavía no hay fotos ni videos con estos filtros."
        />
      ) : (
        <div className="space-y-4">
          {rows.map((p) => (
            <MediaFeedCard key={p.id} post={p} userId={userId} canModerate={canModerate} />
          ))}
        </div>
      )}
    </div>
  );
}

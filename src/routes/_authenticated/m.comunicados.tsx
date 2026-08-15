import * as React from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Megaphone, Paperclip, Plus, User, Users } from "lucide-react";
import { PageHeader } from "@/components/squad/PageHeader";
import { ModuleTabs } from "@/components/squad/ModuleTabs";
import { EmptyState } from "@/components/squad/EmptyState";
import { CardGridSkeleton } from "@/components/squad/LoadingState";
import { Button } from "@/components/ui/button";
import { useApp } from "@/components/squad/AppLayout";
import { useTeamAccess } from "@/hooks/useTeamAccess";
import { useEditableTeams } from "@/hooks/useEditableTeams";
import {
  audienceLabel,
  formatAnnouncementDate,
  sortAnnouncements,
  useAnnouncements,
  type AnnouncementRow,
} from "@/hooks/useAnnouncements";
import {
  AnnouncementChip,
  PriorityBadge,
} from "@/components/comunicados/ComunicadosPieces";
import { AnnouncementDetailSheet } from "@/components/comunicados/AnnouncementDetailSheet";
import { AnnouncementFormDialog } from "@/components/comunicados/AnnouncementFormDialog";
import {
  ComunicadosFilters,
  EMPTY_ANNOUNCEMENT_FILTERS,
  type AnnouncementFilterState,
} from "@/components/comunicados/ComunicadosFilters";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/m/comunicados")({
  head: () => ({
    meta: [
      { title: "Squad — Comunicados" },
      {
        name: "description",
        content: "Tablón de avisos oficiales del club por categoría, con confirmación de lectura.",
      },
      { property: "og:title", content: "Squad — Comunicados" },
      {
        property: "og:description",
        content: "Avisos del club y de tu categoría, con prioridad y confirmación de lectura.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ComunicadosPage,
});

function ComunicadosPage() {
  const { profile, user, teamOptions, isSuperAdmin, accessibleModules } = useApp();
  const clubId = profile?.club_id ?? null;
  const userId = user?.id ?? "";
  const canAccess = isSuperAdmin || accessibleModules.includes("comunicados");
  const { levelForTeam } = useTeamAccess("comunicados");
  const editableTeams = useEditableTeams("comunicados");

  const canPublishClubWide = isSuperAdmin || levelForTeam(null) === "editor_global";
  const canEditAny = editableTeams.length > 0 || canPublishClubWide;

  const [filters, setFilters] = React.useState<AnnouncementFilterState>(
    EMPTY_ANNOUNCEMENT_FILTERS,
  );
  const [formOpen, setFormOpen] = React.useState(false);
  const [detail, setDetail] = React.useState<AnnouncementRow | null>(null);

  const listQ = useAnnouncements(canAccess ? clubId : null, userId);

  /** Un comunicado es editable si el usuario es editor de TODAS sus categorías. */
  const canEditRow = React.useCallback(
    (a: AnnouncementRow) => {
      if (isSuperAdmin || canPublishClubWide) return true;
      if (a.audience === "club") return false;
      if (!a.teams.length) return false;
      return a.teams.every((t) => editableTeams.some((e) => e.id === t.team_id));
    },
    [isSuperAdmin, canPublishClubWide, editableTeams],
  );

  const q = filters.search.trim().toLowerCase();
  const rows = React.useMemo(() => {
    const all = listQ.data ?? [];
    const filtered = all.filter((a) => {
      if (filters.priority && a.priority !== filters.priority) return false;
      if (filters.teamId && !a.teams.some((t) => t.team_id === filters.teamId)) return false;
      if (filters.readState === "leidos" && !a.read) return false;
      if (filters.readState === "no_leidos" && a.read) return false;
      if (q && !a.title.toLowerCase().includes(q) && !a.body.toLowerCase().includes(q))
        return false;
      return true;
    });
    return sortAnnouncements(filtered);
  }, [listQ.data, filters, q]);

  const unread = (listQ.data ?? []).filter((a) => !a.read).length;

  if (!canAccess) {
    return (
      <div className="space-y-6">
        <ModuleTabs activeKey="comunicados" />
        <PageHeader hideTitle title="Comunicados" subtitle="Avisos oficiales del club" />
        <EmptyState
          icon={Megaphone}
          title="Sin acceso"
          message="Tu rol actual no tiene permisos para este módulo."
        />
      </div>
    );
  }

  function renderCard(a: AnnouncementRow) {
    const urgent = a.priority === "urgente";
    return (
      <button
        key={a.id}
        type="button"
        onClick={() => setDetail(a)}
        className={cn(
          "glass relative w-full overflow-hidden p-4 pl-5 text-left transition-all hover:border-white/15 hover:bg-white/[0.06] active:scale-[0.99]",
          urgent && "border-status-rejected/40",
          !a.read && "ring-1 ring-inset ring-primary/30",
        )}
      >
        <AccentBar color={ANNOUNCEMENT_ACCENT[a.priority]} label={PRIORITY_LABEL[a.priority]} />
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              {!a.read ? <span className="h-2 w-2 shrink-0 rounded-full bg-primary" /> : null}
              <p
                className={cn(
                  "break-words font-display font-semibold text-foreground [overflow-wrap:anywhere]",
                  !a.read && "text-foreground",
                )}
              >
                {a.title}
              </p>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              {formatAnnouncementDate(a.published_at)}
            </p>
          </div>
          <PriorityBadge priority={a.priority} />
        </div>

        <p className="mt-2 line-clamp-2 text-sm text-foreground/80">{a.body}</p>

        <div className="mt-3 flex flex-wrap gap-1.5">
          <AnnouncementChip icon={Users} tone="primary">
            {audienceLabel(a)}
          </AnnouncementChip>
          {a.author?.full_name ? (
            <AnnouncementChip icon={User}>{a.author.full_name}</AnnouncementChip>
          ) : null}
          {a.attachment_path ? (
            <AnnouncementChip icon={Paperclip}>Adjunto</AnnouncementChip>
          ) : null}
        </div>
      </button>
    );
  }

  return (
    <div className="space-y-6">
      <ModuleTabs activeKey="comunicados" />
      <PageHeader
        hideTitle
        title="Comunicados"
        subtitle={unread ? `${unread} sin leer` : "Avisos oficiales del club"}
      />

      {canEditAny && clubId ? (
        <Button
          className="w-full glow-primary"
          onClick={() => {
            setFormOpen(true);
          }}
        >
          <Plus className="mr-2 h-4 w-4" />
          Nuevo comunicado
        </Button>
      ) : null}

      <ComunicadosFilters
        value={filters}
        onChange={setFilters}
        teams={teamOptions.flatMap((t) => (t.id ? [{ id: t.id, name: t.name }] : []))}
        count={rows.length}
      />

      {listQ.isLoading ? (
        <CardGridSkeleton count={3} />
      ) : rows.length === 0 ? (
        <EmptyState
          icon={Megaphone}
          title="Sin comunicados"
          message="Aún no hay avisos que coincidan con los filtros."
        />
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">{rows.map(renderCard)}</div>
      )}

      {clubId ? (
        <AnnouncementFormDialog
          open={formOpen}
          onOpenChange={setFormOpen}
          clubId={clubId}
          userId={userId}
          teams={editableTeams}
          canPublishClubWide={canPublishClubWide}
        />
      ) : null}

      <AnnouncementDetailSheet
        open={!!detail}
        onOpenChange={(v) => {
          if (!v) setDetail(null);
        }}
        announcement={detail}
        canEdit={detail ? canEditRow(detail) : false}
        clubId={clubId}
        userId={userId}
        teams={editableTeams}
        canPublishClubWide={canPublishClubWide}
      />
    </div>
  );
}

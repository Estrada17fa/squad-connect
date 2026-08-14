import * as React from "react";
import { Images, Pencil, Plus, Video } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/squad/EmptyState";
import { CardGridSkeleton } from "@/components/squad/LoadingState";
import { useApp } from "@/components/squad/AppLayout";
import { useTeamAccess } from "@/hooks/useTeamAccess";
import { useEditableTeams } from "@/hooks/useEditableTeams";
import { formatDateTime } from "@/lib/calendar-utils";
import { MEDIA_TYPE_ICON, MEDIA_TYPE_LABEL } from "@/lib/multimedia";
import { useMediaPosts, useMediaUrls, type MediaPost } from "@/hooks/useMultimedia";
import { MediaFormDialog } from "./MediaFormDialog";
import {
  EMPTY_MEDIA_FILTERS,
  MediaFilters,
  matchesMediaFilters,
  type MediaFilterState,
} from "./MediaFilters";

function Thumb({ post }: { post: MediaPost }) {
  const first = post.files[0];
  const urls = useMediaUrls(first ? [first.storage_path] : []);
  const url = first ? urls.data?.[first.storage_path] : undefined;
  return (
    <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-white/[0.06]">
      {url && first?.kind === "image" ? (
        <img src={url} alt="" className="h-full w-full object-cover" />
      ) : (
        <div className="flex h-full w-full items-center justify-center text-muted-foreground">
          {first?.kind === "video" ? <Video className="h-5 w-5" /> : <Images className="h-5 w-5" />}
        </div>
      )}
      {post.files.length > 1 ? (
        <span className="absolute bottom-0.5 right-0.5 rounded bg-black/70 px-1 text-[10px] tabular-nums text-white">
          {post.files.length}
        </span>
      ) : null}
    </div>
  );
}

/** Gestión de multimedia dentro de Coordinación: subir, editar y eliminar. */
export function MediaManagerPanel() {
  const { profile, user, isSuperAdmin, teamOptions } = useApp();
  const clubId = profile?.club_id ?? null;
  const userId = user?.id ?? "";
  const { levelForTeam } = useTeamAccess("multimedia");
  const editableTeams = useEditableTeams("multimedia");

  const canPublishClubWide = isSuperAdmin || levelForTeam(null) === "editor_global";
  const canCreate = canPublishClubWide || editableTeams.length > 0;

  const [filters, setFilters] = React.useState<MediaFilterState>(EMPTY_MEDIA_FILTERS);
  const [formOpen, setFormOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<MediaPost | null>(null);

  const listQ = useMediaPosts(clubId, userId);
  const rows = React.useMemo(
    () => (listQ.data ?? []).filter((p) => matchesMediaFilters(p, filters)),
    [listQ.data, filters],
  );

  const realTeams = React.useMemo(
    () => teamOptions.flatMap((t) => (t.id ? [{ id: t.id, name: t.name }] : [])),
    [teamOptions],
  );

  const canEditRow = React.useCallback(
    (p: MediaPost) => {
      if (isSuperAdmin || canPublishClubWide) return true;
      if (p.audience === "club" || !p.teams.length) return false;
      return p.teams.every((t) => editableTeams.some((e) => e.id === t.team_id));
    },
    [isSuperAdmin, canPublishClubWide, editableTeams],
  );

  return (
    <div className="space-y-4">
      {canCreate ? (
        <Button
          className="w-full glow-primary"
          onClick={() => {
            setEditing(null);
            setFormOpen(true);
          }}
        >
          <Plus className="mr-2 h-4 w-4" /> Nueva publicación
        </Button>
      ) : null}

      <MediaFilters value={filters} onChange={setFilters} teams={realTeams} count={rows.length} />

      {listQ.isLoading ? (
        <CardGridSkeleton />
      ) : rows.length === 0 ? (
        <EmptyState
          icon={Images}
          title="Sin publicaciones"
          message="Aún no hay fotos ni videos con estos filtros."
        />
      ) : (
        <div className="space-y-2">
          {rows.map((p) => {
            const TypeIcon = MEDIA_TYPE_ICON[p.type];
            const audience =
              p.audience === "club"
                ? "Todo el club"
                : p.teams.map((t) => t.name).filter(Boolean).join(", ") || "Categorías";
            const editable = canEditRow(p);
            return (
              <div key={p.id} className="glass flex items-center gap-3 p-3">
                <Thumb post={p} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-foreground">
                    {p.title ?? MEDIA_TYPE_LABEL[p.type]}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {formatDateTime(p.published_at)} · {audience}
                  </p>
                  <p className="mt-1 inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[11px] text-primary">
                    <TypeIcon className="h-3 w-3" />
                    {MEDIA_TYPE_LABEL[p.type]}
                  </p>
                </div>
                {editable ? (
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label="Editar publicación"
                    onClick={() => {
                      setEditing(p);
                      setFormOpen(true);
                    }}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                ) : null}
              </div>
            );
          })}
        </div>
      )}

      {clubId ? (
        <MediaFormDialog
          open={formOpen}
          onOpenChange={setFormOpen}
          clubId={clubId}
          userId={userId}
          teams={editableTeams}
          canPublishClubWide={canPublishClubWide}
          post={editing}
        />
      ) : null}
    </div>
  );
}

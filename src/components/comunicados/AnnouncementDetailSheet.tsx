import * as React from "react";
import { CalendarClock, User, Users } from "lucide-react";
import {
  DetailField,
  DetailSection,
  DetailSheet,
  DetailValue,
} from "@/components/squad/DetailSheet";
import type { TeamOption } from "@/hooks/useAccess";
import {
  audienceLabel,
  formatAnnouncementDate,
  useDeleteAnnouncement,
  useMarkRead,
  type AnnouncementRow,
} from "@/hooks/useAnnouncements";
import { DeleteAction } from "@/components/squad/DeleteAction";
import { AnnouncementChip, AttachmentPreview, PriorityBadge } from "./ComunicadosPieces";
import { AnnouncementFormDialog } from "./AnnouncementFormDialog";
import { ReadReceipts } from "./ReadReceipts";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  announcement: AnnouncementRow | null;
  canEdit: boolean;
  clubId: string | null;
  userId: string;
  teams: TeamOption[];
  canPublishClubWide: boolean;
}

/** Ficha de lectura del comunicado. Al abrirla se confirma la lectura. */
export function AnnouncementDetailSheet({
  open,
  onOpenChange,
  announcement,
  canEdit,
  clubId,
  userId,
  teams,
  canPublishClubWide,
}: Props) {
  const markRead = useMarkRead();
  const del = useDeleteAnnouncement();
  const id = announcement?.id;
  const alreadyRead = announcement?.read;

  React.useEffect(() => {
    if (!open || !id || !userId || alreadyRead) return;
    markRead.mutate({ announcementId: id, userId });
    // Solo al abrir un comunicado no leído.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, id, userId]);

  if (!announcement) return null;

  return (
    <DetailSheet
      open={open}
      onOpenChange={onOpenChange}
      title={announcement.title}
      description={formatAnnouncementDate(announcement.published_at)}
      canEdit={canEdit && !!clubId}
      headerActions={<PriorityBadge priority={announcement.priority} />}
      renderEdit={
        clubId
          ? ({ done }) => (
              <AnnouncementFormDialog
                open
                onOpenChange={(v) => {
                  if (!v) done();
                }}
                clubId={clubId}
                userId={userId}
                teams={teams}
                canPublishClubWide={canPublishClubWide}
                announcement={announcement}
                onDeleted={() => onOpenChange(false)}
              />
            )
          : undefined
      }
    >
      <div className="flex flex-wrap gap-1.5">
        <AnnouncementChip icon={Users} tone="primary">
          {audienceLabel(announcement)}
        </AnnouncementChip>
        {announcement.author?.full_name ? (
          <AnnouncementChip icon={User}>{announcement.author.full_name}</AnnouncementChip>
        ) : null}
        <AnnouncementChip icon={CalendarClock}>
          {formatAnnouncementDate(announcement.published_at)}
        </AnnouncementChip>
      </div>

      <DetailSection title="Comunicado">
        <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground/90 [overflow-wrap:anywhere]">
          {announcement.body}
        </p>
      </DetailSection>

      {announcement.attachment_path ? (
        <DetailSection title="Adjunto">
          <AttachmentPreview
            path={announcement.attachment_path}
            name={announcement.attachment_name}
            type={announcement.attachment_type}
          />
        </DetailSection>
      ) : null}

      <DetailSection title="Detalle">
        <DetailField label="Dirigido a" icon={Users}>
          <DetailValue value={audienceLabel(announcement)} />
        </DetailField>
        <DetailField label="Publicado por" icon={User}>
          <DetailValue value={announcement.author?.full_name ?? "—"} />
        </DetailField>
        <DetailField label="Fecha" icon={CalendarClock}>
          {formatAnnouncementDate(announcement.published_at)}
        </DetailField>
      </DetailSection>

      {canEdit ? <ReadReceipts announcement={announcement} /> : null}
    </DetailSheet>
  );
}

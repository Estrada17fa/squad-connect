import * as React from "react";
import { Check, Clock, Users } from "lucide-react";
import {
  DetailAvatars,
  DetailEmptyBlock,
  DetailPeopleList,
  DetailSection,
  type DetailPerson,
} from "@/components/squad/DetailSheet";
import {
  formatAnnouncementDate,
  useAnnouncementReads,
  useAnnouncementRecipients,
  type AnnouncementRow,
} from "@/hooks/useAnnouncements";

/** Confirmación de lectura: solo la ve quien puede editar el comunicado. */
export function ReadReceipts({ announcement }: { announcement: AnnouncementRow }) {
  const readsQ = useAnnouncementReads(announcement.id);
  const recipientsQ = useAnnouncementRecipients(
    announcement.club_id,
    announcement.audience,
    announcement.teams.map((t) => t.team_id),
  );

  const reads = readsQ.data ?? {};
  const recipients = recipientsQ.data ?? [];
  const readCount = recipients.filter((r) => reads[r.id]).length;

  const ordered = React.useMemo(
    () =>
      [...recipients].sort((a, b) => {
        const ra = reads[a.id] ? 0 : 1;
        const rb = reads[b.id] ? 0 : 1;
        if (ra !== rb) return ra - rb;
        return (a.full_name ?? "").localeCompare(b.full_name ?? "");
      }),
    [recipients, reads],
  );

  const people: DetailPerson[] = ordered.map((r) => {
    const at = reads[r.id];
    return {
      id: r.id,
      name: r.full_name ?? "Sin nombre",
      avatarUrl: r.avatar_url ?? null,
      detail: at ? formatAnnouncementDate(at) : "Pendiente",
      status: at ? (
        <Check className="h-4 w-4 text-primary" />
      ) : (
        <Clock className="h-4 w-4 text-muted-foreground" />
      ),
    };
  });

  return (
    <DetailSection title="Confirmación de lectura" icon={Check}>
      {recipients.length === 0 ? (
        <DetailEmptyBlock icon={Users}>Sin destinatarios registrados.</DetailEmptyBlock>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <p className="text-sm text-muted-foreground">
              <span className="font-display text-xl font-semibold text-primary">{readCount}</span> de{" "}
              {recipients.length} leyeron
            </p>
            <div className="ml-auto">
              <DetailAvatars people={people.filter((p) => p.detail !== "Pendiente")} max={6} />
            </div>
          </div>
          <DetailPeopleList people={people} />
        </div>
      )}
    </DetailSection>
  );
}

import * as React from "react";
import { Check, Clock } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { DetailSection } from "@/components/squad/DetailSheet";
import {
  formatAnnouncementDate,
  useAnnouncementReads,
  useAnnouncementRecipients,
  type AnnouncementRow,
} from "@/hooks/useAnnouncements";

function initials(name: string | null) {
  if (!name) return "?";
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0]?.toUpperCase())
    .join("");
}

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

  return (
    <DetailSection title="Lectura">
      <p className="text-sm text-foreground">
        <span className="font-display text-lg font-semibold text-primary">{readCount}</span>{" "}
        de {recipients.length} leyeron
      </p>

      {recipients.length === 0 ? (
        <p className="text-xs text-muted-foreground">Sin destinatarios registrados.</p>
      ) : (
        <ul className="mt-2 space-y-2">
          {ordered.map((r) => {
            const at = reads[r.id];
            return (
              <li key={r.id} className="flex items-center gap-3">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={r.avatar_url ?? undefined} alt="" />
                  <AvatarFallback className="text-xs">{initials(r.full_name)}</AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm text-foreground">{r.full_name ?? "Sin nombre"}</p>
                  {at ? (
                    <p className="truncate text-xs text-muted-foreground">
                      {formatAnnouncementDate(at)}
                    </p>
                  ) : (
                    <p className="text-xs text-muted-foreground">Pendiente</p>
                  )}
                </div>
                {at ? (
                  <Check className="h-4 w-4 shrink-0 text-primary" />
                ) : (
                  <Clock className="h-4 w-4 shrink-0 text-muted-foreground" />
                )}
              </li>
            );
          })}
        </ul>
      )}
    </DetailSection>
  );
}

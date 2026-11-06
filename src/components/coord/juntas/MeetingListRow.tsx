import { Link } from "@tanstack/react-router";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { MapPin } from "lucide-react";
import { AvatarStack } from "@/components/coordinacion/AvatarStack";
import type { MeetingRow } from "@/hooks/useCoordinacion";
import { confirmedSummary, timeRange } from "@/lib/juntas";
import { cn } from "@/lib/utils";

export function MeetingListRow({ m }: { m: MeetingRow }) {
  const d = new Date(m.starts_at);
  const sum = confirmedSummary(m.attendees);
  const live = m.status === "en_curso" || m.status === "en_pausa";
  const cancelled = m.status === "cancelada";
  return (
    <li>
      <Link to="/coordinacion/general/juntas/$meetingId" params={{ meetingId: m.id }} className="coord-press flex items-center gap-3 px-3 py-2.5 outline-none focus-visible:underline">
        <span className={cn("flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-xl", live ? "bg-area-general text-background" : "bg-muted")}>
          <span className="text-lg font-bold leading-none">{format(d, "d")}</span>
          <span className="text-[10px] font-semibold uppercase">{format(d, "MMM", { locale: es }).replace(".", "")}</span>
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-1.5">
            <span className={cn("truncate text-sm font-medium", cancelled && "text-muted-foreground line-through")}>{m.title}</span>
            {live ? <span className="shrink-0 rounded-full bg-area-general-soft px-2 py-0.5 text-[10px] font-bold text-area-general">En curso</span> : null}
            {cancelled ? <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-[10px] font-bold text-muted-foreground">Cancelada</span> : null}
          </span>
          <span className="block truncate text-[11px] text-muted-foreground">
            {timeRange(m.starts_at, m.ends_at)}
            {m.location ? <> · <MapPin className="inline h-3 w-3 -translate-y-px" /> {m.location.split(",")[0]}</> : null}
          </span>
          {sum.total ? <span className="block text-[11px] text-muted-foreground">{sum.label}</span> : null}
        </span>
        {m.attendees.length ? <AvatarStack people={m.attendees.map((a) => a.profile).filter(Boolean)} max={3} /> : null}
      </Link>
    </li>
  );
}

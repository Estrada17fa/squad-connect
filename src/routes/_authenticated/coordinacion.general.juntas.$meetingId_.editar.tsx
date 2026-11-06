import { createFileRoute, Link } from "@tanstack/react-router";
import { ChevronLeft } from "lucide-react";
import { useApp } from "@/components/squad/AppLayout";
import { useMeetings } from "@/hooks/useCoordinacion";
import { useTaskAccess } from "@/components/coord/tareas/useTaskAccess";
import { MeetingForm } from "@/components/coord/juntas/MeetingForm";

export const Route = createFileRoute("/_authenticated/coordinacion/general/juntas/$meetingId_/editar")({
  head: () => ({
    meta: [
      { title: "Editar junta — Coordinación Squad" },
      { name: "description", content: "Edita fecha, lugar, invitados y orden del día de la junta." },
      { property: "og:title", content: "Editar junta — Coordinación Squad" },
      { property: "og:description", content: "Edita los datos de la junta." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: EditarJunta,
});

function EditarJunta() {
  const { meetingId } = Route.useParams();
  const { profile } = useApp();
  const q = useMeetings(profile?.club_id);
  const { userId, categories, canEdit } = useTaskAccess();
  const m = (q.data ?? []).find((x) => x.id === meetingId) ?? null;
  return (
    <div className="coord-enter mx-auto max-w-2xl space-y-3">
      <Link to="/coordinacion/general/juntas/$meetingId" params={{ meetingId }} className="coord-press -ml-2 inline-flex min-h-11 items-center gap-0.5 rounded-xl px-2 text-sm font-semibold">
        <ChevronLeft className="h-5 w-5" /> Junta
      </Link>
      <h1 className="font-display text-2xl font-bold">Editar junta</h1>
      {q.isLoading ? <p className="py-10 text-center text-sm text-muted-foreground">Cargando…</p>
        : !m || !profile?.club_id || !canEdit(m) ? <p className="py-10 text-center text-sm text-muted-foreground">No puedes editar esta junta.</p>
        : <MeetingForm clubId={profile.club_id} userId={userId} meeting={m}
            categories={categories.some((c) => c.id === m.team_id) ? categories : [{ id: m.team_id, name: m.team?.name ?? "Todo el club" }, ...categories]} />}
    </div>
  );
}

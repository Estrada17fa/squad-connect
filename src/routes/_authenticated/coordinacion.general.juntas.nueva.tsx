import { createFileRoute, Link } from "@tanstack/react-router";
import { ChevronLeft } from "lucide-react";
import { useApp } from "@/components/squad/AppLayout";
import { useTaskAccess } from "@/components/coord/tareas/useTaskAccess";
import { MeetingForm } from "@/components/coord/juntas/MeetingForm";

export const Route = createFileRoute("/_authenticated/coordinacion/general/juntas/nueva")({
  head: () => ({
    meta: [
      { title: "Nueva junta — Coordinación Squad" },
      { name: "description", content: "Crea una junta con invitados, lugar y orden del día." },
      { property: "og:title", content: "Nueva junta — Coordinación Squad" },
      { property: "og:description", content: "Crea una junta con invitados, lugar y orden del día." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: NuevaJunta,
});

function NuevaJunta() {
  const { profile } = useApp();
  const { userId, categories } = useTaskAccess();
  return (
    <div className="coord-enter mx-auto max-w-2xl space-y-3">
      <header className="flex items-center gap-2">
        <Link to="/coordinacion/general/tareas" search={{ tab: "juntas" }} className="coord-press -ml-2 inline-flex min-h-11 items-center gap-0.5 rounded-xl px-2 text-sm font-semibold">
          <ChevronLeft className="h-5 w-5" /> Juntas
        </Link>
      </header>
      <h1 className="font-display text-2xl font-bold">Nueva junta</h1>
      {!profile?.club_id ? null : categories.length === 0 ? (
        <p className="py-10 text-center text-sm text-muted-foreground">No tienes permiso para crear juntas.</p>
      ) : (
        <MeetingForm clubId={profile.club_id} userId={userId} categories={categories} />
      )}
    </div>
  );
}

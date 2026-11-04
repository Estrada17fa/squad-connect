import { createFileRoute, Link, Navigate } from "@tanstack/react-router";
import { ChevronLeft, Hammer } from "lucide-react";
import { CoordEmptyState } from "@/components/coord/EmptyState";
import { COORD_AREAS } from "@/lib/coordAreas";
import { ADMIN_MODULES } from "@/lib/admin/mockData";

export const Route = createFileRoute("/_authenticated/administracion/$module")({
  head: ({ params }) => {
    const m = ADMIN_MODULES.find((x) => x.key === params.module);
    const title = `${m?.name ?? "Administración"} — Squad`;
    const description = m ? `${m.line} del club.` : "Administración del club.";
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:type", content: "website" },
        { name: "twitter:card", content: "summary" },
      ],
    };
  },
  component: AdminModulePage,
});

function AdminModulePage() {
  const { module } = Route.useParams();
  const m = ADMIN_MODULES.find((x) => x.key === module);
  if (!m) return <Navigate to="/administracion" replace />;
  const I = m.icon;
  return (
    <div className="-mt-2 space-y-6">
      <header className="flex items-center gap-1">
        <Link to="/administracion" aria-label="Regresar" className="coord-press -ml-2 flex h-10 w-10 items-center justify-center rounded-xl">
          <ChevronLeft className="h-5 w-5" />
        </Link>
        <I className="h-5 w-5 text-primary" />
        <h1 className="ml-1.5 font-display text-[20px] font-bold">{m.name}</h1>
      </header>
      <CoordEmptyState icon={Hammer} text="En construcción" area={COORD_AREAS[0]} />
      <div className="pt-8 text-center text-xs text-muted-foreground">
        <a href={m.legacy} className="underline-offset-2 hover:underline">Ver versión actual</a>
      </div>
    </div>
  );
}

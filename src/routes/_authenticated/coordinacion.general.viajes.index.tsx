import * as React from "react";
import { createFileRoute, Link, Navigate } from "@tanstack/react-router";
import { ChevronLeft, Plane, Plus, Search, X } from "lucide-react";
import { useApp } from "@/components/squad/AppLayout";
import { Segmented } from "@/components/coord/tareas/parts";
import { CoordEmptyState } from "@/components/coord/EmptyState";
import { TripHeroCard, TripListRow } from "@/components/coord/viajes/parts";
import { useClubTrips, useTripLogistics, useTripsAccess } from "@/components/coord/viajes/useTripsModule";
import type { TripRow } from "@/hooks/useTrips";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/coordinacion/general/viajes/")({
  head: () => ({
    meta: [
      { title: "Viajes — Coordinación Squad" },
      { name: "description", content: "Viajes del equipo: próximos y pasados, con la preparación de cada uno." },
      { property: "og:title", content: "Viajes — Coordinación Squad" },
      { property: "og:description", content: "Viajes del equipo con su preparación: vuelos, pases, hotel y transporte." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ViajesListPage,
});

function ViajesListPage() {
  const { teamOptions } = useApp();
  const { canManage, canCreate } = useTripsAccess();
  const { tripsQ, upcoming, past, matchFor } = useClubTrips(canManage);
  const [when, setWhen] = React.useState<"proximos" | "pasados">("proximos");
  const [search, setSearch] = React.useState<string | null>(null);
  const teamName = React.useMemo(() => new Map(teamOptions.map((t) => [t.id, t.name] as const)), [teamOptions]);

  if (!canManage) return <Navigate to="/agenda-viajes" search={{ open: undefined }} replace />;

  const term = (search ?? "").trim().toLowerCase();
  const filter = (list: TripRow[]) => (term ? list.filter((t) => `${t.title} ${t.destination ?? ""}`.toLowerCase().includes(term)) : list);
  const next = upcoming[0] ?? null;
  const list = filter(when === "proximos" ? upcoming : past);

  return (
    <div className="coord-enter mx-auto max-w-4xl space-y-4 pb-24">
      <header className="sticky top-0 z-20 -mx-4 space-y-1 bg-background/90 px-4 pb-2 pt-1 backdrop-blur">
        <div className="flex items-center justify-between">
          <Link to="/coordinacion/$area" params={{ area: "general" }} className="coord-press -ml-2 inline-flex min-h-11 items-center gap-0.5 rounded-xl px-2 text-sm font-semibold">
            <ChevronLeft className="h-5 w-5" /> General
          </Link>
          <div className="flex gap-1">
            <button aria-label="Buscar" onClick={() => setSearch(search === null ? "" : null)} className={cn("coord-press flex h-10 w-10 items-center justify-center rounded-xl", search !== null && "bg-muted")}>
              <Search className="h-5 w-5" />
            </button>
            {canCreate ? (
              <Link to="/coordinacion/general/viajes/nuevo" aria-label="Nuevo viaje" className="coord-press flex h-10 w-10 items-center justify-center rounded-xl">
                <Plus className="h-5 w-5" />
              </Link>
            ) : null}
          </div>
        </div>
        <h1 className="flex items-center gap-3 text-xl font-bold"><Plane className="h-5 w-5 text-area-general" />Viajes</h1>
        {search !== null ? (
          <div className="coord-enter flex items-center gap-2 rounded-xl bg-muted px-3">
            <Search className="h-4 w-4 text-muted-foreground" />
            <input autoFocus value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar viaje o destino…" className="min-h-11 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground" />
            <button aria-label="Cerrar" onClick={() => setSearch(null)} className="p-2 text-muted-foreground"><X className="h-4 w-4" /></button>
          </div>
        ) : null}
      </header>

      {next && !term ? <NextTripHero trip={next} match={matchFor(next)} /> : null}

      <Segmented value={when} onChange={(v) => setWhen(v as typeof when)} options={[{ value: "proximos", label: `Próximos · ${upcoming.length}` }, { value: "pasados", label: `Pasados · ${past.length}` }]} />

      {tripsQ.isLoading ? (
        <div className="space-y-2">{[0, 1, 2].map((i) => <div key={i} className="h-16 animate-pulse rounded-2xl bg-card" />)}</div>
      ) : list.length === 0 ? (
        <CoordEmptyState icon={Plane} title={when === "proximos" ? "Sin viajes próximos" : "Sin viajes pasados"} message={canCreate && when === "proximos" ? "Organiza el próximo viaje del equipo." : "Nada por aquí."} />
      ) : (
        <div className="divide-y divide-border/50 overflow-hidden rounded-2xl bg-card">
          {list.map((t) => <TripListRow key={t.id} trip={t} match={matchFor(t)} teamName={teamName.get(t.team_id)} />)}
        </div>
      )}
    </div>
  );
}

function NextTripHero({ trip, match }: { trip: TripRow; match: ReturnType<ReturnType<typeof useClubTrips>["matchFor"]> }) {
  const { readiness } = useTripLogistics(trip);
  return <TripHeroCard trip={trip} match={match} readiness={readiness} />;
}

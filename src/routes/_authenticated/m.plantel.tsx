import * as React from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Plus, Users } from "lucide-react";
import { PageHeader } from "@/components/squad/PageHeader";
import { EmptyState } from "@/components/squad/EmptyState";
import { LoadingState } from "@/components/squad/LoadingState";
import { StatusBadge, type StatusVariant } from "@/components/squad/StatusBadge";
import { SearchInput, FilterChips } from "@/components/squad/SearchInput";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useApp } from "@/components/squad/AppLayout";
import { usePlayers, type AvailabilityStatus, type PlayerRow } from "@/hooks/usePlayers";
import { PlayerFormDialog } from "@/components/plantel/PlayerFormDialog";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/m/plantel")({
  head: () => ({
    meta: [
      { title: "Squad — Plantel" },
      { name: "description", content: "Roster del equipo activo, con disponibilidad y filtros." },
    ],
  }),
  component: PlantelPage,
});

export const AVAILABILITY_META: Record<
  AvailabilityStatus,
  { label: string; variant: StatusVariant }
> = {
  apto: { label: "Apto", variant: "info" },
  lesionado: { label: "Lesionado", variant: "rejected" },
  en_duda: { label: "En duda", variant: "pending" },
};

function PlantelPage() {
  const navigate = useNavigate();
  const { activeTeam, permissions, user, isSuperAdmin } = useApp();
  const canEdit = isSuperAdmin || permissions.plantel === "editor" || permissions.plantel === "approver";

  const { data: players, isLoading } = usePlayers(activeTeam?.id ?? null);
  const [clubId, setClubId] = React.useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [posFilter, setPosFilter] = React.useState<string>("all");
  const [availFilter, setAvailFilter] = React.useState<string>("all");
  const [search, setSearch] = React.useState("");

  React.useEffect(() => {
    if (!activeTeam?.id) return;
    supabase.from("teams").select("club_id").eq("id", activeTeam.id).maybeSingle()
      .then(({ data }) => setClubId(data?.club_id ?? null));
  }, [activeTeam?.id]);

  const positions = React.useMemo(() => {
    const s = new Set<string>();
    (players ?? []).forEach((p) => p.position && s.add(p.position));
    return [...s].sort();
  }, [players]);

  const filtered = (players ?? []).filter((p) => {
    if (posFilter !== "all" && p.position !== posFilter) return false;
    if (availFilter !== "all" && p.availability_status !== availFilter) return false;
    if (search && !(p.profile?.full_name ?? "").toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  if (!activeTeam) {
    return <EmptyState title="Sin equipo activo" message="Selecciona un equipo desde el encabezado." />;
  }

  const availOptions = [
    { value: "all", label: "Todos" },
    { value: "apto", label: "Apto" },
    { value: "en_duda", label: "En duda" },
    { value: "lesionado", label: "Lesionado" },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Plantel"
        subtitle={activeTeam.name}
        action={
          canEdit ? (
            <Button onClick={() => setDialogOpen(true)} className="glow-primary rounded-full">
              <Plus className="mr-2 h-4 w-4" /> Agregar jugador
            </Button>
          ) : null
        }
      />

      <div className="glass flex flex-col gap-3 p-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="flex-1">
            <SearchInput
              placeholder="Buscar jugador…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Select value={posFilter} onValueChange={setPosFilter}>
            <SelectTrigger className="input-search h-10 w-full border-none px-4 sm:w-48">
              <SelectValue placeholder="Posición" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas las posiciones</SelectItem>
              {positions.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <FilterChips value={availFilter} onChange={setAvailFilter} options={availOptions} />
      </div>

      {isLoading ? (
        <LoadingState />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={Users}
          title={players?.length ? "Sin resultados" : "Plantel vacío"}
          message={
            players?.length
              ? "Ajusta los filtros para ver más jugadores."
              : canEdit
                ? "Agrega el primer jugador del equipo para empezar."
                : "Aún no hay jugadores registrados."
          }
          action={
            !players?.length && canEdit ? (
              <Button onClick={() => setDialogOpen(true)} className="glow-primary rounded-full">
                <Plus className="mr-2 h-4 w-4" /> Agregar jugador
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((p: PlayerRow, i) => {
            const meta = AVAILABILITY_META[p.availability_status];
            const isSelf = p.user_id === user.id;
            const showBadge = canEdit || isSelf;
            return (
              <button
                type="button"
                key={p.id}
                onClick={() => navigate({ to: "/m/plantel/$playerId", params: { playerId: p.id } })}
                className={cn(
                  "glass card-hover animate-card-in flex items-center gap-3 p-4 text-left",
                  "hover:-translate-y-0.5 hover:[background:linear-gradient(hsl(0_0%_100%/0.055),hsl(0_0%_100%/0.055))_padding-box,linear-gradient(180deg,hsl(150_100%_50%/0.45),hsl(150_100%_50%/0.06))_border-box]",
                )}
                style={{ animationDelay: `${i * 30}ms` }}
              >
                <Avatar className="h-12 w-12 shrink-0 ring-1 ring-white/10">
                  <AvatarImage src={p.profile?.avatar_url ?? undefined} />
                  <AvatarFallback>{(p.profile?.full_name ?? "?").slice(0, 1).toUpperCase()}</AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    {p.jersey_number != null ? (
                      <span className="font-display text-lg font-bold text-primary">#{p.jersey_number}</span>
                    ) : null}
                    <span className="truncate font-display font-semibold text-foreground">
                      {p.profile?.full_name ?? "—"}
                    </span>
                  </div>
                  <div className="mt-0.5 text-xs text-muted-foreground">
                    {p.position ?? "Sin posición"}
                  </div>
                  {showBadge ? (
                    <div className="mt-2"><StatusBadge variant={meta.variant}>{meta.label}</StatusBadge></div>
                  ) : null}
                </div>
              </button>
            );
          })}
        </div>
      )}

      {clubId && activeTeam?.id ? (
        <PlayerFormDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          clubId={clubId}
          teamId={activeTeam.id}
        />
      ) : null}
    </div>
  );
}

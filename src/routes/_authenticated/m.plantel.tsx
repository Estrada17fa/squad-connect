import * as React from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Plus, Users } from "lucide-react";
import { PageHeader } from "@/components/squad/PageHeader";
import { EmptyState } from "@/components/squad/EmptyState";
import { LoadingState } from "@/components/squad/LoadingState";
import { StatusBadge, type StatusVariant } from "@/components/squad/StatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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

  return (
    <div className="space-y-6">
      <PageHeader
        title="Plantel"
        subtitle={activeTeam.name}
        action={
          canEdit ? (
            <Button onClick={() => setDialogOpen(true)} className="glow-primary">
              <Plus className="mr-2 h-4 w-4" /> Agregar jugador
            </Button>
          ) : null
        }
      />

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        <Input placeholder="Buscar jugador…" value={search} onChange={(e) => setSearch(e.target.value)} />
        <Select value={posFilter} onValueChange={setPosFilter}>
          <SelectTrigger><SelectValue placeholder="Posición" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas las posiciones</SelectItem>
            {positions.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={availFilter} onValueChange={setAvailFilter}>
          <SelectTrigger><SelectValue placeholder="Disponibilidad" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toda disponibilidad</SelectItem>
            <SelectItem value="apto">Apto</SelectItem>
            <SelectItem value="lesionado">Lesionado</SelectItem>
            <SelectItem value="en_duda">En duda</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <LoadingState />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={Users}
          title={players?.length ? "Sin resultados" : "Plantel vacío"}
          message={players?.length ? "Ajusta los filtros para ver más jugadores." : canEdit ? "Agrega el primer jugador del equipo." : "Aún no hay jugadores registrados."}
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
                  "glass animate-card-in flex items-center gap-3 p-4 text-left transition-all hover:border-white/15 hover:bg-white/[0.06] active:scale-[0.99]",
                )}
                style={{ animationDelay: `${i * 25}ms` }}
              >
                <Avatar className="h-12 w-12 shrink-0">
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

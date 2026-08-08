import * as React from "react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { LoadingState } from "@/components/squad/LoadingState";
import { useClub, useUpdateClub } from "@/hooks/useClubSettings";

/** Configuración de torneo/liga: nombre de la liga y temporada actual. */
export function ClubLeagueTab({ clubId, canEdit }: { clubId: string; canEdit: boolean }) {
  const clubQ = useClub(clubId);
  const update = useUpdateClub();
  const [league, setLeague] = React.useState("");
  const [season, setSeason] = React.useState("");

  React.useEffect(() => {
    if (!clubQ.data) return;
    setLeague(clubQ.data.league_name ?? "");
    setSeason(clubQ.data.current_season ?? "");
  }, [clubQ.data]);

  async function save() {
    try {
      await update.mutateAsync({
        id: clubId,
        league_name: league.trim() || null,
        current_season: season.trim() || null,
      });
      toast.success("Configuración de liga actualizada");
    } catch (e: any) {
      toast.error(e.message ?? "No se pudo guardar");
    }
  }

  if (clubQ.isLoading) return <LoadingState />;

  return (
    <div className="glass space-y-4 p-4">
      <div className="space-y-1.5">
        <Label htmlFor="club-league">Nombre de la liga</Label>
        <Input
          id="club-league"
          value={league}
          onChange={(e) => setLeague(e.target.value)}
          placeholder="p.ej. Liga Premier"
          disabled={!canEdit}
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="club-season">Temporada actual</Label>
        <Input
          id="club-season"
          value={season}
          onChange={(e) => setSeason(e.target.value)}
          placeholder="p.ej. 2026 Apertura"
          disabled={!canEdit}
        />
      </div>
      <p className="text-xs text-muted-foreground">
        Aquí solo se configuran los datos de la competencia. La tabla de posiciones y los partidos son
        parte del módulo de Torneo.
      </p>
      {canEdit ? (
        <Button onClick={save} disabled={update.isPending} className="w-full glow-primary">
          Guardar configuración
        </Button>
      ) : null}
    </div>
  );
}

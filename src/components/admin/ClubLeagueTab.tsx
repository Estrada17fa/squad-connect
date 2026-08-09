import * as React from "react";
import { toast } from "sonner";
import { Trophy } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LoadingState } from "@/components/squad/LoadingState";
import { DetailField, DetailGrid, DetailValue } from "@/components/squad/DetailSheet";
import { SettingsPanel } from "@/components/admin/SettingsPanel";
import { useClub, useUpdateClub } from "@/hooks/useClubSettings";

/** Configuración de torneo/liga: nombre de la liga y temporada actual. */
export function ClubLeagueTab({ clubId, canEdit }: { clubId: string; canEdit: boolean }) {
  const clubQ = useClub(clubId);
  const update = useUpdateClub();
  const [league, setLeague] = React.useState("");
  const [season, setSeason] = React.useState("");

  const reset = React.useCallback(() => {
    setLeague(clubQ.data?.league_name ?? "");
    setSeason(clubQ.data?.current_season ?? "");
  }, [clubQ.data]);

  React.useEffect(() => {
    reset();
  }, [reset]);

  async function save() {
    try {
      await update.mutateAsync({
        id: clubId,
        league_name: league.trim() || null,
        current_season: season.trim() || null,
      });
      toast.success("Configuración de liga actualizada");
      return true;
    } catch (e: any) {
      toast.error(e.message ?? "No se pudo guardar");
      return false;
    }
  }

  if (clubQ.isLoading) return <LoadingState />;

  return (
    <SettingsPanel
      title="Torneo / Liga"
      description="Datos de la competencia en la que participa el club."
      icon={Trophy}
      canEdit={canEdit}
      saving={update.isPending}
      onSave={save}
      onCancel={reset}
      read={
        <DetailGrid>
          <DetailField label="Liga">
            <DetailValue value={clubQ.data?.league_name ?? ""} />
          </DetailField>
          <DetailField label="Temporada actual">
            <DetailValue value={clubQ.data?.current_season ?? ""} />
          </DetailField>
        </DetailGrid>
      }
      edit={
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="club-league">Nombre de la liga</Label>
            <Input
              id="club-league"
              value={league}
              onChange={(e) => setLeague(e.target.value)}
              placeholder="p.ej. Liga Premier"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="club-season">Temporada actual</Label>
            <Input
              id="club-season"
              value={season}
              onChange={(e) => setSeason(e.target.value)}
              placeholder="p.ej. 2026 Apertura"
            />
          </div>
          <p className="text-xs text-muted-foreground">
            La tabla de posiciones y los partidos son parte del módulo de Torneo.
          </p>
        </div>
      }
    />
  );
}

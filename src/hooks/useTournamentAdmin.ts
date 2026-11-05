import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { CREST_BUCKET } from "@/hooks/useTournaments";
import { getClubLogoSignedUrl } from "@/hooks/useClubSettings";

const db = supabase as any;

/** Partidos jugados por torneo del club (para calcular "Próximo"). */
export function usePlayedMatchCounts(clubId: string | null | undefined) {
  return useQuery({
    queryKey: ["tournament-played-counts", clubId ?? "none"],
    enabled: !!clubId,
    queryFn: async (): Promise<Record<string, number>> => {
      const { data, error } = await db
        .from("tournament_matches")
        .select("tournament_id")
        .eq("club_id", clubId)
        .eq("status", "jugado");
      if (error) throw error;
      const out: Record<string, number> = {};
      for (const r of data ?? []) out[r.tournament_id] = (out[r.tournament_id] ?? 0) + 1;
      return out;
    },
  });
}

/** Sube un archivo al almacenamiento de escudos y devuelve su ruta. */
export async function uploadCrestFile(clubId: string, file: Blob, sub: "torneos" | "" = "", ext?: string) {
  const e = ext ?? ((file as File).name?.split(".").pop() || "png");
  const path = `${clubId}/${sub ? sub + "/" : ""}${crypto.randomUUID()}.${e}`;
  const { error } = await supabase.storage.from(CREST_BUCKET).upload(path, file);
  if (error) throw error;
  return path;
}

/** Copia el logo del club como escudo de "Nuestro equipo". Devuelve null si no hay logo. */
export async function copyClubLogoAsCrest(clubId: string, logoPath: string | null | undefined) {
  if (!logoPath) return null;
  try {
    const url = /^https?:\/\//.test(logoPath) ? logoPath : await getClubLogoSignedUrl(logoPath);
    if (!url) return null;
    const res = await fetch(url);
    if (!res.ok) return null;
    const blob = await res.blob();
    const ext = (blob.type.split("/")[1] || "png").replace("svg+xml", "svg").replace("jpeg", "jpg");
    return await uploadCrestFile(clubId, blob, "", ext);
  } catch {
    return null;
  }
}

import type { TournamentInput, TournamentRow } from "@/hooks/useTournaments";
/** Arma la entrada de guardado a partir de la fila actual, con cambios encima. */
export function tournamentInputFrom(t: TournamentRow, patch: Partial<TournamentInput> = {}): TournamentInput {
  return {
    id: t.id, club_id: t.club_id, team_id: t.team_id, name: t.name, season: t.season, type: t.type, status: t.status,
    notes: t.notes, logo_path: t.logo_path, created_by: "",
    format: t.format, groups_count: t.groups_count, has_playoffs: t.has_playoffs, playoff_start_round: t.playoff_start_round, playoff_two_legs: t.playoff_two_legs,
    points_win: t.points_win, points_draw: t.points_draw, points_loss: t.points_loss,
    away_bonus_enabled: t.away_bonus_enabled, away_bonus_min_diff: t.away_bonus_min_diff, away_bonus_points: t.away_bonus_points,
    shootout_enabled: t.shootout_enabled, shootout_min_goals: t.shootout_min_goals, shootout_winner_points: t.shootout_winner_points,
    tiebreakers: t.tiebreakers,
    ...patch,
  };
}

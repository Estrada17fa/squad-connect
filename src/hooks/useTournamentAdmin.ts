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

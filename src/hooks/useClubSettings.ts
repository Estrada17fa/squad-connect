import * as React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useApp } from "@/components/squad/AppLayout";
import { setClubDatePrefs } from "@/lib/calendar-utils";

export interface ClubRow {
  id: string;
  name: string;
  logo_url: string | null;
  primary_color: string | null;
  secondary_color: string | null;
  league_name: string | null;
  current_season: string | null;
  timezone: string | null;
  currency: string | null;
  date_format: string | null;
}

const db = supabase as any;

export const DEFAULT_CURRENCY = "MXN";
export const DEFAULT_TIMEZONE = "America/Mazatlan";
export const DEFAULT_DATE_FORMAT = "dd/MM/yyyy";

export const CURRENCIES = [
  { value: "MXN", label: "Peso mexicano (MXN)" },
  { value: "USD", label: "Dólar estadounidense (USD)" },
  { value: "EUR", label: "Euro (EUR)" },
  { value: "COP", label: "Peso colombiano (COP)" },
  { value: "ARS", label: "Peso argentino (ARS)" },
  { value: "CLP", label: "Peso chileno (CLP)" },
  { value: "BRL", label: "Real brasileño (BRL)" },
];

export const TIMEZONES = [
  "America/Mazatlan",
  "America/Mexico_City",
  "America/Tijuana",
  "America/Monterrey",
  "America/Bogota",
  "America/Lima",
  "America/Santiago",
  "America/Argentina/Buenos_Aires",
  "America/Sao_Paulo",
  "America/New_York",
  "America/Los_Angeles",
  "Europe/Madrid",
];

export const DATE_FORMATS = [
  { value: "dd/MM/yyyy", label: "31/12/2026 (día/mes/año)" },
  { value: "MM/dd/yyyy", label: "12/31/2026 (mes/día/año)" },
  { value: "yyyy-MM-dd", label: "2026-12-31 (año-mes-día)" },
];

/** Datos completos del club (identidad, liga y preferencias). */
export function useClub(clubId: string | null | undefined) {
  return useQuery({
    queryKey: ["club", clubId ?? "none"],
    enabled: !!clubId,
    staleTime: 60_000,
    queryFn: async (): Promise<ClubRow | null> => {
      const { data, error } = await db.from("clubs").select("*").eq("id", clubId!).maybeSingle();
      if (error) throw error;
      return (data ?? null) as ClubRow | null;
    },
  });
}

export function useUpdateClub() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...patch }: Partial<ClubRow> & { id: string }): Promise<ClubRow> => {
      const { data, error } = await db.from("clubs").update(patch).eq("id", id).select("*").single();
      if (error) throw error;
      return data as ClubRow;
    },
    onSuccess: (row) => {
      qc.invalidateQueries({ queryKey: ["club", row.id] });
      qc.invalidateQueries({ queryKey: ["clubs"] });
    },
  });
}

/** Sube el logo del club al bucket privado y devuelve la ruta guardada. */
export async function uploadClubLogo(clubId: string, file: File): Promise<string> {
  const ext = (file.name.split(".").pop() || "png").toLowerCase();
  const path = `${clubId}/logo-${Date.now()}.${ext}`;
  const { error } = await supabase.storage.from("club-logos").upload(path, file, { upsert: true });
  if (error) throw error;
  return path;
}

/** URL firmada temporal para mostrar el logo (bucket privado). */
export async function getClubLogoSignedUrl(path: string, expiresInSec = 3600): Promise<string> {
  const { data, error } = await supabase.storage.from("club-logos").createSignedUrl(path, expiresInSec);
  if (error) throw error;
  return data.signedUrl;
}

export function useClubLogoUrl(logoPath: string | null | undefined) {
  return useQuery({
    queryKey: ["club-logo", logoPath ?? "none"],
    enabled: !!logoPath,
    staleTime: 30 * 60_000,
    queryFn: async () => {
      if (!logoPath) return null;
      if (/^https?:\/\//.test(logoPath)) return logoPath;
      return getClubLogoSignedUrl(logoPath);
    },
  });
}

/** Preferencias del club listas para usar en la interfaz (con valores por defecto). */
export function useClubPrefs() {
  const { profile } = useApp();
  const clubQ = useClub(profile?.club_id ?? null);
  const currency = clubQ.data?.currency || DEFAULT_CURRENCY;
  const timezone = clubQ.data?.timezone || DEFAULT_TIMEZONE;
  const dateFormat = clubQ.data?.date_format || DEFAULT_DATE_FORMAT;

  React.useEffect(() => {
    setClubDatePrefs({ timezone, dateFormat });
  }, [timezone, dateFormat]);

  return { currency, timezone, dateFormat, club: clubQ.data ?? null, isLoading: clubQ.isLoading };
}

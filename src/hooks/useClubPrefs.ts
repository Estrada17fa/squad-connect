import { useApp } from "@/components/squad/AppLayout";
import { useClubPrefsFor } from "@/hooks/useClubSettings";

/**
 * Preferencias del club del usuario actual. Vive aparte de `useClubSettings`
 * para que ese módulo no importe `AppLayout` (evita el ciclo de importación que
 * duplicaba el contexto y rompía `useApp`).
 */
export function useClubPrefs() {
  const { profile } = useApp();
  return useClubPrefsFor(profile?.club_id ?? null);
}

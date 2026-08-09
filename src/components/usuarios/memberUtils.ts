import type { StatusVariant } from "@/components/squad/StatusBadge";
import { inferBaseRole, type BaseRole } from "@/lib/rolePages";

export interface MemberProfile {
  id: string;
  full_name: string | null;
  first_name: string | null;
  paternal_last_name: string | null;
  maternal_last_name: string | null;
  name_completed: boolean | null;
  email: string | null;
  phone?: string | null;
  avatar_url: string | null;
  status?: "activo" | "baja" | null;
  created_at?: string | null;
}

export interface MembershipLite {
  id: string;
  user_id: string;
  team_id: string | null;
  role_id: string;
  job_title: string | null;
  roleName: string | null;
  teamName: string | null;
}

export function displayName(
  p: Pick<MemberProfile, "first_name" | "paternal_last_name" | "maternal_last_name" | "full_name" | "email">,
) {
  const composed = [p.first_name, p.paternal_last_name, p.maternal_last_name]
    .map((s) => (s ?? "").trim())
    .filter(Boolean)
    .join(" ");
  return composed || p.full_name || p.email || "Sin nombre";
}

export function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join("");
}

/** Color del badge de rol según el rol base, para reconocerlo de un vistazo. */
export function roleVariant(roleName: string | null | undefined): StatusVariant {
  const base: BaseRole | null = inferBaseRole(roleName ?? null);
  switch (base) {
    case "admin":
      return "rejected";
    case "tecnico":
      return "approved";
    case "medico":
      return "info";
    case "jugador":
      return "pending";
    default:
      return "info";
  }
}

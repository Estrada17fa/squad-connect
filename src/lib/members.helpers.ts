import type { PlayerInput } from "./members.schemas";

export const norm = <T,>(v: T | null | undefined): T | null =>
  v === undefined || v === null || (typeof v === "string" && v.trim() === "") ? null : v;

export interface MemberCtx {
  supabase: any;
  userId: string;
}

/** Verifica que el llamador sea super admin o editor del módulo 'usuarios'. Devuelve club_id. */
export async function authorizeMemberAdmin({ supabase, userId }: MemberCtx): Promise<string> {
  const { data: caller, error: callerErr } = await supabase
    .from("profiles")
    .select("club_id")
    .eq("id", userId)
    .maybeSingle();
  if (callerErr) throw new Error("No se pudo verificar tu perfil");
  if (!caller?.club_id) throw new Error("Tu perfil no está asociado a un club");

  const { data: isSuper } = await supabase
    .from("super_admins")
    .select("user_id")
    .eq("user_id", userId)
    .maybeSingle();
  if (isSuper) return caller.club_id as string;

  const { data: isEditor } = await supabase.rpc("has_module_editor_any", {
    _user_id: userId,
    _module_key: "usuarios",
  });
  if (!isEditor) throw new Error("No tienes permisos para gestionar miembros");
  return caller.club_id as string;
}

export interface RoleLite {
  id: string;
  name: string;
  base_role: string | null;
}

export async function loadClubRole(supabase: any, roleId: string, clubId: string): Promise<RoleLite> {
  const { data: role } = await supabase
    .from("roles")
    .select("id, club_id, name, base_role")
    .eq("id", roleId)
    .maybeSingle();
  if (!role || role.club_id !== clubId) throw new Error("Rol inválido para este club");
  return role as RoleLite;
}

export function isPlayerRole(role: { name: string; base_role: string | null }) {
  return (role.base_role ?? role.name ?? "").toLowerCase() === "jugador";
}

export async function validateClubTeams(supabase: any, teamIds: string[], clubId: string) {
  if (!teamIds.length) return;
  const { data: teams } = await supabase.from("teams").select("id, club_id").in("id", teamIds);
  for (const tid of teamIds) {
    const t = (teams ?? []).find((x: any) => x.id === tid);
    if (!t || t.club_id !== clubId) throw new Error("Categoría inválida para este club");
  }
}

export function playerRowFor(userId: string, teamId: string, p: PlayerInput | null | undefined) {
  return {
    user_id: userId,
    team_id: teamId,
    jersey_number: norm(p?.jersey_number),
    position: norm(p?.position),
    secondary_position: norm(p?.secondary_position),
    preferred_foot: norm(p?.preferred_foot),
    height_cm: norm(p?.height_cm),
    weight_kg: norm(p?.weight_kg),
    nationality: norm(p?.nationality),
    birthplace: norm(p?.birthplace),
    affiliation_number: norm(p?.affiliation_number),
    id_document: norm(p?.id_document),
    joined_at: norm(p?.joined_at),
    previous_club: norm(p?.previous_club),
    player_status: p?.player_status ?? "activo",
    shirt_size: norm(p?.shirt_size),
    pants_size: norm(p?.pants_size),
    shoe_size: norm(p?.shoe_size),
    archived_at: null,
  };
}

export function fullNameOf(first: string, paternal: string, maternal?: string | null) {
  return [first, paternal, maternal ?? ""]
    .map((s) => (s ?? "").trim())
    .filter(Boolean)
    .join(" ");
}

/** Sincroniza membresías + filas de jugador (archivando lo que deja de aplicar). */
export async function syncMemberships(
  admin: any,
  userId: string,
  role: RoleLite,
  assignments: { team_id: string; job_title?: string | null }[],
  player: PlayerInput | null | undefined,
) {
  await admin.from("team_memberships").delete().eq("user_id", userId);

  const rows = assignments.length
    ? assignments.map((a) => ({
        user_id: userId,
        role_id: role.id,
        team_id: a.team_id,
        job_title: a.job_title ? a.job_title : null,
      }))
    : [{ user_id: userId, role_id: role.id, team_id: null, job_title: null }];

  const { error: memErr } = await admin.from("team_memberships").insert(rows);
  if (memErr) throw new Error("No se pudieron asignar las categorías");

  const teamIds = assignments.map((a) => a.team_id);
  const { data: existing } = await admin
    .from("player_profiles")
    .select("id, team_id")
    .eq("user_id", userId);

  if (!isPlayerRole(role)) {
    if ((existing ?? []).length) {
      await admin
        .from("player_profiles")
        .update({ archived_at: new Date().toISOString() })
        .eq("user_id", userId)
        .is("archived_at", null);
    }
    return;
  }

  const byTeam = new Map<string, string>((existing ?? []).map((r: any) => [r.team_id, r.id]));
  for (const tid of teamIds) {
    const row = playerRowFor(userId, tid, player);
    const id = byTeam.get(tid);
    if (id) await admin.from("player_profiles").update(row).eq("id", id);
    else await admin.from("player_profiles").insert(row);
  }
  const stale = (existing ?? []).filter((r: any) => !teamIds.includes(r.team_id));
  for (const r of stale) {
    await admin.from("player_profiles").update({ archived_at: new Date().toISOString() }).eq("id", r.id);
  }
}

/** Impide dejar al club sin administrador activo. */
export async function assertNotLastAdmin(supabase: any, clubId: string, userId: string) {
  const { data: rows } = await supabase
    .from("team_memberships")
    .select("user_id, role:roles!inner(base_role, name, club_id), profile:profiles!inner(status, club_id)")
    .eq("role.club_id", clubId);
  const admins = new Set<string>();
  for (const r of (rows ?? []) as any[]) {
    const base = (r.role?.base_role ?? r.role?.name ?? "").toLowerCase();
    if (base === "admin" && r.profile?.status !== "baja") admins.add(r.user_id);
  }
  if (admins.has(userId) && admins.size <= 1) {
    throw new Error("No puedes dar de baja al último administrador del club");
  }
}

/** Tablas donde una referencia impide el borrado duro. */
export const LINKED_TABLES: { table: string; column: string; label: string }[] = [
  { table: "requests", column: "requester_id", label: "solicitudes" },
  { table: "inventory_loans", column: "borrower_user_id", label: "préstamos" },
  { table: "expenses", column: "created_by", label: "gastos" },
  { table: "tasks", column: "created_by", label: "tareas" },
  { table: "task_assignees", column: "user_id", label: "tareas asignadas" },
  { table: "meeting_attendees", column: "user_id", label: "juntas" },
  { table: "event_attendees", column: "user_id", label: "eventos" },
  { table: "documents", column: "uploaded_by", label: "documentos" },
  { table: "injuries", column: "player_user_id", label: "lesiones" },
  { table: "medical_checkups", column: "player_user_id", label: "revisiones médicas" },
  { table: "development_feedback", column: "player_user_id", label: "feedback" },
  { table: "development_goals", column: "player_user_id", label: "objetivos" },
  { table: "development_assessments", column: "player_user_id", label: "evaluaciones" },
  { table: "trip_travelers", column: "user_id", label: "viajes" },
];

export async function linkedDataLabels(admin: any, userId: string): Promise<string[]> {
  const labels: string[] = [];
  for (const t of LINKED_TABLES) {
    const { count } = await admin.from(t.table).select("*", { count: "exact", head: true }).eq(t.column, userId);
    if ((count ?? 0) > 0) labels.push(t.label);
  }
  return labels;
}

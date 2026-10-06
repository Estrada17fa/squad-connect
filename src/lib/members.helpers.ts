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

/**
 * Membresías iniciales de un miembro NUEVO: solo INSERT, nunca DELETE.
 * Editar membresías existentes se hace fila por fila (por id).
 */
export async function insertInitialMemberships(
  admin: any,
  userId: string,
  role: RoleLite,
  assignments: { team_id: string; job_title?: string | null }[],
  clubJobTitle?: string | null,
) {
  const rows = assignments.length
    ? assignments.map((a) => ({
        user_id: userId,
        role_id: role.id,
        team_id: a.team_id,
        job_title: a.job_title ? a.job_title : null,
      }))
    : [{ user_id: userId, role_id: role.id, team_id: null, job_title: clubJobTitle || null }];
  const { error } = await admin.from("team_memberships").insert(rows);
  if (error) throw new Error("No se pudieron asignar las categorías");
}

/** Crea (o desarchiva) la fila de jugador de UNA categoría. */
export async function ensurePlayerRow(
  admin: any,
  userId: string,
  teamId: string,
  player: PlayerInput | null | undefined,
) {
  const { data: existing } = await admin
    .from("player_profiles")
    .select("id")
    .eq("user_id", userId)
    .eq("team_id", teamId)
    .maybeSingle();
  const row = playerRowFor(userId, teamId, player);
  if (existing?.id) {
    const { error } = await admin.from("player_profiles").update(row).eq("id", existing.id);
    if (error) throw new Error("No se pudo actualizar la ficha de jugador");
  } else {
    const { error } = await admin.from("player_profiles").insert(row);
    if (error) throw new Error("No se pudo crear la ficha de jugador");
  }
}

/** Archiva la fila de jugador de UNA categoría. */
export async function archivePlayerRow(admin: any, userId: string, teamId: string) {
  const { error } = await admin
    .from("player_profiles")
    .update({ archived_at: new Date().toISOString() })
    .eq("user_id", userId)
    .eq("team_id", teamId)
    .is("archived_at", null);
  if (error) throw new Error("No se pudo archivar la ficha de jugador");
}

/** Datos de jugador que son de la PERSONA (no por categoría): pie, tallas, identidad. */
export async function updatePersonPlayerData(
  admin: any,
  userId: string,
  p: PlayerInput | null | undefined,
) {
  if (!p) return;
  const patch = {
    preferred_foot: norm(p.preferred_foot),
    affiliation_number: norm(p.affiliation_number),
    id_document: norm(p.id_document),
    joined_at: norm(p.joined_at),
    previous_club: norm(p.previous_club),
    player_status: p.player_status ?? "activo",
    shirt_size: norm(p.shirt_size),
    pants_size: norm(p.pants_size),
    shoe_size: norm(p.shoe_size),
  };
  await admin.from("player_profiles").update(patch).eq("user_id", userId).is("archived_at", null);
}

const LEVEL_RANK: Record<string, number> = {
  sin_acceso: 0,
  vista_jugador: 1,
  lector_categoria: 2,
  lector_global: 3,
  editor_categoria: 4,
  editor_global: 5,
};

export async function isSuperAdmin(supabase: any, userId: string) {
  const { data } = await supabase.from("super_admins").select("user_id").eq("user_id", userId).maybeSingle();
  return !!data;
}

/**
 * Impide escalar privilegios: el rol asignado no puede tener en ningún módulo
 * más nivel que el nivel efectivo del actor en esa categoría (o club-wide).
 */
export async function assertNoEscalation(
  supabase: any,
  actorId: string,
  roleId: string,
  teamId: string | null,
) {
  if (await isSuperAdmin(supabase, actorId)) return;
  const { data: perms } = await supabase
    .from("role_permissions")
    .select("module_key, level")
    .eq("role_id", roleId);
  for (const p of (perms ?? []) as { module_key: string; level: string }[]) {
    const target = LEVEL_RANK[p.level] ?? 0;
    if (target === 0) continue;
    const { data: mine } = await supabase.rpc("effective_permission", {
      _user_id: actorId,
      _module_key: p.module_key,
      _team_id: teamId,
    });
    if ((LEVEL_RANK[mine as string] ?? 0) < target) {
      throw new Error("No puedes asignar un rol con más permisos que los tuyos");
    }
  }
}

/** Duplicado = mismo user_id + mismo team_id exacto (null con null). */
export async function assertNoDuplicateMembership(
  admin: any,
  userId: string,
  teamId: string | null,
  exceptId?: string,
) {
  let q = admin.from("team_memberships").select("id").eq("user_id", userId);
  q = teamId ? q.eq("team_id", teamId) : q.is("team_id", null);
  const { data } = await q;
  if ((data ?? []).some((r: any) => r.id !== exceptId)) {
    throw new Error("Esta persona ya tiene una membresía en esa categoría");
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

export async function linkedDataCounts(
  admin: any,
  userId: string,
): Promise<{ label: string; count: number }[]> {
  const out: { label: string; count: number }[] = [];
  for (const t of LINKED_TABLES) {
    const { count } = await admin.from(t.table).select("*", { count: "exact", head: true }).eq(t.column, userId);
    if ((count ?? 0) > 0) out.push({ label: t.label, count: count ?? 0 });
  }
  return out;
}

export async function linkedDataLabels(admin: any, userId: string): Promise<string[]> {
  return (await linkedDataCounts(admin, userId)).map((r) => r.label);
}

/** Datos personales que se eliminan al borrar definitivamente a un miembro. */
export const PERSONAL_DATA_TABLES: { table: string; column: string }[] = [
  { table: "player_profiles", column: "user_id" },
  { table: "team_memberships", column: "user_id" },
  { table: "user_permission_overrides", column: "user_id" },
  { table: "request_type_user_overrides", column: "user_id" },
  { table: "push_subscriptions", column: "user_id" },
  { table: "notifications", column: "user_id" },
  { table: "announcement_reads", column: "user_id" },
  { table: "media_likes", column: "user_id" },
  { table: "media_comments", column: "user_id" },
  { table: "event_attendees", column: "user_id" },
  { table: "task_assignees", column: "user_id" },
  { table: "meeting_attendees", column: "user_id" },
  { table: "request_comments", column: "user_id" },
  { table: "requests", column: "requester_id" },
  { table: "inventory_loans", column: "borrower_user_id" },
  { table: "match_callups", column: "user_id" },
  { table: "trip_travelers", column: "user_id" },
  { table: "trip_flight_passengers", column: "user_id" },
  { table: "trip_flight_baggage_handlers", column: "user_id" },
  { table: "trip_transport_passengers", column: "user_id" },
  { table: "trip_room_occupants", column: "user_id" },
  { table: "trip_boarding_passes", column: "user_id" },
  { table: "injuries", column: "player_user_id" },
  { table: "medical_checkups", column: "player_user_id" },
  { table: "medical_prescriptions", column: "player_user_id" },
  { table: "medical_appointments", column: "player_user_id" },
  { table: "player_medical_profile", column: "player_user_id" },
  { table: "development_feedback", column: "player_user_id" },
  { table: "development_goals", column: "player_user_id" },
  { table: "development_assessments", column: "player_user_id" },
  { table: "development_measurements", column: "player_user_id" },
  { table: "routine_assignments", column: "player_user_id" },
  { table: "nutrition_assessments", column: "player_user_id" },
  { table: "nutrition_meal_plans", column: "player_user_id" },
  { table: "player_competition_stats", column: "player_user_id" },
];

/** Borra los datos personales del miembro antes de eliminar su cuenta. */
export async function purgePersonalData(admin: any, userId: string) {
  for (const t of PERSONAL_DATA_TABLES) {
    await admin.from(t.table).delete().eq(t.column, userId);
  }
}

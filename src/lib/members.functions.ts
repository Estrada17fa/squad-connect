import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const PLAYER_POSITIONS = ["Portero", "Defensa", "Mediocampista", "Delantero"] as const;
export type PlayerPosition = (typeof PLAYER_POSITIONS)[number];

const membershipSchema = z.object({
  role_id: z.string().uuid(),
  team_id: z.string().uuid().nullable(),
  job_title: z.string().trim().max(60).optional().nullable(),
});

const inputSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(255),
  password: z.string().min(8).max(128),
  first_name: z.string().trim().min(1).max(60),
  paternal_last_name: z.string().trim().min(1).max(60),
  maternal_last_name: z.string().trim().min(1).max(60),
  birthdate: z.string().optional().nullable(),
  nationality: z.string().trim().max(80).optional().nullable(),
  birthplace: z.string().trim().max(120).optional().nullable(),
  phone: z.string().trim().max(40).optional().nullable(),
  // Player-only fields (server enforces they only persist if a Jugador membership exists)
  shirt_size: z.string().trim().max(20).optional().nullable(),
  pants_size: z.string().trim().max(20).optional().nullable(),
  shoe_size: z.string().trim().max(20).optional().nullable(),
  jersey_number: z.number().int().min(0).max(999).optional().nullable(),
  position: z.enum(PLAYER_POSITIONS).optional().nullable(),
  memberships: z.array(membershipSchema).min(1).max(20),
});

export type CreateClubMemberInput = z.infer<typeof inputSchema>;

export const createClubMember = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => inputSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    // 1. Load caller profile to determine club_id
    const { data: caller, error: callerErr } = await supabase
      .from("profiles")
      .select("club_id")
      .eq("id", userId)
      .maybeSingle();
    if (callerErr) {
      console.error("[createClubMember] caller lookup", callerErr);
      throw new Error("No se pudo verificar tu perfil");
    }
    if (!caller?.club_id) throw new Error("Tu perfil no está asociado a un club");
    const clubId = caller.club_id;

    // 2. Authorization: super_admin OR editor/approver on 'usuarios' module
    const { data: isSuper } = await supabase
      .from("super_admins")
      .select("user_id")
      .eq("user_id", userId)
      .maybeSingle();

    let authorized = !!isSuper;
    if (!authorized) {
      const { data: perms } = await supabase
        .from("team_memberships")
        .select("role:roles!inner(role_permissions(module_key, access_level))")
        .eq("user_id", userId);
      for (const row of perms ?? []) {
        const rp = (row as any)?.role?.role_permissions ?? [];
        for (const p of rp) {
          if (p.module_key === "usuarios" && (p.access_level === "editor" || p.access_level === "approver")) {
            authorized = true;
            break;
          }
        }
        if (authorized) break;
      }
    }
    if (!authorized) throw new Error("No tienes permisos para crear miembros");

    // 3. Validate memberships against club
    const roleIds = [...new Set(data.memberships.map((m) => m.role_id))];
    const teamIds = [...new Set(data.memberships.map((m) => m.team_id).filter((x): x is string => !!x))];

    const { data: roles, error: rolesErr } = await supabase
      .from("roles")
      .select("id, club_id, name, allows_club_wide")
      .in("id", roleIds);
    if (rolesErr) throw new Error("No se pudieron validar los roles");
    const rolesById = new Map((roles ?? []).map((r) => [r.id, r]));
    for (const rid of roleIds) {
      const r = rolesById.get(rid);
      if (!r || r.club_id !== clubId) throw new Error("Rol inválido para este club");
    }

    if (teamIds.length) {
      const { data: teams, error: teamsErr } = await supabase
        .from("teams")
        .select("id, club_id")
        .in("id", teamIds);
      if (teamsErr) throw new Error("No se pudieron validar las categorías");
      for (const tid of teamIds) {
        const t = teams?.find((x) => x.id === tid);
        if (!t || t.club_id !== clubId) throw new Error("Categoría inválida para este club");
      }
    }

    for (const m of data.memberships) {
      if (m.team_id === null) {
        const r = rolesById.get(m.role_id);
        // Jugador is the only role that requires a specific team; all other
        // roles are club-wide by design regardless of the allows_club_wide flag.
        if (r?.name === "Jugador") {
          throw new Error("El rol Jugador requiere una categoría específica");
        }
      }
    }

    // Determine whether any membership uses the "Jugador" role.
    const hasPlayer = (roles ?? []).some((r) => r.name === "Jugador");

    // 4. Load admin client only after authorization
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // 5. Create auth user
    const fullName = [data.first_name, data.paternal_last_name, data.maternal_last_name]
      .map((s) => s.trim())
      .filter(Boolean)
      .join(" ");

    const { data: created, error: createErr } = await supabaseAdmin.auth.admin.createUser({
      email: data.email,
      password: data.password,
      email_confirm: true,
      user_metadata: { full_name: fullName },
    });
    if (createErr || !created?.user) {
      console.error("[createClubMember] auth.admin.createUser", createErr);
      const msg = createErr?.message ?? "";
      if (msg.toLowerCase().includes("already") || msg.toLowerCase().includes("registered")) {
        throw new Error("Ya existe un miembro con ese email");
      }
      throw new Error("No se pudo crear el miembro");
    }
    const newUserId = created.user.id;

    // 6. Update profile (trigger already created the row)
    const norm = <T,>(v: T | null | undefined): T | null =>
      v === undefined || v === null || (typeof v === "string" && v.trim() === "") ? null : v;

    const profileUpdate = {
      club_id: clubId,
      full_name: fullName,
      first_name: data.first_name.trim(),
      paternal_last_name: data.paternal_last_name.trim(),
      maternal_last_name: data.maternal_last_name.trim(),
      name_completed: true,
      email: data.email,
      birthdate: norm(data.birthdate),
      nationality: norm(data.nationality),
      birthplace: norm(data.birthplace),
      phone: norm(data.phone),
      // Player-only fields — only persisted when at least one membership is Jugador
      shirt_size: hasPlayer ? norm(data.shirt_size) : null,
      pants_size: hasPlayer ? norm(data.pants_size) : null,
      shoe_size: hasPlayer ? norm(data.shoe_size) : null,
      jersey_number: hasPlayer ? norm(data.jersey_number) : null,
      position: hasPlayer ? norm(data.position) : null,
    };
    const { error: profErr } = await supabaseAdmin
      .from("profiles")
      .update(profileUpdate)
      .eq("id", newUserId);
    if (profErr) {
      console.error("[createClubMember] profile update", profErr);
    }

    // 7. Insert memberships
    const rows = data.memberships.map((m) => ({
      user_id: newUserId,
      role_id: m.role_id,
      team_id: m.team_id,
      job_title: m.job_title ? m.job_title : null,
    }));
    const { error: memErr } = await supabaseAdmin.from("team_memberships").insert(rows);
    if (memErr) {
      console.error("[createClubMember] memberships insert", memErr);
      throw new Error("Miembro creado pero no se pudieron asignar las membresías");
    }

    return { userId: newUserId };
  });

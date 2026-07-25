import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const membershipSchema = z.object({
  role_id: z.string().uuid(),
  team_id: z.string().uuid().nullable(),
});

const inputSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(255),
  password: z.string().min(8).max(128),
  full_name: z.string().trim().min(1).max(120),
  birthdate: z.string().optional().nullable(),
  nationality: z.string().trim().max(80).optional().nullable(),
  phone: z.string().trim().max(40).optional().nullable(),
  shirt_size: z.string().trim().max(20).optional().nullable(),
  pants_size: z.string().trim().max(20).optional().nullable(),
  shoe_size: z.string().trim().max(20).optional().nullable(),
  jersey_number: z.number().int().min(0).max(999).optional().nullable(),
  position: z.string().trim().max(40).optional().nullable(),
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
      .select("id, club_id, allows_club_wide")
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
        if (!r?.allows_club_wide) {
          throw new Error("Un rol sin alcance de club no puede asignarse a 'Todo el club'");
        }
      }
    }

    // 4. Load admin client only after authorization
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // 5. Create auth user
    const { data: created, error: createErr } = await supabaseAdmin.auth.admin.createUser({
      email: data.email,
      password: data.password,
      email_confirm: true,
      user_metadata: { full_name: data.full_name },
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
    const profileUpdate: Record<string, unknown> = {
      club_id: clubId,
      full_name: data.full_name,
      email: data.email,
    };
    const optional: Array<keyof CreateClubMemberInput> = [
      "birthdate",
      "nationality",
      "phone",
      "shirt_size",
      "pants_size",
      "shoe_size",
      "jersey_number",
      "position",
    ];
    for (const k of optional) {
      const v = (data as any)[k];
      if (v !== undefined && v !== null && v !== "") profileUpdate[k] = v;
    }
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
    }));
    const { error: memErr } = await supabaseAdmin.from("team_memberships").insert(rows);
    if (memErr) {
      console.error("[createClubMember] memberships insert", memErr);
      throw new Error("Miembro creado pero no se pudieron asignar las membresías");
    }

    return { userId: newUserId };
  });

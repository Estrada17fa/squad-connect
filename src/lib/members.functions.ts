import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  createMemberSchema,
  updateMemberSchema,
  memberTargetSchema,
  memberDeleteSchema,
  addMembershipSchema,
  updateMembershipSchema,
  removeMembershipSchema,
  allCategoriesSchema,
  allCategoriesPreviewSchema,
} from "@/lib/members.schemas";
import {
  assertNotLastAdmin,
  authorizeMemberAdmin,
  fullNameOf,
  isPlayerRole,
  linkedDataCounts,
  purgePersonalData,
  loadClubRole,
  norm,
  insertInitialMemberships,
  ensurePlayerRow,
  archivePlayerRow,
  updatePersonPlayerData,
  assertNoEscalation,
  assertNoDuplicateMembership,
  type MemberCtx,
} from "@/lib/members.helpers";
import { validateClubTeams } from "@/lib/members.helpers";

export const createClubMember = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => createMemberSchema.parse(data))
  .handler(async ({ data, context }) => {
    const ctx = context as unknown as MemberCtx;
    const clubId = await authorizeMemberAdmin(ctx);
    const role = await loadClubRole(ctx.supabase, data.role_id, clubId);
    await validateClubTeams(ctx.supabase, data.assignments.map((a) => a.team_id), clubId);
    if (isPlayerRole(role) && data.assignments.length === 0) {
      throw new Error("El rol Jugador requiere al menos una categoría");
    }
    if (isPlayerRole(role) && data.all_categories) {
      throw new Error("Un jugador se asigna categoría por categoría");
    }
    if (!data.all_categories && data.assignments.length === 0) {
      throw new Error("Elige al menos una categoría o activa 'Todas las categorías'");
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const fullName = fullNameOf(data.first_name, data.paternal_last_name, data.maternal_last_name);

    const { data: created, error: createErr } = await supabaseAdmin.auth.admin.createUser({
      email: data.email,
      password: data.password,
      email_confirm: true,
      user_metadata: { full_name: fullName },
    });
    if (createErr || !created?.user) {
      const msg = (createErr?.message ?? "").toLowerCase();
      if (msg.includes("already") || msg.includes("registered")) {
        throw new Error("Ya existe un miembro con ese email");
      }
      throw new Error("No se pudo crear el miembro");
    }
    const newUserId = created.user.id;

    const { error: profErr } = await (supabaseAdmin as any)
      .from("profiles")
      .update({
        club_id: clubId,
        full_name: fullName,
        first_name: data.first_name.trim(),
        paternal_last_name: data.paternal_last_name.trim(),
        maternal_last_name: norm(data.maternal_last_name),
        name_completed: true,
        email: data.email,
        birthdate: norm(data.birthdate),
        nationality: norm(data.nationality),
        birthplace: norm(data.birthplace),
        phone: norm(data.phone),
        avatar_url: norm(data.avatar_url),
        emergency_contact_name: norm(data.emergency_contact_name),
        emergency_contact_phone: norm(data.emergency_contact_phone),
        status: "activo",
        must_change_password: true,
      })
      .eq("id", newUserId);
    if (profErr) console.error("[createClubMember] profile", profErr);

    await insertInitialMemberships(
      supabaseAdmin, newUserId, role, clubId, data.assignments, data.club_job_title, !!data.all_categories,
    );
    if (isPlayerRole(role)) {
      for (const a of data.assignments) await ensurePlayerRow(supabaseAdmin, newUserId, a.team_id, data.player);
    }
    return { userId: newUserId, roleName: role.name };
  });

export const updateClubMember = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => updateMemberSchema.parse(data))
  .handler(async ({ data, context }) => {
    const ctx = context as unknown as MemberCtx;
    const clubId = await authorizeMemberAdmin(ctx);

    const { data: target } = await ctx.supabase
      .from("profiles")
      .select("id, club_id")
      .eq("id", data.user_id)
      .maybeSingle();
    if (!target || target.club_id !== clubId) throw new Error("Miembro inválido");


    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const fullName = fullNameOf(data.first_name, data.paternal_last_name, data.maternal_last_name);

    const { error: profErr } = await (supabaseAdmin as any)
      .from("profiles")
      .update({
        full_name: fullName,
        first_name: data.first_name.trim(),
        paternal_last_name: data.paternal_last_name.trim(),
        maternal_last_name: norm(data.maternal_last_name),
        name_completed: true,
        birthdate: norm(data.birthdate),
        nationality: norm(data.nationality),
        birthplace: norm(data.birthplace),
        phone: norm(data.phone),
        avatar_url: norm(data.avatar_url),
        emergency_contact_name: norm(data.emergency_contact_name),
        emergency_contact_phone: norm(data.emergency_contact_phone),
      })
      .eq("id", data.user_id);
    if (profErr) throw new Error("No se pudo actualizar el perfil");

    if (data.password) {
      const { error } = await supabaseAdmin.auth.admin.updateUserById(data.user_id, {
        password: data.password,
      });
      if (error) throw new Error("No se pudo actualizar la contraseña");
      // Contraseña asignada por un admin: el miembro deberá cambiarla al entrar.
      await (supabaseAdmin as any)
        .from("profiles")
        .update({ must_change_password: true })
        .eq("id", data.user_id);
    }

    // Editar el perfil NUNCA toca team_memberships ni datos por categoría.
    await updatePersonPlayerData(supabaseAdmin, data.user_id, data.player);
    return { userId: data.user_id, roleName: null as string | null };
  });

/** Carga una membresía por id y verifica que pertenezca al club del actor. */
async function loadClubMembership(supabase: any, membershipId: string, clubId: string) {
  const { data: m } = await supabase
    .from("team_memberships")
    .select("id, user_id, team_id, role_id, role:roles!inner(id, name, base_role, club_id)")
    .eq("id", membershipId)
    .maybeSingle();
  if (!m || (m as any).role?.club_id !== clubId) throw new Error("Membresía inválida");
  return m as any;
}

const isAdminRole = (r: { name: string; base_role: string | null }) =>
  (r.base_role ?? r.name ?? "").toLowerCase() === "admin";

export const addMembership = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => addMembershipSchema.parse(data))
  .handler(async ({ data, context }) => {
    const ctx = context as unknown as MemberCtx;
    const clubId = await authorizeMemberAdmin(ctx);
    const { data: target } = await ctx.supabase
      .from("profiles").select("club_id").eq("id", data.user_id).maybeSingle();
    if (!target || target.club_id !== clubId) throw new Error("Miembro inválido");
    const role = await loadClubRole(ctx.supabase, data.role_id, clubId);
    await validateClubTeams(ctx.supabase, [data.team_id], clubId);
    await assertNoEscalation(ctx.supabase, ctx.userId, role.id, data.team_id);

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await assertNoDuplicateMembership(supabaseAdmin, data.user_id, data.team_id);
    const { error } = await (supabaseAdmin as any).from("team_memberships").insert({
      user_id: data.user_id,
      team_id: data.team_id,
      role_id: role.id,
      job_title: norm(data.job_title),
    });
    if (error) throw new Error("No se pudo añadir la membresía");
    if (isPlayerRole(role)) {
      await ensurePlayerRow(supabaseAdmin, data.user_id, data.team_id, {
        jersey_number: data.jersey_number,
        position: data.position,
        secondary_position: data.secondary_position,
      });
    }
    return { ok: true };
  });

export const updateMembership = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => updateMembershipSchema.parse(data))
  .handler(async ({ data, context }) => {
    const ctx = context as unknown as MemberCtx;
    const clubId = await authorizeMemberAdmin(ctx);
    const m = await loadClubMembership(ctx.supabase, data.membership_id, clubId);
    const newRole = await loadClubRole(ctx.supabase, data.role_id, clubId);
    const wasPlayer = isPlayerRole(m.role);
    const willBePlayer = isPlayerRole(newRole);
    if (willBePlayer && !m.team_id) throw new Error("Un jugador necesita una categoría concreta");

    if (m.role_id !== newRole.id) {
      if (m.user_id === ctx.userId && isAdminRole(m.role) && !isAdminRole(newRole)) {
        throw new Error("No puedes degradar tu propia membresía de administrador");
      }
      if (isAdminRole(m.role) && !isAdminRole(newRole)) {
        await assertNotLastAdmin(ctx.supabase, clubId, m.user_id);
      }
      await assertNoEscalation(ctx.supabase, ctx.userId, newRole.id, m.team_id);
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const admin = supabaseAdmin as any;
    // Archivar ANTES de cambiar la membresía.
    if (wasPlayer && !willBePlayer && m.team_id) await archivePlayerRow(admin, m.user_id, m.team_id);

    const { error } = await admin
      .from("team_memberships")
      .update({ role_id: newRole.id, job_title: norm(data.job_title) })
      .eq("id", m.id);
    if (error) throw new Error("No se pudo actualizar la membresía");

    if (willBePlayer && m.team_id) {
      const teamFields = {
        jersey_number: norm(data.jersey_number),
        position: norm(data.position),
        secondary_position: norm(data.secondary_position),
      };
      if (!wasPlayer) {
        await ensurePlayerRow(admin, m.user_id, m.team_id, teamFields);
      } else {
        const { error: pErr } = await admin
          .from("player_profiles")
          .update(teamFields)
          .eq("user_id", m.user_id)
          .eq("team_id", m.team_id)
          .is("archived_at", null);
        if (pErr) throw new Error("No se pudieron guardar dorsal y posición");
      }
    }
    return { ok: true };
  });

export const removeMembership = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => removeMembershipSchema.parse(data))
  .handler(async ({ data, context }) => {
    const ctx = context as unknown as MemberCtx;
    const clubId = await authorizeMemberAdmin(ctx);
    const m = await loadClubMembership(ctx.supabase, data.membership_id, clubId);
    if (isAdminRole(m.role)) {
      if (m.user_id === ctx.userId) throw new Error("No puedes quitar tu propia membresía de administrador");
      await assertNotLastAdmin(ctx.supabase, clubId, m.user_id);
    }
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const admin = supabaseAdmin as any;
    // Archivar ANTES de borrar la membresía.
    if (isPlayerRole(m.role) && m.team_id) await archivePlayerRow(admin, m.user_id, m.team_id);
    const { error } = await admin.from("team_memberships").delete().eq("id", m.id);
    if (error) throw new Error("No se pudo quitar la membresía");
    return { ok: true };
  });

export const deactivateClubMember = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => memberTargetSchema.parse(data))
  .handler(async ({ data, context }) => {
    const ctx = context as unknown as MemberCtx;
    const clubId = await authorizeMemberAdmin(ctx);
    if (data.user_id === ctx.userId) throw new Error("No puedes darte de baja a ti mismo");

    const { data: target } = await ctx.supabase
      .from("profiles")
      .select("id, club_id")
      .eq("id", data.user_id)
      .maybeSingle();
    if (!target || target.club_id !== clubId) throw new Error("Miembro inválido");
    await assertNotLastAdmin(ctx.supabase, clubId, data.user_id);

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await (supabaseAdmin as any)
      .from("profiles")
      .update({
        status: "baja",
        deactivated_at: new Date().toISOString(),
        deactivated_by: ctx.userId,
      })
      .eq("id", data.user_id);
    if (error) throw new Error("No se pudo dar de baja al miembro");

    await (supabaseAdmin.auth.admin as any).updateUserById(data.user_id, { ban_duration: "876000h" });
    await (supabaseAdmin.auth.admin as any).signOut?.(data.user_id, "global").catch?.(() => {});
    return { ok: true };
  });

export const reactivateClubMember = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => memberTargetSchema.parse(data))
  .handler(async ({ data, context }) => {
    const ctx = context as unknown as MemberCtx;
    const clubId = await authorizeMemberAdmin(ctx);
    const { data: target } = await ctx.supabase
      .from("profiles")
      .select("id, club_id")
      .eq("id", data.user_id)
      .maybeSingle();
    if (!target || target.club_id !== clubId) throw new Error("Miembro inválido");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await (supabaseAdmin as any)
      .from("profiles")
      .update({ status: "activo", deactivated_at: null, deactivated_by: null })
      .eq("id", data.user_id);
    if (error) throw new Error("No se pudo reactivar al miembro");
    await (supabaseAdmin.auth.admin as any).updateUserById(data.user_id, { ban_duration: "none" });
    return { ok: true };
  });

export const checkMemberReferences = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => memberTargetSchema.parse(data))
  .handler(async ({ data, context }) => {
    await authorizeMemberAdmin(context as unknown as MemberCtx);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const items = await linkedDataCounts(supabaseAdmin, data.user_id);
    return { hasData: items.length > 0, items, labels: items.map((i) => i.label) };
  });

export const hardDeleteClubMember = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => memberDeleteSchema.parse(data))
  .handler(async ({ data, context }) => {
    const ctx = context as unknown as MemberCtx;
    const clubId = await authorizeMemberAdmin(ctx);
    if (data.user_id === ctx.userId) throw new Error("No puedes eliminarte a ti mismo");

    const { data: target } = await ctx.supabase
      .from("profiles")
      .select("id, club_id")
      .eq("id", data.user_id)
      .maybeSingle();
    if (!target || target.club_id !== clubId) throw new Error("Miembro inválido");
    await assertNotLastAdmin(ctx.supabase, clubId, data.user_id);

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const items = await linkedDataCounts(supabaseAdmin, data.user_id);
    if (items.length && !data.force) {
      return {
        ok: false as const,
        reason:
          "Este miembro tiene historial en el club. Confirma para eliminarlo junto con sus registros personales.",
        items,
        labels: items.map((i) => i.label),
      };
    }

    await purgePersonalData(supabaseAdmin, data.user_id);
    const { error } = await supabaseAdmin.auth.admin.deleteUser(data.user_id);
    if (error) throw new Error("No se pudo eliminar la cuenta");
    return { ok: true as const, items: [] as { label: string; count: number }[] };
  });


/** Categorías del club donde la persona ya tiene un rol DISTINTO (para avisar antes de reemplazar). */
export const previewAllCategories = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => allCategoriesPreviewSchema.parse(data))
  .handler(async ({ data, context }) => {
    const ctx = context as unknown as MemberCtx;
    const clubId = await authorizeMemberAdmin(ctx);
    await loadClubRole(ctx.supabase, data.role_id, clubId);
    const { data: rows } = await ctx.supabase
      .from("team_memberships")
      .select("id, team_id, role_id, team:teams!inner(name, club_id), role:roles!inner(name)")
      .eq("user_id", data.user_id)
      .eq("team.club_id", clubId);
    const conflicts = ((rows ?? []) as any[])
      .filter((r) => r.role_id !== data.role_id)
      .map((r) => ({ team: r.team?.name ?? "", role: r.role?.name ?? "" }));
    return { conflicts };
  });

/**
 * Interruptor "Todas las categorías". Encender: guarda el interruptor y crea las
 * membresías que falten (fila por fila); reemplaza roles distintos SOLO si se confirmó.
 * Apagar: quita únicamente el interruptor y conserva las membresías.
 */
export const setAllCategories = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => allCategoriesSchema.parse(data))
  .handler(async ({ data, context }) => {
    const ctx = context as unknown as MemberCtx;
    const clubId = await authorizeMemberAdmin(ctx);
    const { data: target } = await ctx.supabase
      .from("profiles").select("club_id").eq("id", data.user_id).maybeSingle();
    if (!target || target.club_id !== clubId) throw new Error("Miembro inválido");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const admin = supabaseAdmin as any;

    if (!data.on) {
      const { error } = await admin
        .from("member_all_categories").delete().eq("club_id", clubId).eq("user_id", data.user_id);
      if (error) throw new Error("No se pudo apagar 'Todas las categorías'");
      return { ok: true };
    }

    if (!data.role_id) throw new Error("Elige un rol");
    const role = await loadClubRole(ctx.supabase, data.role_id, clubId);
    if (isPlayerRole(role)) throw new Error("Un jugador se asigna categoría por categoría");

    const { data: teams } = await admin.from("teams").select("id").eq("club_id", clubId);
    const { data: mine } = await admin
      .from("team_memberships")
      .select("id, team_id, role_id, job_title, role:roles!inner(id, name, base_role)")
      .eq("user_id", data.user_id);
    const byTeam = new Map<string, any>();
    for (const m of (mine ?? []) as any[]) if (m.team_id) byTeam.set(m.team_id, m);

    const conflicts = [...byTeam.values()].filter((m) => m.role_id !== role.id);
    if (conflicts.length && !data.replace_conflicts) {
      throw new Error("La persona ya tiene otro rol en algunas categorías; confirma el reemplazo");
    }
    for (const t of (teams ?? []) as { id: string }[]) {
      await assertNoEscalation(ctx.supabase, ctx.userId, role.id, t.id);
    }

    const jobTitle =
      norm(data.job_title) ?? ((mine ?? []) as any[]).find((m) => m.job_title)?.job_title ?? null;

    for (const t of (teams ?? []) as { id: string }[]) {
      const existing = byTeam.get(t.id);
      if (!existing) {
        const { error } = await admin
          .from("team_memberships")
          .insert({ user_id: data.user_id, team_id: t.id, role_id: role.id, job_title: jobTitle });
        if (error) throw new Error("No se pudo asignar una categoría");
      } else if (existing.role_id !== role.id) {
        if (isAdminRole(existing.role) && !isAdminRole(role)) {
          if (data.user_id === ctx.userId) throw new Error("No puedes degradar tu propia membresía de administrador");
          await assertNotLastAdmin(ctx.supabase, clubId, data.user_id);
        }
        if (isPlayerRole(existing.role)) await archivePlayerRow(admin, data.user_id, t.id);
        const { error } = await admin
          .from("team_memberships").update({ role_id: role.id }).eq("id", existing.id);
        if (error) throw new Error("No se pudo reemplazar un rol");
      }
    }
    const { error: sErr } = await admin
      .from("member_all_categories")
      .upsert({ club_id: clubId, user_id: data.user_id, role_id: role.id });
    if (sErr) throw new Error("No se pudo activar 'Todas las categorías'");
    return { ok: true };
  });

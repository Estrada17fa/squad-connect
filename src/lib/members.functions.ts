import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  createMemberSchema,
  updateMemberSchema,
  memberTargetSchema,
} from "@/lib/members.schemas";
import {
  assertNotLastAdmin,
  authorizeMemberAdmin,
  fullNameOf,
  isPlayerRole,
  linkedDataLabels,
  loadClubRole,
  norm,
  syncMemberships,
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
        phone: norm(data.phone),
        avatar_url: norm(data.avatar_url),
        emergency_contact_name: norm(data.emergency_contact_name),
        emergency_contact_phone: norm(data.emergency_contact_phone),
        status: "activo",
        must_change_password: true,
      })
      .eq("id", newUserId);
    if (profErr) console.error("[createClubMember] profile", profErr);

    await syncMemberships(supabaseAdmin, newUserId, role, data.assignments, data.player, data.club_job_title);
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

    const role = await loadClubRole(ctx.supabase, data.role_id, clubId);
    await validateClubTeams(ctx.supabase, data.assignments.map((a) => a.team_id), clubId);
    if (isPlayerRole(role) && data.assignments.length === 0) {
      throw new Error("El rol Jugador requiere al menos una categoría");
    }

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
    }

    await syncMemberships(supabaseAdmin, data.user_id, role, data.assignments, data.player, data.club_job_title);
    return { userId: data.user_id, roleName: role.name };
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
    const labels = await linkedDataLabels(supabaseAdmin, data.user_id);
    return { hasData: labels.length > 0, labels };
  });

export const hardDeleteClubMember = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => memberTargetSchema.parse(data))
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
    const labels = await linkedDataLabels(supabaseAdmin, data.user_id);
    if (labels.length) {
      return {
        ok: false as const,
        reason:
          "Este miembro tiene historial en el club. Usa 'Dar de baja' para conservar sus registros.",
        labels,
      };
    }

    await supabaseAdmin.from("player_profiles").delete().eq("user_id", data.user_id);
    await supabaseAdmin.from("team_memberships").delete().eq("user_id", data.user_id);
    const { error } = await supabaseAdmin.auth.admin.deleteUser(data.user_id);
    if (error) throw new Error("No se pudo eliminar la cuenta");
    return { ok: true as const };
  });

import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * SOLO LECTURA: último ingreso de los miembros del club del actor.
 * Requiere poder ver Usuarios (can_view_users). Nunca escribe nada.
 */
export const getMembersLastSignIn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context as any;
    const { data: canView } = await supabase.rpc("can_view_users", { _user_id: userId });
    if (!canView) throw new Error("Sin acceso");
    const { data: me } = await supabase.from("profiles").select("club_id").eq("id", userId).maybeSingle();
    if (!me?.club_id) return { ok: false as const, items: [] as { id: string; last_sign_in_at: string | null }[] };
    const { data: members } = await supabase.from("profiles").select("id").eq("club_id", me.club_id);
    const ids = new Set<string>((members ?? []).map((m: any) => m.id));

    try {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const items: { id: string; last_sign_in_at: string | null }[] = [];
      for (let page = 1; page <= 20; page++) {
        const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage: 200 });
        if (error) throw error;
        for (const u of data.users) if (ids.has(u.id)) items.push({ id: u.id, last_sign_in_at: u.last_sign_in_at ?? null });
        if (data.users.length < 200) break;
      }
      return { ok: true as const, items };
    } catch (e) {
      console.error("[getMembersLastSignIn]", e);
      return { ok: false as const, items: [] as { id: string; last_sign_in_at: string | null }[] };
    }
  });

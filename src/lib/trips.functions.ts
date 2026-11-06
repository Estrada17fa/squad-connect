import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const schema = z.object({
  tripId: z.string().uuid(),
  status: z.enum(["planeacion", "confirmado", "completado"]),
});

/**
 * Cambia el estado de un viaje. El cambio se hace como el usuario (las reglas
 * de la base deciden si puede editar). Al publicar (Borrador → Publicado) avisa
 * a los viajeros con el sistema de avisos existente.
 */
export const setTripStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => schema.parse(d))
  .handler(async ({ data, context }) => {
    const sb = context.supabase;
    const { data: before, error: e1 } = await sb.from("trips").select("id, club_id, status, title, destination").eq("id", data.tripId).maybeSingle();
    if (e1) throw new Error(e1.message);
    if (!before) throw new Error("Viaje no encontrado");
    const { data: updated, error: e2 } = await sb.from("trips").update({ status: data.status }).eq("id", data.tripId).select("id");
    if (e2) throw new Error(e2.message);
    if (!updated?.length) throw new Error("No tienes permiso para cambiar este viaje");

    let notified = 0;
    if (data.status === "confirmado" && before.status === "planeacion") {
      const { data: travelers } = await sb.from("trip_travelers").select("user_id").eq("trip_id", data.tripId);
      const ids = (travelers ?? []).map((t) => t.user_id).filter((u) => u !== context.userId);
      if (ids.length) {
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { error } = await supabaseAdmin.rpc("notify_users", {
          _club_id: before.club_id,
          _user_ids: ids,
          _type: "viaje_publicado",
          _title: `Tu viaje a ${before.destination || before.title} está listo`,
          _body: before.title,
          _related_module: "viajes",
          _related_id: data.tripId,
        });
        if (error) throw new Error(error.message);
        notified = ids.length;
      }
    }
    return { ok: true, notified };
  });

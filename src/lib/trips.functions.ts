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

const passNoticeSchema = z.object({
  tripId: z.string().uuid(),
  userIds: z.array(z.string().uuid()).max(500),
});

/**
 * Único lugar que envía "Tu pase de abordar está listo". Un aviso por persona
 * (sin repetir aunque reciba varios pases) y nunca si el viaje está en Borrador.
 * Solo quien puede editar el viaje lo dispara, y solo para personas que de
 * verdad tienen un pase en ese viaje.
 */
export const notifyBoardingPasses = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => passNoticeSchema.parse(d))
  .handler(async ({ data, context }) => {
    const sb = context.supabase;
    const ids = [...new Set(data.userIds)];
    if (!ids.length) return { notified: 0 };
    const { data: canEdit, error: pe } = await sb.rpc("can_edit_trip_new", { _user_id: context.userId, _trip_id: data.tripId });
    if (pe) throw new Error(pe.message);
    if (!canEdit) throw new Error("No tienes permiso para avisar en este viaje");
    const { data: trip, error: te } = await sb.from("trips").select("id, club_id, status, title").eq("id", data.tripId).maybeSingle();
    if (te) throw new Error(te.message);
    if (!trip || trip.status === "planeacion") return { notified: 0 };
    const { data: passes, error: be } = await sb
      .from("trip_boarding_passes")
      .select("user_id, flight:trip_flights!inner(trip_id)")
      .eq("flight.trip_id", data.tripId)
      .in("user_id", ids);
    if (be) throw new Error(be.message);
    const targets = [...new Set((passes ?? []).map((p) => p.user_id).filter((u): u is string => !!u))];
    if (!targets.length) return { notified: 0 };
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.rpc("notify_users", {
      _club_id: trip.club_id,
      _user_ids: targets,
      _type: "viaje_pase_abordar",
      _title: "Tu pase de abordar está listo",
      _body: trip.title,
      _related_module: "viajes",
      _related_id: trip.id,
    });
    if (error) throw new Error(error.message);
    return { notified: targets.length };
  });

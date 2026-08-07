import { supabase } from "@/integrations/supabase/client";
import type { EventType } from "@/lib/eventTypes";

const db = supabase as any;

export interface SaveCalendarEventInput {
  /** Cuando viene, se actualiza ese evento en vez de crear uno nuevo. */
  eventId?: string | null;
  clubId: string;
  teamId: string;
  eventType: EventType;
  title: string;
  /** ISO string. */
  startsAt: string;
  endsAt?: string | null;
  location?: string | null;
  locationId?: string | null;
  description?: string | null;
  /** Ids de perfiles convocados. Si es undefined no se toca la convocatoria. */
  attendeeIds?: string[];
  userId: string;
}

/**
 * Crea o actualiza un evento de calendario y sincroniza sus asistentes.
 * Lógica compartida entre el formulario de eventos y el de sesiones de entrenamiento.
 * Devuelve el id del evento.
 */
export async function saveCalendarEvent(input: SaveCalendarEventInput): Promise<string> {
  if (!input.teamId) throw new Error("Selecciona un equipo");
  if (!input.title.trim()) throw new Error("El título es obligatorio");
  if (!input.startsAt) throw new Error("La fecha y hora son obligatorias");

  const payload = {
    club_id: input.clubId,
    team_id: input.teamId,
    event_type: input.eventType,
    title: input.title.trim(),
    starts_at: input.startsAt,
    ends_at: input.endsAt || null,
    location: input.location?.trim() || null,
    location_id: input.locationId ?? null,
    description: input.description?.trim() || null,
  };

  let eventId = input.eventId ?? undefined;

  if (eventId) {
    const { error } = await db.from("calendar_events").update(payload).eq("id", eventId);
    if (error) throw error;
  } else {
    const { data, error } = await db
      .from("calendar_events")
      .insert({ ...payload, created_by: input.userId })
      .select("id")
      .single();
    if (error) throw error;
    eventId = data.id as string;
  }

  if (input.attendeeIds) {
    await syncEventAttendees(eventId!, input.attendeeIds);
  }

  return eventId!;
}

/** Deja `event_attendees` exactamente con la lista dada. */
export async function syncEventAttendees(eventId: string, attendeeIds: string[]) {
  const { data: existing, error: exErr } = await db
    .from("event_attendees")
    .select("user_id")
    .eq("event_id", eventId);
  if (exErr) throw exErr;

  const existingIds = new Set((existing ?? []).map((r: any) => r.user_id as string));
  const target = new Set(attendeeIds);
  const toAdd = [...target].filter((id) => !existingIds.has(id));
  const toRemove = [...existingIds].filter((id) => !target.has(id as string));

  if (toAdd.length) {
    const { error } = await db
      .from("event_attendees")
      .insert(toAdd.map((user_id) => ({ event_id: eventId, user_id })));
    if (error) throw error;
  }
  if (toRemove.length) {
    const { error } = await db
      .from("event_attendees")
      .delete()
      .eq("event_id", eventId)
      .in("user_id", toRemove);
    if (error) throw error;
  }
}

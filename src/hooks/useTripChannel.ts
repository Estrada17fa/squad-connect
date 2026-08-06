import * as React from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/**
 * Suscribe un bloque de logística a sus tablas y refresca su query al cambiar.
 * Cada hook de logística usa esto en lugar de repetir el boilerplate de realtime.
 */
export function useTripChannel(
  name: string,
  tripId: string | null | undefined,
  tables: string[],
  queryKey: readonly unknown[],
) {
  const qc = useQueryClient();
  const tablesKey = tables.join(",");
  const key = JSON.stringify(queryKey);

  React.useEffect(() => {
    if (!tripId) return;
    const invalidate = () => qc.invalidateQueries({ queryKey: JSON.parse(key) as unknown[] });
    let channel = supabase.channel(`${name}-${tripId}`);
    for (const table of tablesKey.split(",")) {
      channel = channel.on("postgres_changes", { event: "*", schema: "public", table }, invalidate);
    }
    channel.subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [name, tripId, tablesKey, key, qc]);
}

/** Sincroniza una tabla de asignación (pasajeros/ocupantes) con la selección dada. */
export async function syncAssignments(
  table: "trip_flight_passengers" | "trip_transport_passengers" | "trip_room_occupants",
  parentColumn: "flight_id" | "transport_id" | "room_id",
  parentId: string,
  currentUserIds: string[],
  nextUserIds: string[],
) {
  const next = new Set(nextUserIds);
  const current = new Set(currentUserIds);
  const toAdd = nextUserIds.filter((id) => !current.has(id));
  const toRemove = currentUserIds.filter((id) => !next.has(id));

  const client = supabase as unknown as {
    from: (t: string) => any;
  };

  if (toRemove.length) {
    const { error } = await client.from(table).delete().eq(parentColumn, parentId).in("user_id", toRemove);
    if (error) throw error;
  }
  if (toAdd.length) {
    const { error } = await client
      .from(table)
      .insert(toAdd.map((user_id) => ({ [parentColumn]: parentId, user_id })));
    if (error) throw error;
  }
}

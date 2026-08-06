import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { TRIP_DOCS_BUCKET } from "@/lib/tripLogistics";
import { tripFlightsKey } from "./useTripFlights";

export interface BoardingPassInput {
  user_id: string | null;
  seat: string | null;
  notes: string | null;
}

/** Alta, edición, borrado y descarga de pases de abordar (bucket privado). */
export function useBoardingPassMutations(tripId: string | null | undefined) {
  const qc = useQueryClient();
  const invalidate = () => qc.invalidateQueries({ queryKey: tripFlightsKey(tripId) });

  const upload = useMutation({
    mutationFn: async ({ flightId, file, input }: { flightId: string; file: File; input: BoardingPassInput }) => {
      const ext = file.name.split(".").pop() ?? "pdf";
      const path = `${tripId}/${flightId}/${crypto.randomUUID()}.${ext}`;
      const { error: upErr } = await supabase.storage.from(TRIP_DOCS_BUCKET).upload(path, file, { upsert: false });
      if (upErr) throw upErr;
      const { error } = await supabase
        .from("trip_boarding_passes")
        .insert({ flight_id: flightId, file_path: path, ...input });
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const update = useMutation({
    mutationFn: async ({ id, input }: { id: string; input: BoardingPassInput }) => {
      const { error } = await supabase.from("trip_boarding_passes").update(input).eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const remove = useMutation({
    mutationFn: async ({ id, filePath }: { id: string; filePath: string }) => {
      const { error } = await supabase.from("trip_boarding_passes").delete().eq("id", id);
      if (error) throw error;
      await supabase.storage.from(TRIP_DOCS_BUCKET).remove([filePath]);
    },
    onSuccess: invalidate,
  });

  return { upload, update, remove, invalidate };
}

/** URL temporal para ver/descargar un pase de abordar. */
export async function openBoardingPass(filePath: string) {
  const { data, error } = await supabase.storage.from(TRIP_DOCS_BUCKET).createSignedUrl(filePath, 60 * 5);
  if (error) throw error;
  window.open(data.signedUrl, "_blank", "noopener");
}

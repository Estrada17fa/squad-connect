import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { TRIP_DOCS_BUCKET } from "@/lib/tripLogistics";
import { tripFlightsKey } from "./useTripFlights";

export interface BoardingPassInput {
  user_id: string | null;
  seat: string | null;
  boarding_group: string | null;
  terminal: string | null;
  notes: string | null;
}

export interface BoardingPassBatchItem {
  blob: Blob;
  ext: string;
  input: BoardingPassInput;
}

/** Alta, edición, borrado y descarga de pases de abordar (bucket privado). */
export function useBoardingPassMutations(tripId: string | null | undefined) {
  const qc = useQueryClient();
  const invalidate = () => qc.invalidateQueries({ queryKey: tripFlightsKey(tripId) });

  const uploadOne = async (flightId: string, body: Blob, ext: string, input: BoardingPassInput) => {
    const path = `${tripId}/${flightId}/${crypto.randomUUID()}.${ext}`;
    const { error: upErr } = await supabase.storage.from(TRIP_DOCS_BUCKET).upload(path, body, { upsert: false });
    if (upErr) throw upErr;
    const { error } = await supabase
      .from("trip_boarding_passes")
      .insert({ flight_id: flightId, file_path: path, ...input });
    if (error) throw error;
  };

  const upload = useMutation({
    mutationFn: async ({ flightId, file, input }: { flightId: string; file: File; input: BoardingPassInput }) =>
      uploadOne(flightId, file, file.name.split(".").pop() ?? "pdf", input),
    onSuccess: invalidate,
  });

  /** Carga por lote: se usa al confirmar la auto-asignación desde un PDF. */
  const uploadBatch = useMutation({
    mutationFn: async ({ flightId, items }: { flightId: string; items: BoardingPassBatchItem[] }) => {
      for (const item of items) await uploadOne(flightId, item.blob, item.ext, item.input);
    },
    onSuccess: invalidate,
  });

  const update = useMutation({
    mutationFn: async ({ id, input }: { id: string; input: Partial<BoardingPassInput> }) => {
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

  return { upload, uploadBatch, update, remove, invalidate };
}

/** URL temporal para ver/descargar un pase de abordar. */
export async function boardingPassUrl(filePath: string) {
  const { data, error } = await supabase.storage.from(TRIP_DOCS_BUCKET).createSignedUrl(filePath, 60 * 10);
  if (error) throw error;
  return data.signedUrl;
}

/** Abre el pase en una pestaña nueva. */
export async function openBoardingPass(filePath: string) {
  const url = await boardingPassUrl(filePath);
  window.open(url, "_blank", "noopener");
}

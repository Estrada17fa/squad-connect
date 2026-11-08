import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { TRIP_DOCS_BUCKET } from "@/lib/tripLogistics";
import { tripFlightsKey } from "./useTripFlights";
import { notifyBoardingPasses } from "@/lib/trips.functions";
import { pdfToPassImages } from "@/lib/boardingPassMatch";

const isPdf = (f: File) => f.type === "application/pdf" || f.name.toLowerCase().endsWith(".pdf");

/** Avisa (una vez por persona; nunca en Borrador). Un fallo del aviso no deshace la carga. */
export async function sendPassNotices(tripId: string | null | undefined, userIds: (string | null | undefined)[]) {
  const ids = [...new Set(userIds.filter((u): u is string => !!u))];
  if (!tripId || !ids.length) return 0;
  try {
    const r = await notifyBoardingPasses({ data: { tripId, userIds: ids } });
    return r.notified;
  } catch (e) {
    console.error("No se pudo enviar el aviso de pase", e);
    return 0;
  }
}

/** Sube un archivo y crea el pase. Devuelve id y ruta para poder deshacer. No avisa. */
export async function insertBoardingPass(tripId: string, flightId: string, body: Blob, ext: string, input: BoardingPassInput) {
  const path = `${tripId}/${flightId}/${crypto.randomUUID()}.${ext}`;
  const { error: upErr } = await supabase.storage.from(TRIP_DOCS_BUCKET).upload(path, body, { upsert: false, contentType: body.type || undefined });
  if (upErr) throw upErr;
  const { data, error } = await supabase.from("trip_boarding_passes").insert({ flight_id: flightId, file_path: path, ...input }).select("id").single();
  if (error) {
    await supabase.storage.from(TRIP_DOCS_BUCKET).remove([path]);
    throw error;
  }
  return { id: data.id as string, path };
}

/** Borra el pase y su archivo. */
export async function deleteBoardingPass(id: string, filePath: string) {
  const { error } = await supabase.from("trip_boarding_passes").delete().eq("id", id);
  if (error) throw error;
  await supabase.storage.from(TRIP_DOCS_BUCKET).remove([filePath]);
}

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
    const { error: upErr } = await supabase.storage.from(TRIP_DOCS_BUCKET).upload(path, body, { upsert: false, contentType: body.type || undefined });
    if (upErr) throw upErr;
    const { error } = await supabase
      .from("trip_boarding_passes")
      .insert({ flight_id: flightId, file_path: path, ...input });
    if (error) {
      await supabase.storage.from(TRIP_DOCS_BUCKET).remove([path]);
      throw error;
    }
  };

  const upload = useMutation({
    // Igual que la carga múltiple: un PDF se guarda como imágenes JPEG (una por página)
    // para que cualquier celular lo muestre, y se toman asiento/grupo/terminal del pase.
    mutationFn: async ({ flightId, file, input }: { flightId: string; file: File; input: BoardingPassInput }) => {
      if (!isPdf(file)) return uploadOne(flightId, file, (file.name.split(".").pop() ?? "jpg").toLowerCase(), input);
      const pages = await pdfToPassImages(file);
      if (!pages?.length) throw new Error("No se pudo leer el PDF del pase");
      for (const { extract, blob } of pages) {
        await uploadOne(flightId, blob, "jpg", {
          ...input,
          seat: input.seat ?? extract.seat ?? null,
          boarding_group: input.boarding_group ?? extract.group ?? null,
          terminal: input.terminal ?? extract.terminal ?? null,
        });
      }
    },
    onSuccess: (_d, v) => { invalidate(); void sendPassNotices(tripId, [v.input.user_id]); },
  });

  /** Carga por lote: se usa al confirmar la auto-asignación desde un PDF. */
  const uploadBatch = useMutation({
    mutationFn: async ({ flightId, items }: { flightId: string; items: BoardingPassBatchItem[] }) => {
      for (const item of items) await uploadOne(flightId, item.blob, item.ext, item.input);
    },
    onSuccess: (_d, v) => { invalidate(); void sendPassNotices(tripId, v.items.map((i) => i.input.user_id)); },
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
export async function boardingPassUrl(filePath: string, download = false) {
  const { data, error } = await supabase.storage
    .from(TRIP_DOCS_BUCKET)
    .createSignedUrl(filePath, 60 * 10, download ? { download: true } : undefined);
  if (error) throw error;
  return data.signedUrl;
}

/**
 * URLs firmadas (ver y descargar) resueltas por adelantado.
 * Así el visor abre al instante y no dependemos de abrir pestañas por código,
 * que los navegadores móviles bloquean.
 */
export function useBoardingPassUrls(filePath: string | null | undefined) {
  const q = useQuery({
    queryKey: ["boarding-pass-url", filePath],
    enabled: !!filePath,
    staleTime: 1000 * 60 * 5,
    queryFn: async () => {
      const path = filePath as string;
      const [view, download] = await Promise.all([boardingPassUrl(path), boardingPassUrl(path, true)]);
      return { view, download };
    },
  });
  return {
    view: q.data?.view ?? null,
    download: q.data?.download ?? null,
    isLoading: q.isLoading,
    isError: q.isError,
    refetch: q.refetch,
  };
}

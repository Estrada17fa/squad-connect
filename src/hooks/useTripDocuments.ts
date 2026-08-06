import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTripChannel } from "./useTripChannel";
import { fileExtOf, type DocumentCategory } from "./useDocuments";

/** Documento ligado a un viaje (itinerario, credenciales, lista de buena fe…). */
export interface TripDocument {
  id: string;
  trip_id: string | null;
  club_id: string;
  title: string;
  description: string | null;
  category: DocumentCategory;
  file_path: string;
  file_type: string | null;
  file_size: number | null;
  created_at: string;
}

export const tripDocumentsKey = (tripId: string | null | undefined) => ["trip-documents", tripId ?? "none"] as const;

export function useTripDocuments(tripId: string | null | undefined) {
  const query = useQuery({
    queryKey: tripDocumentsKey(tripId),
    enabled: !!tripId,
    queryFn: async (): Promise<TripDocument[]> => {
      const { data, error } = await supabase
        .from("documents")
        .select("id, trip_id, club_id, title, description, category, file_path, file_type, file_size, created_at")
        .eq("trip_id", tripId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as TripDocument[];
    },
  });

  useTripChannel("trip-docs", tripId, ["documents"], tripDocumentsKey(tripId));

  return query;
}

export interface TripDocumentInput {
  title: string;
  description: string | null;
  category: DocumentCategory;
  file: File;
}

export function useTripDocumentMutations(
  tripId: string | null | undefined,
  clubId: string | null | undefined,
  teamId: string | null | undefined,
) {
  const qc = useQueryClient();
  const invalidate = () => {
    qc.invalidateQueries({ queryKey: tripDocumentsKey(tripId) });
    qc.invalidateQueries({ queryKey: ["documents"] });
  };

  const upload = useMutation({
    mutationFn: async ({ input, userId }: { input: TripDocumentInput; userId: string }) => {
      const ext = fileExtOf(input.file.name) ?? "bin";
      const safe = input.file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
      const path = `${clubId}/viajes/${tripId}/${Date.now()}-${safe}`;
      const { error: upErr } = await supabase.storage
        .from("documents")
        .upload(path, input.file, { upsert: false, contentType: input.file.type || undefined });
      if (upErr) throw upErr;

      const { error } = await supabase.from("documents").insert({
        club_id: clubId!,
        trip_id: tripId!,
        team_id: teamId ?? null,
        title: input.title,
        description: input.description,
        category: input.category,
        file_path: path,
        file_type: ext,
        file_size: input.file.size,
        uploaded_by: userId,
      });
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const remove = useMutation({
    mutationFn: async ({ id, filePath }: { id: string; filePath: string }) => {
      const { error } = await supabase.from("documents").delete().eq("id", id);
      if (error) throw error;
      await supabase.storage.from("documents").remove([filePath]);
    },
    onSuccess: invalidate,
  });

  return { upload, remove, invalidate };
}

/** Abre un documento del viaje con una URL firmada temporal. */
export async function openTripDocument(filePath: string) {
  const { data, error } = await supabase.storage.from("documents").createSignedUrl(filePath, 60 * 5);
  if (error) throw error;
  window.open(data.signedUrl, "_blank", "noopener");
}

import * as React from "react";
import { queryOptions, useQuery, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import { FileText, FileImage, FileType2, type LucideIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

/** Tipo/etiqueta del documento (enum en la base). "Categoría" en la app = equipo. */
export type DocumentCategory = Database["public"]["Enums"]["document_category"];

export const DOCUMENT_CATEGORIES: { value: DocumentCategory; label: string }[] = [
  { value: "jugador", label: "Jugador" },
  { value: "staff", label: "Staff" },
  { value: "institucional", label: "Institucional" },
  { value: "legal", label: "Legal" },
  { value: "competicion", label: "Competición" },
  { value: "comercial", label: "Comercial" },
  { value: "operativo", label: "Operativo" },
];

/** Alias legible: en la interfaz este enum se muestra como "Tipo". */
export const DOCUMENT_TYPES = DOCUMENT_CATEGORIES;

export const CATEGORY_LABEL: Record<DocumentCategory, string> = Object.fromEntries(
  DOCUMENT_CATEGORIES.map((c) => [c.value, c.label]),
) as Record<DocumentCategory, string>;

export interface DocumentRow {
  id: string;
  club_id: string;
  title: string;
  description: string | null;
  category: DocumentCategory;
  file_path: string;
  file_type: string | null;
  file_size: number | null;
  related_user_id: string | null;
  team_id: string | null;
  issue_date: string | null;
  expiry_date: string | null;
  tags: string[] | null;
  uploaded_by: string | null;
  created_at: string;
  updated_at: string;
  related_user?: { id: string; full_name: string | null; avatar_url: string | null } | null;
  team?: { id: string; name: string; category: string | null } | null;
  uploader?: { id: string; full_name: string | null; avatar_url: string | null } | null;
}

/** Alcance de la consulta: generales (módulo) o personales (perfil de alguien). */
export type DocumentScope = "general" | "personal" | "all";

export interface DocumentFilters {
  clubId: string | null | undefined;
  relatedUserId?: string | null;
  teamId?: string | null;
  scope?: DocumentScope;
}

const SELECT_COLS =
  "id, club_id, title, description, category, file_path, file_type, file_size, related_user_id, team_id, issue_date, expiry_date, tags, uploaded_by, created_at, updated_at, related_user:profiles!documents_related_user_id_fkey(id, full_name, avatar_url), team:teams(id, name, category), uploader:profiles!documents_uploaded_by_fkey(id, full_name, avatar_url)";

export const documentsQueryOptions = ({
  clubId,
  relatedUserId,
  teamId,
  scope = "general",
}: DocumentFilters) =>
  queryOptions({
    queryKey: ["documents", clubId ?? "none", relatedUserId ?? "any", teamId ?? "any", scope] as const,
    enabled: !!clubId,
    staleTime: 30_000,
    gcTime: 5 * 60_000,
    placeholderData: keepPreviousData,
    queryFn: async (): Promise<DocumentRow[]> => {
      let q = supabase
        .from("documents")
        .select(SELECT_COLS)
        .eq("club_id", clubId!)
        .is("trip_id", null)
        .order("created_at", { ascending: false });
      if (relatedUserId) q = q.eq("related_user_id", relatedUserId);
      else if (scope === "general") q = q.is("related_user_id", null);
      else if (scope === "personal") q = q.not("related_user_id", "is", null);
      if (teamId) q = q.eq("team_id", teamId);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as unknown as DocumentRow[];
    },
  });

export function useDocuments(filters: DocumentFilters) {
  const qc = useQueryClient();
  const query = useQuery(documentsQueryOptions(filters));
  const clubId = filters.clubId;
  React.useEffect(() => {
    if (!clubId) return;
    const ch = supabase
      .channel(`documents-${clubId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "documents", filter: `club_id=eq.${clubId}` },
        () => qc.invalidateQueries({ queryKey: ["documents", clubId] }),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [clubId, qc]);
  return query;
}

/** Devuelve una URL firmada temporal para descargar/mostrar. */
export async function getDocumentSignedUrl(file_path: string, expiresInSec = 60): Promise<string> {
  const { data, error } = await supabase.storage.from("documents").createSignedUrl(file_path, expiresInSec);
  if (error) throw error;
  return data.signedUrl;
}

export function fileExtOf(name: string | null): string | null {
  if (!name) return null;
  const m = name.match(/\.([a-z0-9]+)$/i);
  return m ? m[1].toLowerCase() : null;
}

export function isImageExt(ext: string | null): boolean {
  return !!ext && ["png", "jpg", "jpeg", "gif", "webp", "svg", "bmp"].includes(ext);
}

export function isPdfExt(ext: string | null): boolean {
  return ext === "pdf";
}

/** Icono según el tipo de archivo (nunca emojis). */
export function fileIconOf(doc: Pick<DocumentRow, "file_type" | "file_path">): LucideIcon {
  const ext = doc.file_type ?? fileExtOf(doc.file_path);
  if (isPdfExt(ext)) return FileType2;
  if (isImageExt(ext)) return FileImage;
  return FileText;
}

export type ExpiryState = "none" | "expired" | "soon" | "ok";

export function expiryStateOf(expiry_date: string | null, soonDays = 30): ExpiryState {
  if (!expiry_date) return "none";
  const d = new Date(expiry_date + "T00:00:00");
  if (Number.isNaN(d.getTime())) return "none";
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const diff = Math.floor((d.getTime() - now.getTime()) / 86400000);
  if (diff < 0) return "expired";
  if (diff <= soonDays) return "soon";
  return "ok";
}

/** Fecha de calendario (emisión/vencimiento) con el formato de toda la app. */
export function formatDocDate(value: string | null | undefined): string | null {
  if (!value) return null;
  const d = new Date(value.length <= 10 ? `${value}T00:00:00` : value);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString("es-MX", { day: "2-digit", month: "short", year: "numeric" });
}

export function formatFileSize(bytes: number | null | undefined): string | null {
  if (!bytes && bytes !== 0) return null;
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

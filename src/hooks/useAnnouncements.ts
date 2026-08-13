import * as React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/**
 * Módulo Comunicados — tablón de una vía (module_key 'comunicados').
 *
 * La visibilidad la garantiza RLS (can_view_announcement): el cliente no
 * filtra por permiso, solo ordena y presenta.
 */

const db = supabase as any;
export const ANNOUNCEMENT_BUCKET = "announcement-attachments";

export type AnnouncementPriority = "normal" | "importante" | "urgente";
export type AnnouncementAudience = "club" | "teams";

export const PRIORITY_LABEL: Record<AnnouncementPriority, string> = {
  normal: "Normal",
  importante: "Importante",
  urgente: "Urgente",
};

export const PRIORITY_ORDER: Record<AnnouncementPriority, number> = {
  urgente: 0,
  importante: 1,
  normal: 2,
};

export interface AnnouncementRow {
  id: string;
  club_id: string;
  title: string;
  body: string;
  priority: AnnouncementPriority;
  audience: AnnouncementAudience;
  published_at: string;
  author_id: string | null;
  attachment_path: string | null;
  attachment_name: string | null;
  attachment_type: string | null;
  created_at: string;
  updated_at: string;
  author?: { id: string; full_name: string | null; avatar_url: string | null } | null;
  teams: { team_id: string; name: string | null }[];
  /** true cuando el usuario actual ya lo marcó como leído. */
  read: boolean;
}

export interface AnnouncementInput {
  id?: string;
  club_id: string;
  title: string;
  body: string;
  priority: AnnouncementPriority;
  audience: AnnouncementAudience;
  teamIds: string[];
  attachment_path: string | null;
  attachment_name: string | null;
  attachment_type: string | null;
  author_id: string;
}

/* ------------------------------------------------------------------ */
/* Realtime                                                            */
/* ------------------------------------------------------------------ */

function useAnnouncementsRealtime(clubId: string | null | undefined) {
  const qc = useQueryClient();
  React.useEffect(() => {
    if (!clubId) return;
    const suffix = Math.random().toString(36).slice(2);
    const ch = supabase
      .channel(`comunicados-${clubId}-${suffix}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "announcements" }, () =>
        qc.invalidateQueries({ queryKey: ["announcements", clubId] }),
      )
      .on("postgres_changes", { event: "*", schema: "public", table: "announcement_reads" }, () => {
        qc.invalidateQueries({ queryKey: ["announcements", clubId] });
        qc.invalidateQueries({ queryKey: ["announcement-reads"] });
      })
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [clubId, qc]);
}

/* ------------------------------------------------------------------ */
/* Consultas                                                           */
/* ------------------------------------------------------------------ */

export function useAnnouncements(clubId: string | null | undefined, userId: string) {
  useAnnouncementsRealtime(clubId);
  return useQuery({
    queryKey: ["announcements", clubId ?? "none", userId],
    enabled: !!clubId && !!userId,
    queryFn: async (): Promise<AnnouncementRow[]> => {
      const { data, error } = await db
        .from("announcements")
        .select(
          "*, author:profiles!announcements_author_id_fkey(id, full_name, avatar_url), announcement_teams(team_id, teams(name)), announcement_reads(user_id)",
        )
        .eq("club_id", clubId)
        .order("published_at", { ascending: false });
      if (error) throw error;
      return (data ?? []).map((row: any) => ({
        ...row,
        teams: (row.announcement_teams ?? []).map((t: any) => ({
          team_id: t.team_id,
          name: t.teams?.name ?? null,
        })),
        read: (row.announcement_reads ?? []).some((r: any) => r.user_id === userId),
      }));
    },
  });
}

/** Confirmaciones de lectura de un comunicado (solo visibles para su editor). */
export function useAnnouncementReads(announcementId: string | null | undefined) {
  return useQuery({
    queryKey: ["announcement-reads", announcementId ?? "none"],
    enabled: !!announcementId,
    queryFn: async (): Promise<Record<string, string>> => {
      const { data, error } = await db
        .from("announcement_reads")
        .select("user_id, read_at")
        .eq("announcement_id", announcementId);
      if (error) throw error;
      const map: Record<string, string> = {};
      for (const r of data ?? []) map[r.user_id] = r.read_at;
      return map;
    },
  });
}

/** Personas destinatarias de un comunicado (para el conteo "18 de 22"). */
export function useAnnouncementRecipients(
  clubId: string | null | undefined,
  audience: AnnouncementAudience | undefined,
  teamIds: string[],
) {
  const key = [...teamIds].sort().join(",");
  return useQuery({
    queryKey: ["announcement-recipients", clubId ?? "none", audience ?? "none", key],
    enabled: !!clubId && !!audience,
    queryFn: async () => {
      if (audience === "club") {
        const { data, error } = await db
          .from("profiles")
          .select("id, full_name, avatar_url")
          .eq("club_id", clubId)
          .eq("status", "activo");
        if (error) throw error;
        return (data ?? []) as { id: string; full_name: string | null; avatar_url: string | null }[];
      }
      if (!teamIds.length) return [];
      const { data, error } = await db
        .from("team_memberships")
        .select("user_id, team_id, profile:profiles!inner(id, full_name, avatar_url, club_id, status)")
        .in("team_id", teamIds)
        .eq("profile.club_id", clubId)
        .eq("profile.status", "activo");
      if (error) throw error;
      const seen = new Set<string>();
      const out: { id: string; full_name: string | null; avatar_url: string | null }[] = [];
      for (const row of data ?? []) {
        const p = (row as any).profile;
        if (!p || seen.has(p.id)) continue;
        seen.add(p.id);
        out.push({ id: p.id, full_name: p.full_name, avatar_url: p.avatar_url });
      }
      return out.sort((a, b) => (a.full_name ?? "").localeCompare(b.full_name ?? ""));
    },
  });
}

/** URL firmada del adjunto privado. */
export function useAttachmentUrl(path: string | null | undefined) {
  return useQuery({
    queryKey: ["announcement-file", path ?? "none"],
    enabled: !!path,
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const { data, error } = await supabase.storage
        .from(ANNOUNCEMENT_BUCKET)
        .createSignedUrl(path!, 3600);
      if (error) throw error;
      return data.signedUrl;
    },
  });
}

/* ------------------------------------------------------------------ */
/* Mutaciones                                                          */
/* ------------------------------------------------------------------ */

export function useSaveAnnouncement() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: AnnouncementInput) => {
      const payload = {
        club_id: input.club_id,
        title: input.title,
        body: input.body,
        priority: input.priority,
        audience: input.audience,
        attachment_path: input.attachment_path,
        attachment_name: input.attachment_name,
        attachment_type: input.attachment_type,
      };

      let id = input.id;
      if (id) {
        const { error } = await db.from("announcements").update(payload).eq("id", id);
        if (error) throw error;
        const { error: delErr } = await db
          .from("announcement_teams")
          .delete()
          .eq("announcement_id", id);
        if (delErr) throw delErr;
      } else {
        const { data, error } = await db
          .from("announcements")
          .insert({ ...payload, author_id: input.author_id })
          .select("id")
          .single();
        if (error) throw error;
        id = data.id as string;
      }

      if (input.audience === "teams" && input.teamIds.length) {
        const { error } = await db
          .from("announcement_teams")
          .insert(input.teamIds.map((team_id) => ({ announcement_id: id, team_id })));
        if (error) throw error;
      }
      return id!;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["announcements"] }),
  });
}

export function useDeleteAnnouncement() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (a: AnnouncementRow) => {
      const { error } = await db.from("announcements").delete().eq("id", a.id);
      if (error) throw error;
      if (a.attachment_path) {
        await supabase.storage.from(ANNOUNCEMENT_BUCKET).remove([a.attachment_path]);
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["announcements"] }),
  });
}

/** Marca como leído (idempotente): se dispara al abrir el detalle. */
export function useMarkRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ announcementId, userId }: { announcementId: string; userId: string }) => {
      const { error } = await db
        .from("announcement_reads")
        .upsert(
          { announcement_id: announcementId, user_id: userId },
          { onConflict: "announcement_id,user_id", ignoreDuplicates: true },
        );
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["announcements"] });
      qc.invalidateQueries({ queryKey: ["announcement-reads"] });
    },
  });
}

/* ------------------------------------------------------------------ */
/* Utilidades                                                          */
/* ------------------------------------------------------------------ */

export function formatAnnouncementDate(iso: string) {
  return new Date(iso).toLocaleString("es-MX", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function audienceLabel(a: AnnouncementRow) {
  if (a.audience === "club") return "Todo el club";
  if (!a.teams.length) return "Sin destino";
  return a.teams.map((t) => t.name ?? "Categoría").join(" · ");
}

/** Urgentes primero, luego importantes; dentro de cada grupo, más recientes. */
export function sortAnnouncements(rows: AnnouncementRow[]) {
  return [...rows].sort((a, b) => {
    const p = PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority];
    if (p !== 0) return p;
    return new Date(b.published_at).getTime() - new Date(a.published_at).getTime();
  });
}

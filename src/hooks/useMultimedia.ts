import * as React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { MediaAudience, MediaFileKind, MediaPostType } from "@/lib/multimedia";

/**
 * Módulo Multimedia (module_key 'multimedia').
 *
 * La visibilidad la garantiza la RLS (`can_view_media_post`): el cliente solo
 * ordena, filtra por tipo/fecha y presenta. La gestión (subir/editar/borrar)
 * vive en Coordinación y la habilita `can_edit_media_post`.
 */

const db = supabase as any;
export const MEDIA_BUCKET = "media-posts";

export interface MediaFile {
  id: string;
  post_id: string;
  storage_path: string;
  file_name: string;
  mime_type: string | null;
  kind: MediaFileKind;
  sort_order: number;
}

export interface MediaMatchInfo {
  id: string;
  matchday: number | null;
  kickoff_at: string | null;
  rival: string | null;
  rivalCrest: string | null;
}


export interface MediaPost {
  id: string;
  club_id: string;
  album_id: string;
  title: string | null;
  description: string | null;
  type: MediaPostType;
  audience: MediaAudience;
  match_id: string | null;
  published_at: string;
  author_id: string | null;
  author: { id: string; full_name: string | null; avatar_url: string | null } | null;
  files: MediaFile[];
  teams: { team_id: string; name: string | null }[];
  match: MediaMatchInfo | null;
  likeCount: number;
  liked: boolean;
  commentCount: number;
}

export interface MediaComment {
  id: string;
  post_id: string;
  user_id: string;
  body: string;
  created_at: string;
  author: { id: string; full_name: string | null; avatar_url: string | null } | null;
}

export interface MediaPostInput {
  id?: string;
  club_id: string;
  author_id: string;
  title: string | null;
  description: string | null;
  type: MediaPostType;
  audience: MediaAudience;
  teamIds: string[];
  match_id: string | null;
  published_at: string;
  /** Archivos nuevos a subir (solo al crear o al agregar en edición). */
  files?: { storage_path: string; file_name: string; mime_type: string | null; kind: MediaFileKind }[];
}

/* ------------------------------------------------------------------ */
/* Realtime                                                            */
/* ------------------------------------------------------------------ */

function useMediaRealtime(clubId: string | null | undefined) {
  const qc = useQueryClient();
  React.useEffect(() => {
    if (!clubId) return;
    const suffix = Math.random().toString(36).slice(2);
    const invalidate = () => qc.invalidateQueries({ queryKey: ["media-posts", clubId] });
    const ch = supabase
      .channel(`multimedia-${clubId}-${suffix}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "media_posts" }, invalidate)
      .on("postgres_changes", { event: "*", schema: "public", table: "media_likes" }, invalidate)
      .on("postgres_changes", { event: "*", schema: "public", table: "media_comments" }, () => {
        invalidate();
        qc.invalidateQueries({ queryKey: ["media-comments"] });
      })
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [clubId, qc]);
}

/* ------------------------------------------------------------------ */
/* Lectura                                                             */
/* ------------------------------------------------------------------ */

export function useMediaPosts(clubId: string | null | undefined, userId: string) {
  useMediaRealtime(clubId);
  return useQuery({
    queryKey: ["media-posts", clubId ?? "none", userId],
    enabled: !!clubId && !!userId,
    queryFn: async (): Promise<MediaPost[]> => {
      const { data, error } = await db
        .from("media_posts")
        .select(
          `*,
           author:profiles!media_posts_author_id_fkey(id, full_name, avatar_url),
           media_post_files(*),
           media_post_teams(team_id, teams(name)),
           media_likes(user_id),
           media_comments(id),
           match:tournament_matches(
             id, matchday, kickoff_at,
             home:tournament_teams!tournament_matches_home_team_id_fkey(name, is_our_team),
             away:tournament_teams!tournament_matches_away_team_id_fkey(name, is_our_team)
           )`,
        )
        .eq("club_id", clubId)
        .order("published_at", { ascending: false });
      if (error) throw error;

      return (data ?? []).map((row: any): MediaPost => {
        const m = row.match;
        const rival = m
          ? m.home?.is_our_team
            ? (m.away?.name ?? null)
            : (m.home?.name ?? null)
          : null;
        return {
          ...row,
          files: [...(row.media_post_files ?? [])].sort(
            (a: MediaFile, b: MediaFile) => a.sort_order - b.sort_order,
          ),
          teams: (row.media_post_teams ?? []).map((t: any) => ({
            team_id: t.team_id,
            name: t.teams?.name ?? null,
          })),
          match: m ? { id: m.id, matchday: m.matchday, kickoff_at: m.kickoff_at, rival } : null,
          likeCount: (row.media_likes ?? []).length,
          liked: (row.media_likes ?? []).some((l: any) => l.user_id === userId),
          commentCount: (row.media_comments ?? []).length,
        };
      });
    },
  });
}

export function useMediaComments(postId: string | null | undefined) {
  return useQuery({
    queryKey: ["media-comments", postId ?? "none"],
    enabled: !!postId,
    queryFn: async (): Promise<MediaComment[]> => {
      const { data, error } = await db
        .from("media_comments")
        .select("*, author:profiles!media_comments_user_id_fkey(id, full_name, avatar_url)")
        .eq("post_id", postId)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as MediaComment[];
    },
  });
}

/** URLs firmadas de varios archivos privados (una sola llamada). */
export function useMediaUrls(paths: string[]) {
  const key = [...paths].sort().join("|");
  return useQuery({
    queryKey: ["media-urls", key],
    enabled: paths.length > 0,
    staleTime: 45 * 60_000,
    queryFn: async (): Promise<Record<string, string>> => {
      const unique = [...new Set(paths)];
      const { data, error } = await supabase.storage
        .from(MEDIA_BUCKET)
        .createSignedUrls(unique, 3600);
      if (error) throw error;
      const map: Record<string, string> = {};
      for (const item of data ?? []) {
        if (item.path && item.signedUrl) map[item.path] = item.signedUrl;
      }
      return map;
    },
  });
}

/** Descarga forzada de un archivo privado. */
export async function downloadMediaFile(file: MediaFile) {
  const { data, error } = await supabase.storage.from(MEDIA_BUCKET).download(file.storage_path);
  if (error) throw error;
  const url = URL.createObjectURL(data);
  const a = document.createElement("a");
  a.href = url;
  a.download = file.file_name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/* ------------------------------------------------------------------ */
/* Mutaciones                                                          */
/* ------------------------------------------------------------------ */

export function useSaveMediaPost() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: MediaPostInput) => {
      const payload = {
        club_id: input.club_id,
        title: input.title,
        description: input.description,
        type: input.type,
        audience: input.audience,
        match_id: input.type === "partido" ? input.match_id : null,
        published_at: input.published_at,
      };

      let id = input.id;
      if (id) {
        const { error } = await db.from("media_posts").update(payload).eq("id", id);
        if (error) throw error;
        const { error: delErr } = await db.from("media_post_teams").delete().eq("post_id", id);
        if (delErr) throw delErr;
      } else {
        const { data, error } = await db
          .from("media_posts")
          .insert({ ...payload, author_id: input.author_id })
          .select("id")
          .single();
        if (error) throw error;
        id = data.id as string;

        if (input.files?.length) {
          const { error: fErr } = await db.from("media_post_files").insert(
            input.files.map((f, i) => ({ ...f, post_id: id, sort_order: i })),
          );
          if (fErr) throw fErr;
        }
      }

      if (input.audience === "teams" && input.teamIds.length) {
        const { error } = await db
          .from("media_post_teams")
          .insert(input.teamIds.map((team_id) => ({ post_id: id, team_id })));
        if (error) throw error;
      }
      return id!;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["media-posts"] }),
  });
}

export function useDeleteMediaPost() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (post: MediaPost) => {
      const paths = post.files.map((f) => f.storage_path);
      const { error } = await db.from("media_posts").delete().eq("id", post.id);
      if (error) throw error;
      if (paths.length) await supabase.storage.from(MEDIA_BUCKET).remove(paths);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["media-posts"] }),
  });
}

export function useToggleMediaLike(userId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (post: MediaPost) => {
      if (post.liked) {
        const { error } = await db
          .from("media_likes")
          .delete()
          .eq("post_id", post.id)
          .eq("user_id", userId);
        if (error) throw error;
      } else {
        const { error } = await db
          .from("media_likes")
          .insert({ post_id: post.id, user_id: userId });
        if (error) throw error;
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["media-posts"] }),
  });
}

export function useAddMediaComment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (v: { post_id: string; user_id: string; body: string }) => {
      const { error } = await db.from("media_comments").insert(v);
      if (error) throw error;
    },
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: ["media-comments", v.post_id] });
      qc.invalidateQueries({ queryKey: ["media-posts"] });
    },
  });
}

export function useDeleteMediaComment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (c: MediaComment) => {
      const { error } = await db.from("media_comments").delete().eq("id", c.id);
      if (error) throw error;
    },
    onSuccess: (_d, c) => {
      qc.invalidateQueries({ queryKey: ["media-comments", c.post_id] });
      qc.invalidateQueries({ queryKey: ["media-posts"] });
    },
  });
}

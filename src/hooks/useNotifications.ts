import * as React from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface NotificationRow {
  id: string;
  club_id: string;
  user_id: string;
  type: string;
  title: string;
  body: string | null;
  related_module: string | null;
  related_id: string | null;
  read_at: string | null;
  created_at: string;
  /** "direct" = aviso personal, "broadcast" = comunicado general. */
  audience: string;
}

const KEY = (userId: string) => ["notifications", userId] as const;

export function useNotifications(userId: string | null | undefined) {
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: KEY(userId ?? "none"),
    enabled: !!userId,
    staleTime: 15_000,
    queryFn: async (): Promise<NotificationRow[]> => {
      const { data, error } = await supabase
        .from("notifications")
        .select("id, club_id, user_id, type, title, body, related_module, related_id, read_at, created_at, audience")
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return (data ?? []) as NotificationRow[];
    },
  });

  React.useEffect(() => {
    if (!userId) return;
    // Nombre único por montaje: evita reutilizar un canal ya suscrito (StrictMode / remount).
    const channel = supabase
      .channel(`notifications-${userId}-${Math.random().toString(36).slice(2)}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "notifications", filter: `user_id=eq.${userId}` },
        () => qc.invalidateQueries({ queryKey: KEY(userId) }),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, qc]);

  const items = query.data ?? [];
  const unread = React.useMemo(() => items.filter((n) => !n.read_at), [items]);
  const read = React.useMemo(() => items.filter((n) => !!n.read_at), [items]);
  const unreadCount = unread.length;

  const markRead = React.useCallback(
    async (id: string) => {
      if (!userId) return;
      qc.setQueryData<NotificationRow[]>(KEY(userId), (prev) =>
        (prev ?? []).map((n) => (n.id === id ? { ...n, read_at: n.read_at ?? new Date().toISOString() } : n)),
      );
      await supabase.from("notifications").update({ read_at: new Date().toISOString() }).eq("id", id).is("read_at", null);
      qc.invalidateQueries({ queryKey: KEY(userId) });
    },
    [qc, userId],
  );

  const markAllRead = React.useCallback(async () => {
    if (!userId) return;
    const now = new Date().toISOString();
    qc.setQueryData<NotificationRow[]>(KEY(userId), (prev) =>
      (prev ?? []).map((n) => (n.read_at ? n : { ...n, read_at: now })),
    );
    await supabase.from("notifications").update({ read_at: now }).eq("user_id", userId).is("read_at", null);
    qc.invalidateQueries({ queryKey: KEY(userId) });
  }, [qc, userId]);

  return { ...query, items, unread, read, unreadCount, markRead, markAllRead };
}

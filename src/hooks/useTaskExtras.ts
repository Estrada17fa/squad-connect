import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { TaskStatus } from "@/hooks/useCoordinacion";

export const EVIDENCE_BUCKET = "task-evidence";

export interface TaskComment {
  id: string;
  task_id: string;
  user_id: string;
  body: string;
  image_path: string | null;
  is_evidence: boolean;
  created_at: string;
  edited_at: string | null;
  author: { id: string; full_name: string | null; avatar_url: string | null; email: string | null } | null;
  image_url: string | null;
}

export const commentsKey = (taskId: string) => ["task-comments", taskId] as const;

export function useTaskComments(taskId: string | null | undefined) {
  return useQuery({
    queryKey: commentsKey(taskId ?? "none"),
    enabled: !!taskId,
    queryFn: async (): Promise<TaskComment[]> => {
      const { data, error } = await supabase
        .from("task_comments")
        .select("id, task_id, user_id, body, image_path, is_evidence, created_at, edited_at")
        .eq("task_id", taskId!)
        .order("created_at", { ascending: true });
      if (error) throw error;
      const rows = data ?? [];
      const ids = [...new Set(rows.map((r) => r.user_id))];
      const paths = rows.map((r) => r.image_path).filter((p): p is string => !!p);
      const [profilesRes, urlsRes] = await Promise.all([
        ids.length ? supabase.from("profiles").select("id, full_name, avatar_url, email").in("id", ids) : Promise.resolve({ data: [] as any[] }),
        paths.length ? supabase.storage.from(EVIDENCE_BUCKET).createSignedUrls(paths, 3600) : Promise.resolve({ data: [] as any[] }),
      ]);
      const pmap = new Map((profilesRes.data ?? []).map((p: any) => [p.id, p]));
      const umap = new Map((urlsRes.data ?? []).map((u: any) => [u.path, u.signedUrl]));
      return rows.map((r) => ({
        ...r,
        author: (pmap.get(r.user_id) as TaskComment["author"]) ?? null,
        image_url: r.image_path ? (umap.get(r.image_path) ?? null) : null,
      }));
    },
  });
}

function extOf(file: File) {
  const fromName = file.name.split(".").pop()?.toLowerCase();
  if (fromName && fromName.length <= 5) return fromName;
  return file.type.split("/")[1] ?? "jpg";
}

/** Sube la foto y crea el comentario. Si el comentario falla, borra la foto para no dejarla huérfana. */
export async function insertComment(opts: { taskId: string; userId: string; body: string; file?: File | null; isEvidence?: boolean }) {
  let path: string | null = null;
  if (opts.file) {
    path = `${opts.taskId}/${crypto.randomUUID()}.${extOf(opts.file)}`;
    const up = await supabase.storage.from(EVIDENCE_BUCKET).upload(path, opts.file, { contentType: opts.file.type || "image/jpeg" });
    if (up.error) throw up.error;
  }
  const { error } = await supabase.from("task_comments").insert({
    task_id: opts.taskId,
    user_id: opts.userId,
    body: opts.body.trim(),
    image_path: path,
    is_evidence: !!(opts.isEvidence && path),
  });
  if (error) {
    if (path) await supabase.storage.from(EVIDENCE_BUCKET).remove([path]);
    throw error;
  }
}

export function useTaskMutations(clubId: string | null | undefined) {
  const qc = useQueryClient();
  const refresh = (taskId?: string) => {
    qc.invalidateQueries({ queryKey: ["coord-tasks", clubId ?? "none"] });
    qc.invalidateQueries({ queryKey: ["home-my-tasks"] });
    if (taskId) qc.invalidateQueries({ queryKey: commentsKey(taskId) });
  };

  const setStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: TaskStatus }) => {
      const { error } = await supabase.from("tasks").update({ status }).eq("id", id);
      if (error) throw new Error(error.message.includes("Sube una foto") ? "Sube una foto para completar" : error.message);
    },
    onSuccess: (_d, v) => refresh(v.id),
  });

  /** Sube la foto como evidencia y luego marca la tarea como hecha. */
  const completeWithEvidence = useMutation({
    mutationFn: async ({ taskId, userId, file }: { taskId: string; userId: string; file: File }) => {
      await insertComment({ taskId, userId, body: "", file, isEvidence: true });
      const { error } = await supabase.from("tasks").update({ status: "completada" }).eq("id", taskId);
      if (error) throw error;
    },
    onSuccess: (_d, v) => refresh(v.taskId),
  });

  const addComment = useMutation({
    mutationFn: insertComment,
    onSuccess: (_d, v) => refresh(v.taskId),
  });

  const editComment = useMutation({
    mutationFn: async ({ id, body }: { id: string; taskId: string; body: string }) => {
      const { error } = await supabase.from("task_comments").update({ body: body.trim() }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_d, v) => refresh(v.taskId),
  });

  /** Borra primero la foto del almacenamiento y luego el comentario. */
  const deleteComment = useMutation({
    mutationFn: async (c: Pick<TaskComment, "id" | "task_id" | "image_path">) => {
      if (c.image_path) {
        const rm = await supabase.storage.from(EVIDENCE_BUCKET).remove([c.image_path]);
        if (rm.error) throw rm.error;
      }
      const { error } = await supabase.from("task_comments").delete().eq("id", c.id);
      if (error) throw error;
    },
    onSuccess: (_d, v) => refresh(v.task_id),
  });

  /** Borra todas las fotos de la carpeta de la tarea y luego la tarea (los comentarios caen en cascada). */
  const deleteTask = useMutation({
    mutationFn: async (taskId: string) => {
      const { data: files, error: le } = await supabase.storage.from(EVIDENCE_BUCKET).list(taskId, { limit: 1000 });
      if (le) throw le;
      const paths = (files ?? []).map((f) => `${taskId}/${f.name}`);
      if (paths.length) {
        const rm = await supabase.storage.from(EVIDENCE_BUCKET).remove(paths);
        if (rm.error) throw rm.error;
      }
      const { error } = await supabase.from("tasks").delete().eq("id", taskId);
      if (error) throw error;
    },
    onSuccess: () => refresh(),
  });

  return { setStatus, completeWithEvidence, addComment, editComment, deleteComment, deleteTask, refresh };
}

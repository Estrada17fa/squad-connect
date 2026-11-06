ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS requires_evidence boolean NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS public.task_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  body text NOT NULL DEFAULT '',
  image_path text,
  is_evidence boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  edited_at timestamptz,
  CONSTRAINT task_comments_evidence_needs_image CHECK (NOT is_evidence OR image_path IS NOT NULL),
  CONSTRAINT task_comments_not_empty CHECK (btrim(body) <> '' OR image_path IS NOT NULL)
);
CREATE INDEX IF NOT EXISTS task_comments_task_idx ON public.task_comments(task_id, created_at);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.task_comments TO authenticated;
GRANT ALL ON public.task_comments TO service_role;
ALTER TABLE public.task_comments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS task_comments_select ON public.task_comments;
CREATE POLICY task_comments_select ON public.task_comments FOR SELECT TO authenticated
  USING (public.can_view_task(auth.uid(), task_id));
DROP POLICY IF EXISTS task_comments_insert ON public.task_comments;
CREATE POLICY task_comments_insert ON public.task_comments FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND (public.can_edit_task(auth.uid(), task_id) OR public.is_task_assignee(auth.uid(), task_id)));
DROP POLICY IF EXISTS task_comments_update ON public.task_comments;
CREATE POLICY task_comments_update ON public.task_comments FOR UPDATE TO authenticated
  USING (user_id = auth.uid() AND public.can_view_task(auth.uid(), task_id))
  WITH CHECK (user_id = auth.uid());
DROP POLICY IF EXISTS task_comments_delete ON public.task_comments;
CREATE POLICY task_comments_delete ON public.task_comments FOR DELETE TO authenticated
  USING (user_id = auth.uid() OR public.can_edit_task(auth.uid(), task_id));

-- Autor = usuario conectado; al editar solo cambia el texto.
CREATE OR REPLACE FUNCTION public.task_comments_guard()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF auth.uid() IS NOT NULL AND NEW.user_id IS DISTINCT FROM auth.uid() THEN
      RAISE EXCEPTION 'El autor del comentario debe ser el usuario conectado';
    END IF;
    NEW.edited_at := NULL;
  ELSE
    IF NEW.user_id IS DISTINCT FROM OLD.user_id OR NEW.task_id IS DISTINCT FROM OLD.task_id
       OR NEW.image_path IS DISTINCT FROM OLD.image_path OR NEW.is_evidence IS DISTINCT FROM OLD.is_evidence
       OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN
      RAISE EXCEPTION 'Solo se puede editar el texto del comentario';
    END IF;
    IF NEW.body IS DISTINCT FROM OLD.body THEN NEW.edited_at := now(); END IF;
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_task_comments_guard ON public.task_comments;
CREATE TRIGGER trg_task_comments_guard BEFORE INSERT OR UPDATE ON public.task_comments
  FOR EACH ROW EXECUTE FUNCTION public.task_comments_guard();

-- Aviso al comentar: responsables + creador, menos el autor.
CREATE OR REPLACE FUNCTION public.notify_task_comment()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE t RECORD; ids uuid[]; author text;
BEGIN
  SELECT club_id, title, created_by INTO t FROM public.tasks WHERE id = NEW.task_id;
  IF t IS NULL THEN RETURN NEW; END IF;
  SELECT array_agg(DISTINCT u) INTO ids FROM (
    SELECT user_id AS u FROM public.task_assignees WHERE task_id = NEW.task_id
    UNION SELECT t.created_by
  ) x WHERE u IS NOT NULL AND u <> NEW.user_id;
  IF ids IS NULL OR array_length(ids, 1) IS NULL THEN RETURN NEW; END IF;
  SELECT coalesce(nullif(btrim(coalesce(first_name,'') || ' ' || coalesce(last_name,'')), ''), 'Alguien') INTO author
    FROM public.profiles WHERE id = NEW.user_id;
  PERFORM public.notify_users(t.club_id, ids, 'tarea_comentario',
    coalesce(author, 'Alguien') || ' comentó en: ' || t.title,
    CASE WHEN btrim(NEW.body) <> '' THEN left(NEW.body, 140) ELSE 'Subió una foto' END,
    'coordinacion_interna', NEW.task_id);
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_notify_task_comment ON public.task_comments;
CREATE TRIGGER trg_notify_task_comment AFTER INSERT ON public.task_comments
  FOR EACH ROW EXECUTE FUNCTION public.notify_task_comment();

-- Bloqueo: no completar sin foto de evidencia cuando se pide.
CREATE OR REPLACE FUNCTION public.tasks_require_evidence()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.status = 'completada' AND OLD.status IS DISTINCT FROM 'completada' AND NEW.requires_evidence
     AND NOT EXISTS (SELECT 1 FROM public.task_comments c WHERE c.task_id = NEW.id AND c.is_evidence AND c.image_path IS NOT NULL) THEN
    RAISE EXCEPTION 'Sube una foto para completar';
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_tasks_require_evidence ON public.tasks;
CREATE TRIGGER trg_tasks_require_evidence BEFORE UPDATE OF status ON public.tasks
  FOR EACH ROW EXECUTE FUNCTION public.tasks_require_evidence();

-- Fotos: carpeta = id de la tarea.
DROP POLICY IF EXISTS task_evidence_select ON storage.objects;
CREATE POLICY task_evidence_select ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'task-evidence' AND public.can_view_task(auth.uid(), ((storage.foldername(name))[1])::uuid));
DROP POLICY IF EXISTS task_evidence_insert ON storage.objects;
CREATE POLICY task_evidence_insert ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'task-evidence' AND (public.can_edit_task(auth.uid(), ((storage.foldername(name))[1])::uuid) OR public.is_task_assignee(auth.uid(), ((storage.foldername(name))[1])::uuid)));
DROP POLICY IF EXISTS task_evidence_delete ON storage.objects;
CREATE POLICY task_evidence_delete ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'task-evidence' AND (owner = auth.uid() OR public.can_edit_task(auth.uid(), ((storage.foldername(name))[1])::uuid)));
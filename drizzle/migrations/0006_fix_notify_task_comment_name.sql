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
  SELECT nullif(btrim(coalesce(full_name, '')), '') INTO author FROM public.profiles WHERE id = NEW.user_id;
  PERFORM public.notify_users(t.club_id, ids, 'tarea_comentario',
    coalesce(author, 'Alguien') || ' comentó en: ' || t.title,
    CASE WHEN btrim(NEW.body) <> '' THEN left(NEW.body, 140) ELSE 'Subió una foto' END,
    'coordinacion_interna', NEW.task_id);
  RETURN NEW;
END $$;
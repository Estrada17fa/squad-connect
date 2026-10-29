-- 1) Interruptor "Todas las categorías"
ALTER TABLE public.roles ADD COLUMN IF NOT EXISTS default_all_categories boolean NOT NULL DEFAULT false;
UPDATE public.roles SET default_all_categories = COALESCE(allows_club_wide, false);
COMMENT ON COLUMN public.roles.allows_club_wide IS 'DEPRECATED: replaced by default_all_categories';

CREATE TABLE public.member_all_categories (
  club_id uuid NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role_id uuid NOT NULL REFERENCES public.roles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (club_id, user_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.member_all_categories TO authenticated;
GRANT ALL ON public.member_all_categories TO service_role;
ALTER TABLE public.member_all_categories ENABLE ROW LEVEL SECURITY;

-- 2) Helpers "todas las categorías"
CREATE OR REPLACE FUNCTION public.level_all_teams(_user_id uuid, _club_id uuid, _module_key text)
RETURNS public.permission_level LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT CASE
    WHEN public.is_super_admin(_user_id) THEN 'editor_global'::public.permission_level
    ELSE COALESCE((SELECT min(public.effective_permission(_user_id, _module_key, t.id))
                     FROM public.teams t WHERE t.club_id = _club_id), 'sin_acceso'::public.permission_level)
  END
$$;

CREATE OR REPLACE FUNCTION public.can_edit_all_teams(_user_id uuid, _club_id uuid, _module_key text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT public.has_club_access(_user_id, _club_id)
     AND public.level_all_teams(_user_id, _club_id, _module_key) IN ('editor_categoria','editor_global')
$$;

-- 3) effective_permission sin ampliación club_wide ni rama global
CREATE OR REPLACE FUNCTION public.effective_permission(_user_id uuid, _module_key text, _team_id uuid)
RETURNS public.permission_level LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT CASE
    WHEN EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = _user_id AND p.status = 'baja'::public.member_status)
      THEN 'sin_acceso'::public.permission_level
    WHEN public.is_super_admin(_user_id) THEN 'editor_global'::public.permission_level
    WHEN _team_id IS NOT NULL AND NOT public.has_club_access(
           _user_id, (SELECT t.club_id FROM public.teams t WHERE t.id = _team_id))
      THEN 'sin_acceso'::public.permission_level
    ELSE COALESCE(
      (SELECT o.level FROM public.user_permission_overrides o
        WHERE o.user_id = _user_id AND o.module_key = _module_key
          AND _team_id IS NOT NULL AND o.team_id = _team_id LIMIT 1),
      (SELECT o.level FROM public.user_permission_overrides o
        WHERE o.user_id = _user_id AND o.module_key = _module_key AND o.team_id IS NULL LIMIT 1),
      (SELECT max(rp.level) FROM public.team_memberships tm
        JOIN public.role_permissions rp ON rp.role_id = tm.role_id AND rp.module_key = _module_key
        WHERE tm.user_id = _user_id AND tm.team_id IS NOT NULL
          AND (_team_id IS NULL OR tm.team_id = _team_id)),
      'sin_acceso'::public.permission_level)
  END
$$;

-- 4) Umbrales globales -> categoría
-- temporal hasta que el módulo tenga categoría por registro
CREATE OR REPLACE FUNCTION public.can_view_compras(_user_id uuid, _club_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT public.has_club_access(_user_id, _club_id)
     AND (public.is_super_admin(_user_id)
          OR public.max_permission_any_team(_user_id, 'compras_facturas')
             IN ('lector_categoria','lector_global','editor_categoria','editor_global'))
$$;
-- temporal hasta que el módulo tenga categoría por registro
CREATE OR REPLACE FUNCTION public.can_edit_compras(_user_id uuid, _club_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT public.has_club_access(_user_id, _club_id)
     AND (public.is_super_admin(_user_id)
          OR public.max_permission_any_team(_user_id, 'compras_facturas') IN ('editor_categoria','editor_global'))
$$;
-- temporal hasta que el módulo tenga categoría por registro
CREATE OR REPLACE FUNCTION public.can_view_users(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT public.is_super_admin(_user_id)
      OR public.effective_permission(_user_id, 'usuarios', NULL)
         IN ('lector_categoria','lector_global','editor_categoria','editor_global')
$$;
-- temporal hasta que el módulo tenga categoría por registro
CREATE OR REPLACE FUNCTION public.is_user_admin(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT public.is_super_admin(_user_id)
      OR public.effective_permission(_user_id, 'usuarios', NULL) IN ('editor_categoria','editor_global')
$$;

CREATE OR REPLACE FUNCTION public.has_team_access(_user_id uuid, _team_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT EXISTS (SELECT 1 FROM public.team_memberships tm WHERE tm.user_id = _user_id AND tm.team_id = _team_id)
$$;
CREATE OR REPLACE FUNCTION public.has_team_scope(_user_id uuid, _team_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT public.is_super_admin(_user_id)
      OR EXISTS (SELECT 1 FROM public.team_memberships tm WHERE tm.user_id = _user_id AND tm.team_id = _team_id)
$$;
CREATE OR REPLACE FUNCTION public.has_module_approver_any(_user_id uuid, _module_key text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.team_memberships tm
    JOIN public.roles r ON r.id = tm.role_id
    JOIN public.role_permissions rp ON rp.role_id = tm.role_id
    JOIN public.teams t ON t.id = tm.team_id
    WHERE tm.user_id = _user_id AND rp.module_key = _module_key AND rp.access_level = 'approver'
      AND r.club_id = public.get_user_club_id(_user_id)
      AND t.club_id = public.get_user_club_id(_user_id))
$$;

-- Comunicados / multimedia: ve con Ver en al menos una de sus categorías; edita con Editar en TODAS
CREATE OR REPLACE FUNCTION public.can_view_team_announcement(_user_id uuid, _team_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT public.can_view_module(_user_id, 'comunicados', _team_id) AND public.has_team_scope(_user_id, _team_id)
$$;
CREATE OR REPLACE FUNCTION public.can_edit_team_announcement(_user_id uuid, _team_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT public.can_edit_module(_user_id, 'comunicados', _team_id) AND public.has_team_scope(_user_id, _team_id)
$$;
CREATE OR REPLACE FUNCTION public.can_view_team_media(_user_id uuid, _team_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT public.can_view_module(_user_id, 'multimedia', _team_id) AND public.has_team_scope(_user_id, _team_id)
$$;
CREATE OR REPLACE FUNCTION public.can_edit_team_media(_user_id uuid, _team_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT public.can_edit_module(_user_id, 'multimedia', _team_id) AND public.has_team_scope(_user_id, _team_id)
$$;
CREATE OR REPLACE FUNCTION public.can_edit_announcement(_user_id uuid, _announcement_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.announcements a
    WHERE a.id = _announcement_id
      AND (a.author_id = _user_id
        OR (a.audience = 'club' AND public.can_edit_all_teams(_user_id, a.club_id, 'comunicados'))
        OR (a.audience = 'teams'
            AND EXISTS (SELECT 1 FROM public.announcement_teams t WHERE t.announcement_id = a.id)
            AND NOT EXISTS (SELECT 1 FROM public.announcement_teams t
                            WHERE t.announcement_id = a.id
                              AND NOT public.can_edit_team_announcement(_user_id, t.team_id)))))
$$;
CREATE OR REPLACE FUNCTION public.can_edit_media_post(_user_id uuid, _post_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.media_posts p
    WHERE p.id = _post_id
      AND public.has_club_access(_user_id, p.club_id)
      AND ((p.author_id = _user_id
            AND public.max_permission_any_team(_user_id, 'multimedia') IN ('editor_categoria','editor_global'))
        OR (p.audience = 'club' AND public.can_edit_all_teams(_user_id, p.club_id, 'multimedia'))
        OR (p.audience = 'teams'
            AND EXISTS (SELECT 1 FROM public.media_post_teams t WHERE t.post_id = p.id)
            AND NOT EXISTS (SELECT 1 FROM public.media_post_teams t
                            WHERE t.post_id = p.id AND NOT public.can_edit_team_media(_user_id, t.team_id)))))
$$;

-- Coordinación / solicitudes: registro de todo el club = todas las categorías
CREATE OR REPLACE FUNCTION public.coord_scope_ok(_user_id uuid, _team_id uuid, _min_edit boolean)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT CASE
    WHEN public.is_super_admin(_user_id) THEN true
    WHEN _team_id IS NULL THEN
      CASE WHEN _min_edit
        THEN public.can_edit_all_teams(_user_id, public.get_user_club_id(_user_id), 'coordinacion_interna')
        ELSE public.max_permission_any_team(_user_id, 'coordinacion_interna')
             IN ('lector_categoria','lector_global','editor_categoria','editor_global')
      END
    ELSE public.has_team_scope(_user_id, _team_id) AND
      CASE WHEN _min_edit
        THEN public.effective_permission(_user_id, 'coordinacion_interna', _team_id) IN ('editor_categoria','editor_global')
        ELSE public.effective_permission(_user_id, 'coordinacion_interna', _team_id)
             IN ('lector_categoria','lector_global','editor_categoria','editor_global')
      END
  END
$$;
CREATE OR REPLACE FUNCTION public.request_scope_ok(_user_id uuid, _team_id uuid, _min_edit boolean)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT CASE
    WHEN public.is_super_admin(_user_id) THEN true
    WHEN _team_id IS NULL THEN
      CASE WHEN _min_edit
        THEN public.can_edit_all_teams(_user_id, public.get_user_club_id(_user_id), 'solicitudes')
        ELSE public.max_permission_any_team(_user_id, 'solicitudes')
             IN ('lector_categoria','lector_global','editor_categoria','editor_global')
      END
    ELSE public.has_team_scope(_user_id, _team_id) AND
      CASE WHEN _min_edit
        THEN public.effective_permission(_user_id, 'solicitudes', _team_id) IN ('editor_categoria','editor_global')
        ELSE public.effective_permission(_user_id, 'solicitudes', _team_id)
             IN ('lector_categoria','lector_global','editor_categoria','editor_global')
      END
  END
$$;

CREATE OR REPLACE FUNCTION public.training_level(_user_id uuid, _team_id uuid)
RETURNS public.access_level LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE
  v_club uuid;
  v_lvl public.access_level := 'none';
  v_o public.access_level;
BEGIN
  IF _user_id IS NULL THEN RETURN 'none'; END IF;
  IF public.is_super_admin(_user_id) THEN RETURN 'approver'; END IF;
  v_club := public.get_user_club_id(_user_id);
  IF v_club IS NULL THEN RETURN 'none'; END IF;
  IF _team_id IS NOT NULL AND NOT EXISTS (
      SELECT 1 FROM public.teams t WHERE t.id = _team_id AND t.club_id = v_club) THEN
    RETURN 'none';
  END IF;
  v_lvl := COALESCE((
    SELECT CASE max(CASE rp.access_level
                 WHEN 'approver' THEN 3 WHEN 'editor' THEN 2 WHEN 'read' THEN 1 ELSE 0 END)
             WHEN 3 THEN 'approver'::public.access_level
             WHEN 2 THEN 'editor'::public.access_level
             WHEN 1 THEN 'read'::public.access_level
             ELSE 'none'::public.access_level END
    FROM public.team_memberships tm
    JOIN public.role_permissions rp ON rp.role_id = tm.role_id
    WHERE tm.user_id = _user_id AND rp.module_key = 'entrenamientos'
      AND tm.team_id IS NOT NULL AND (_team_id IS NULL OR tm.team_id = _team_id)
  ), 'none');
  SELECT o.access_level INTO v_o FROM public.user_permission_overrides o
   WHERE o.user_id = _user_id AND o.module_key = 'entrenamientos' AND o.team_id IS NULL LIMIT 1;
  IF v_o IS NOT NULL THEN v_lvl := v_o; END IF;
  IF _team_id IS NOT NULL THEN
    SELECT o.access_level INTO v_o FROM public.user_permission_overrides o
     WHERE o.user_id = _user_id AND o.module_key = 'entrenamientos' AND o.team_id = _team_id LIMIT 1;
    IF v_o IS NOT NULL THEN v_lvl := v_o; END IF;
  END IF;
  RETURN COALESCE(v_lvl, 'none');
END;
$$;

-- 5) Políticas
DROP POLICY IF EXISTS announcements_insert ON public.announcements;
CREATE POLICY announcements_insert ON public.announcements FOR INSERT TO authenticated
WITH CHECK (author_id = auth.uid() AND club_id = public.get_user_club_id(auth.uid()) AND
  CASE WHEN audience = 'club' THEN public.can_edit_all_teams(auth.uid(), club_id, 'comunicados')
       ELSE public.can_edit_module(auth.uid(), 'comunicados', NULL) END);
DROP POLICY IF EXISTS announcements_update ON public.announcements;
CREATE POLICY announcements_update ON public.announcements FOR UPDATE TO authenticated
USING (public.can_edit_announcement(auth.uid(), id))
WITH CHECK (author_id = auth.uid()
  OR (audience = 'club' AND public.can_edit_all_teams(auth.uid(), club_id, 'comunicados'))
  OR (audience = 'teams' AND public.can_edit_module(auth.uid(), 'comunicados', NULL)));
DROP POLICY IF EXISTS announcements_delete ON public.announcements;
CREATE POLICY announcements_delete ON public.announcements FOR DELETE TO authenticated
USING (public.can_edit_announcement(auth.uid(), id));

DROP POLICY IF EXISTS media_posts_insert ON public.media_posts;
CREATE POLICY media_posts_insert ON public.media_posts FOR INSERT TO authenticated
WITH CHECK (author_id = auth.uid() AND public.has_club_access(auth.uid(), club_id)
  AND public.max_permission_any_team(auth.uid(), 'multimedia') IN ('editor_categoria','editor_global')
  AND (audience = 'teams' OR public.can_edit_all_teams(auth.uid(), club_id, 'multimedia')));

DROP POLICY IF EXISTS calendar_events_insert ON public.calendar_events;
CREATE POLICY calendar_events_insert ON public.calendar_events FOR INSERT TO authenticated
WITH CHECK (public.has_club_access(auth.uid(), club_id) AND
  CASE WHEN team_id IS NULL THEN public.can_edit_all_teams(auth.uid(), club_id, 'agenda')
  ELSE (public.can_edit_module(auth.uid(), 'agenda', team_id)
        OR (event_type = 'entrenamiento' AND public.can_edit_module(auth.uid(), 'entrenamientos', team_id))) END);
DROP POLICY IF EXISTS calendar_events_update ON public.calendar_events;
CREATE POLICY calendar_events_update ON public.calendar_events FOR UPDATE TO authenticated
USING (CASE WHEN team_id IS NULL THEN public.can_edit_all_teams(auth.uid(), club_id, 'agenda')
  ELSE (public.can_edit_module(auth.uid(), 'agenda', team_id)
        OR (event_type = 'entrenamiento' AND public.can_edit_module(auth.uid(), 'entrenamientos', team_id))) END)
WITH CHECK (public.has_club_access(auth.uid(), club_id) AND
  CASE WHEN team_id IS NULL THEN public.can_edit_all_teams(auth.uid(), club_id, 'agenda')
  ELSE (public.can_edit_module(auth.uid(), 'agenda', team_id)
        OR (event_type = 'entrenamiento' AND public.can_edit_module(auth.uid(), 'entrenamientos', team_id))) END);
DROP POLICY IF EXISTS calendar_events_delete ON public.calendar_events;
CREATE POLICY calendar_events_delete ON public.calendar_events FOR DELETE TO authenticated
USING (CASE WHEN team_id IS NULL THEN public.can_edit_all_teams(auth.uid(), club_id, 'agenda')
  ELSE (public.can_edit_module(auth.uid(), 'agenda', team_id)
        OR (event_type = 'entrenamiento' AND public.can_edit_module(auth.uid(), 'entrenamientos', team_id))) END);

DROP POLICY IF EXISTS documents_insert ON public.documents;
CREATE POLICY documents_insert ON public.documents FOR INSERT TO authenticated
WITH CHECK (public.has_club_access(auth.uid(), club_id) AND
  CASE WHEN team_id IS NULL THEN public.can_edit_all_teams(auth.uid(), club_id, 'documentos')
  ELSE public.can_edit_module(auth.uid(), 'documentos', team_id) END);
DROP POLICY IF EXISTS documents_update ON public.documents;
CREATE POLICY documents_update ON public.documents FOR UPDATE TO authenticated
USING (public.has_club_access(auth.uid(), club_id) AND
  CASE WHEN team_id IS NULL THEN public.can_edit_all_teams(auth.uid(), club_id, 'documentos')
  ELSE public.can_edit_module(auth.uid(), 'documentos', team_id) END)
WITH CHECK (public.has_club_access(auth.uid(), club_id) AND
  CASE WHEN team_id IS NULL THEN public.can_edit_all_teams(auth.uid(), club_id, 'documentos')
  ELSE public.can_edit_module(auth.uid(), 'documentos', team_id) END);
DROP POLICY IF EXISTS documents_delete ON public.documents;
CREATE POLICY documents_delete ON public.documents FOR DELETE TO authenticated
USING (public.has_club_access(auth.uid(), club_id) AND
  CASE WHEN team_id IS NULL THEN public.can_edit_all_teams(auth.uid(), club_id, 'documentos')
  ELSE public.can_edit_module(auth.uid(), 'documentos', team_id) END);
DROP POLICY IF EXISTS documents_select ON public.documents;
CREATE POLICY documents_select ON public.documents FOR SELECT TO authenticated
USING (public.has_club_access(auth.uid(), club_id) AND (
  related_user_id = auth.uid()
  OR (related_user_id IS NULL AND CASE WHEN team_id IS NULL
        THEN public.can_view_club_module(auth.uid(), club_id, 'documentos')
        ELSE public.can_view_module(auth.uid(), 'documentos', team_id) END)
  OR (related_user_id IS NOT NULL AND CASE WHEN team_id IS NULL
        THEN public.can_edit_all_teams(auth.uid(), club_id, 'documentos')
        ELSE public.can_edit_module(auth.uid(), 'documentos', team_id) END)));

DROP POLICY IF EXISTS role_perms_write_own_club ON public.role_permissions;
CREATE POLICY role_perms_write_own_club ON public.role_permissions FOR ALL TO authenticated
USING (public.is_super_admin(auth.uid()) OR (
  public.max_permission_any_team(auth.uid(), 'usuarios') IN ('editor_categoria','editor_global')
  AND EXISTS (SELECT 1 FROM public.roles r WHERE r.id = role_permissions.role_id AND r.club_id = public.get_user_club_id(auth.uid()))
  AND NOT EXISTS (SELECT 1 FROM public.team_memberships tm WHERE tm.user_id = auth.uid() AND tm.role_id = role_permissions.role_id)))
WITH CHECK (public.is_super_admin(auth.uid()) OR (
  public.max_permission_any_team(auth.uid(), 'usuarios') IN ('editor_categoria','editor_global')
  AND EXISTS (SELECT 1 FROM public.roles r WHERE r.id = role_permissions.role_id AND r.club_id = public.get_user_club_id(auth.uid()))
  AND NOT EXISTS (SELECT 1 FROM public.team_memberships tm WHERE tm.user_id = auth.uid() AND tm.role_id = role_permissions.role_id)));

CREATE POLICY mac_select ON public.member_all_categories FOR SELECT TO authenticated
USING (user_id = auth.uid() OR (public.has_club_access(auth.uid(), club_id) AND public.can_view_users(auth.uid())));
CREATE POLICY mac_write ON public.member_all_categories FOR ALL TO authenticated
USING (public.has_club_access(auth.uid(), club_id) AND public.is_user_admin(auth.uid()))
WITH CHECK (public.has_club_access(auth.uid(), club_id) AND public.is_user_admin(auth.uid())
  AND EXISTS (SELECT 1 FROM public.roles r WHERE r.id = role_id AND r.club_id = member_all_categories.club_id));

-- 6) Trigger: categoría nueva -> membresías de quien tiene el interruptor
CREATE OR REPLACE FUNCTION public.teams_assign_all_categories()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  INSERT INTO public.team_memberships (user_id, team_id, role_id, job_title)
  SELECT m.user_id, NEW.id, m.role_id,
         (SELECT tm.job_title FROM public.team_memberships tm
           WHERE tm.user_id = m.user_id AND tm.job_title IS NOT NULL LIMIT 1)
    FROM public.member_all_categories m
   WHERE m.club_id = NEW.club_id
     AND NOT EXISTS (SELECT 1 FROM public.team_memberships x WHERE x.user_id = m.user_id AND x.team_id = NEW.id);
  RETURN NEW;
END;
$$;
CREATE TRIGGER teams_assign_all_categories AFTER INSERT ON public.teams
FOR EACH ROW EXECUTE FUNCTION public.teams_assign_all_categories();

-- 7) Migrar los Admin sin categoría (misma transacción)
INSERT INTO public.member_all_categories (club_id, user_id, role_id)
SELECT r.club_id, tm.user_id, tm.role_id
  FROM public.team_memberships tm JOIN public.roles r ON r.id = tm.role_id
 WHERE tm.team_id IS NULL
ON CONFLICT DO NOTHING;

INSERT INTO public.team_memberships (user_id, team_id, role_id, job_title)
SELECT tm.user_id, t.id, tm.role_id, tm.job_title
  FROM public.team_memberships tm
  JOIN public.roles r ON r.id = tm.role_id
  JOIN public.teams t ON t.club_id = r.club_id
 WHERE tm.team_id IS NULL
   AND NOT EXISTS (SELECT 1 FROM public.team_memberships x WHERE x.user_id = tm.user_id AND x.team_id = t.id);

DELETE FROM public.team_memberships tm
 WHERE tm.team_id IS NULL
   AND EXISTS (SELECT 1 FROM public.member_all_categories m WHERE m.user_id = tm.user_id);

-- 8) Acceso de más detectado: Edson no debe entrar a Compras (decisión del usuario)
UPDATE public.user_permission_overrides o SET level = 'sin_acceso'
  FROM public.profiles p
 WHERE p.id = o.user_id AND p.full_name = 'Edson Antonio Alvarado García'
   AND o.module_key = 'compras_facturas' AND o.team_id IS NULL;

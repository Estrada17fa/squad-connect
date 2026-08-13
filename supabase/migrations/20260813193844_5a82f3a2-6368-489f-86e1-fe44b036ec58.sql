DROP POLICY IF EXISTS announcements_select ON public.announcements;
DROP POLICY IF EXISTS announcements_update ON public.announcements;
DROP POLICY IF EXISTS announcements_delete ON public.announcements;

CREATE POLICY announcements_select ON public.announcements
FOR SELECT TO authenticated
USING (
  author_id = auth.uid()
  OR (audience = 'club'::public.announcement_audience
      AND public.can_view_module(auth.uid(), 'comunicados', NULL))
  OR EXISTS (
    SELECT 1 FROM public.announcement_teams t
    WHERE t.announcement_id = announcements.id
      AND public.can_view_team_announcement(auth.uid(), t.team_id)
  )
);

CREATE POLICY announcements_update ON public.announcements
FOR UPDATE TO authenticated
USING (
  author_id = auth.uid()
  OR public.effective_permission(auth.uid(), 'comunicados', NULL) = 'editor_global'::public.permission_level
  OR (
    audience = 'teams'::public.announcement_audience
    AND EXISTS (SELECT 1 FROM public.announcement_teams t WHERE t.announcement_id = announcements.id)
    AND NOT EXISTS (
      SELECT 1 FROM public.announcement_teams t
      WHERE t.announcement_id = announcements.id
        AND NOT public.can_edit_team_announcement(auth.uid(), t.team_id)
    )
  )
)
WITH CHECK (
  author_id = auth.uid()
  OR public.effective_permission(auth.uid(), 'comunicados', NULL) = 'editor_global'::public.permission_level
  OR (
    audience = 'teams'::public.announcement_audience
    AND EXISTS (SELECT 1 FROM public.announcement_teams t WHERE t.announcement_id = announcements.id)
    AND NOT EXISTS (
      SELECT 1 FROM public.announcement_teams t
      WHERE t.announcement_id = announcements.id
        AND NOT public.can_edit_team_announcement(auth.uid(), t.team_id)
    )
  )
);

CREATE POLICY announcements_delete ON public.announcements
FOR DELETE TO authenticated
USING (
  author_id = auth.uid()
  OR public.effective_permission(auth.uid(), 'comunicados', NULL) = 'editor_global'::public.permission_level
  OR (
    audience = 'teams'::public.announcement_audience
    AND EXISTS (SELECT 1 FROM public.announcement_teams t WHERE t.announcement_id = announcements.id)
    AND NOT EXISTS (
      SELECT 1 FROM public.announcement_teams t
      WHERE t.announcement_id = announcements.id
        AND NOT public.can_edit_team_announcement(auth.uid(), t.team_id)
    )
  )
);

CREATE OR REPLACE FUNCTION public.can_view_announcement(_user_id uuid, _announcement_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.announcements a
    WHERE a.id = _announcement_id
      AND (
        a.author_id = _user_id
        OR (a.audience = 'club' AND public.can_view_module(_user_id, 'comunicados', NULL))
        OR EXISTS (
          SELECT 1 FROM public.announcement_teams t
          WHERE t.announcement_id = a.id
            AND public.can_view_team_announcement(_user_id, t.team_id)
        )
      )
  )
$function$;

CREATE OR REPLACE FUNCTION public.can_edit_announcement(_user_id uuid, _announcement_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.announcements a
    WHERE a.id = _announcement_id
      AND (
        a.author_id = _user_id
        OR public.effective_permission(_user_id, 'comunicados', NULL) = 'editor_global'
        OR (
          a.audience = 'teams'
          AND EXISTS (SELECT 1 FROM public.announcement_teams t WHERE t.announcement_id = a.id)
          AND NOT EXISTS (
            SELECT 1 FROM public.announcement_teams t
            WHERE t.announcement_id = a.id
              AND NOT public.can_edit_team_announcement(_user_id, t.team_id)
          )
        )
      )
  )
$function$;
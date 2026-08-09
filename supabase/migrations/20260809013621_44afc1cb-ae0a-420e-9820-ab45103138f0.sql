ALTER TABLE public.requests ADD COLUMN IF NOT EXISTS team_id uuid REFERENCES public.teams(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS requests_team_id_idx ON public.requests(team_id);

CREATE OR REPLACE FUNCTION public.request_scope_ok(_user_id uuid, _team_id uuid, _min_edit boolean)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  WITH lvl AS (
    SELECT public.effective_permission(_user_id, 'solicitudes', _team_id) AS l
  )
  SELECT CASE
    WHEN (SELECT l FROM lvl) = 'editor_global' THEN true
    WHEN (SELECT l FROM lvl) = 'lector_global' THEN NOT _min_edit
    WHEN (SELECT l FROM lvl) = 'editor_categoria'
      THEN (_team_id IS NULL OR public.has_team_scope(_user_id, _team_id))
    WHEN (SELECT l FROM lvl) = 'lector_categoria'
      THEN (NOT _min_edit) AND (_team_id IS NULL OR public.has_team_scope(_user_id, _team_id))
    ELSE false
  END
$function$;

CREATE OR REPLACE FUNCTION public.can_view_request(_user_id uuid, _request_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.requests r
    WHERE r.id = _request_id
      AND public.has_club_access(_user_id, r.club_id)
      AND (
        r.requester_id = _user_id
        OR public.is_super_admin(_user_id)
        OR public.request_scope_ok(_user_id, r.team_id, false)
        OR (
          public.can_approve_request_type(_user_id, r.type, r.requester_id)
          AND (r.team_id IS NULL OR public.has_team_scope(_user_id, r.team_id))
        )
      )
  )
$function$;

DROP POLICY IF EXISTS requests_select_club ON public.requests;
CREATE POLICY requests_select_club ON public.requests
FOR SELECT TO authenticated
USING (
  has_club_access(auth.uid(), club_id)
  AND (
    requester_id = auth.uid()
    OR is_super_admin(auth.uid())
    OR public.request_scope_ok(auth.uid(), team_id, false)
    OR (
      can_approve_request_type(auth.uid(), type, requester_id)
      AND (team_id IS NULL OR has_team_scope(auth.uid(), team_id))
    )
  )
);

DROP POLICY IF EXISTS requests_update ON public.requests;
CREATE POLICY requests_update ON public.requests
FOR UPDATE TO authenticated
USING (
  has_club_access(auth.uid(), club_id)
  AND (
    (requester_id = auth.uid() AND status = 'pendiente'::request_status)
    OR is_super_admin(auth.uid())
    OR public.request_scope_ok(auth.uid(), team_id, true)
    OR (
      can_approve_request_type(auth.uid(), type, requester_id)
      AND (team_id IS NULL OR has_team_scope(auth.uid(), team_id))
    )
  )
)
WITH CHECK (
  has_club_access(auth.uid(), club_id)
  AND NOT (requester_id = auth.uid() AND status = ANY (ARRAY['aprobada'::request_status, 'rechazada'::request_status]))
);

DROP POLICY IF EXISTS requests_delete ON public.requests;
CREATE POLICY requests_delete ON public.requests
FOR DELETE TO authenticated
USING (
  has_club_access(auth.uid(), club_id)
  AND (
    (requester_id = auth.uid() AND status = ANY (ARRAY['pendiente'::request_status, 'cancelada'::request_status, 'rechazada'::request_status]))
    OR is_super_admin(auth.uid())
    OR public.request_scope_ok(auth.uid(), team_id, true)
  )
);

DROP POLICY IF EXISTS req_comments_delete ON public.request_comments;
CREATE POLICY req_comments_delete ON public.request_comments
FOR DELETE TO authenticated
USING (
  user_id = auth.uid()
  OR is_super_admin(auth.uid())
  OR EXISTS (
    SELECT 1 FROM public.requests r
    WHERE r.id = request_comments.request_id
      AND public.request_scope_ok(auth.uid(), r.team_id, true)
  )
);
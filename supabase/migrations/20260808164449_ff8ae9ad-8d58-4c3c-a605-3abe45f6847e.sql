-- Helpers para módulos de ámbito club
CREATE OR REPLACE FUNCTION public.can_view_club_module(_user_id uuid, _club_id uuid, _module_key text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT public.has_club_access(_user_id, _club_id)
     AND (
       public.is_super_admin(_user_id)
       OR public.max_permission_any_team(_user_id, _module_key) <> 'sin_acceso'
     )
$$;

CREATE OR REPLACE FUNCTION public.can_edit_club_module(_user_id uuid, _club_id uuid, _module_key text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT public.has_club_access(_user_id, _club_id)
     AND (
       public.is_super_admin(_user_id)
       OR public.max_permission_any_team(_user_id, _module_key)
            IN ('editor_categoria','editor_global')
     )
$$;

-- Aprobación: editor del módulo del tipo + designado
CREATE OR REPLACE FUNCTION public.can_approve_request_type(_user_id uuid, _type request_type, _requester_id uuid)
RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE
  v_club uuid;
  v_mode public.approver_override_mode;
  v_module text;
BEGIN
  IF _user_id IS NULL OR _user_id = _requester_id THEN
    RETURN false;
  END IF;

  IF public.is_super_admin(_user_id) THEN
    RETURN true;
  END IF;

  v_club := public.get_user_club_id(_user_id);
  IF v_club IS NULL THEN
    RETURN false;
  END IF;

  v_module := public.request_approver_module(_type);

  -- Requisito de nivel: editor del módulo correspondiente al tipo
  IF public.max_permission_any_team(_user_id, v_module)
       NOT IN ('editor_categoria','editor_global') THEN
    RETURN false;
  END IF;

  -- Requisito de designación (rol + overrides individuales)
  SELECT o.mode INTO v_mode
  FROM public.request_type_user_overrides o
  WHERE o.user_id = _user_id AND o.club_id = v_club AND o.request_type = _type
  LIMIT 1;

  IF v_mode = 'revoke' THEN
    RETURN false;
  ELSIF v_mode = 'grant' THEN
    RETURN true;
  END IF;

  RETURN EXISTS (
    SELECT 1
    FROM public.team_memberships tm
    JOIN public.roles r ON r.id = tm.role_id
    JOIN public.role_request_approvals rra ON rra.role_id = r.id
    WHERE tm.user_id = _user_id
      AND r.club_id = v_club
      AND rra.request_type = _type
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.request_type_approver_ids(_club_id uuid, _type request_type)
RETURNS TABLE(user_id uuid) LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT DISTINCT u.user_id FROM (
    SELECT tm.user_id
    FROM public.team_memberships tm
    JOIN public.roles r ON r.id = tm.role_id
    JOIN public.role_request_approvals rra ON rra.role_id = r.id
    JOIN public.profiles p ON p.id = tm.user_id
    WHERE r.club_id = _club_id
      AND p.club_id = _club_id
      AND rra.request_type = _type
      AND NOT EXISTS (
        SELECT 1 FROM public.request_type_user_overrides o
        WHERE o.user_id = tm.user_id AND o.club_id = _club_id
          AND o.request_type = _type AND o.mode = 'revoke'
      )
    UNION
    SELECT o.user_id
    FROM public.request_type_user_overrides o
    WHERE o.club_id = _club_id AND o.request_type = _type AND o.mode = 'grant'
  ) u
  WHERE public.is_super_admin(u.user_id)
     OR public.max_permission_any_team(u.user_id, public.request_approver_module(_type))
          IN ('editor_categoria','editor_global');
$$;

CREATE OR REPLACE FUNCTION public.can_view_request(_user_id uuid, _request_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.requests r
    WHERE r.id = _request_id
      AND public.has_club_access(_user_id, r.club_id)
      AND (
        r.requester_id = _user_id
        OR public.is_super_admin(_user_id)
        OR public.can_edit_club_module(_user_id, r.club_id, 'solicitudes')
        OR public.can_approve_request_type(_user_id, r.type, r.requester_id)
      )
  )
$$;

-- ============ INVENTARIO ============
DROP POLICY IF EXISTS inventory_items_select ON public.inventory_items;
CREATE POLICY inventory_items_select ON public.inventory_items FOR SELECT TO authenticated
  USING (public.can_view_club_module(auth.uid(), club_id, 'inventario'));
DROP POLICY IF EXISTS inventory_items_write ON public.inventory_items;
CREATE POLICY inventory_items_write ON public.inventory_items FOR ALL TO authenticated
  USING (public.can_edit_club_module(auth.uid(), club_id, 'inventario'))
  WITH CHECK (public.can_edit_club_module(auth.uid(), club_id, 'inventario'));

DROP POLICY IF EXISTS inventory_loans_select ON public.inventory_loans;
CREATE POLICY inventory_loans_select ON public.inventory_loans FOR SELECT TO authenticated
  USING (
    public.can_view_club_module(auth.uid(), club_id, 'inventario')
    OR borrower_user_id = auth.uid()
  );
DROP POLICY IF EXISTS inventory_loans_write ON public.inventory_loans;
CREATE POLICY inventory_loans_write ON public.inventory_loans FOR ALL TO authenticated
  USING (public.can_edit_club_module(auth.uid(), club_id, 'inventario'))
  WITH CHECK (public.can_edit_club_module(auth.uid(), club_id, 'inventario'));

-- ============ COMPRAS ============
DROP POLICY IF EXISTS expenses_select ON public.expenses;
CREATE POLICY expenses_select ON public.expenses FOR SELECT TO authenticated
  USING (public.can_view_club_module(auth.uid(), club_id, 'compras_facturas'));
DROP POLICY IF EXISTS expenses_write ON public.expenses;
CREATE POLICY expenses_write ON public.expenses FOR ALL TO authenticated
  USING (public.can_edit_club_module(auth.uid(), club_id, 'compras_facturas'))
  WITH CHECK (public.can_edit_club_module(auth.uid(), club_id, 'compras_facturas'));

DROP POLICY IF EXISTS suppliers_select ON public.suppliers;
CREATE POLICY suppliers_select ON public.suppliers FOR SELECT TO authenticated
  USING (public.can_view_club_module(auth.uid(), club_id, 'compras_facturas'));
DROP POLICY IF EXISTS suppliers_write ON public.suppliers;
CREATE POLICY suppliers_write ON public.suppliers FOR ALL TO authenticated
  USING (public.can_edit_club_module(auth.uid(), club_id, 'compras_facturas'))
  WITH CHECK (public.can_edit_club_module(auth.uid(), club_id, 'compras_facturas'));

-- ============ COORDINACIÓN: TAREAS ============
DROP POLICY IF EXISTS tasks_select ON public.tasks;
CREATE POLICY tasks_select ON public.tasks FOR SELECT TO authenticated
  USING (
    public.can_view_club_module(auth.uid(), club_id, 'coordinacion_interna')
    OR EXISTS (SELECT 1 FROM public.task_assignees ta WHERE ta.task_id = tasks.id AND ta.user_id = auth.uid())
  );
DROP POLICY IF EXISTS tasks_insert ON public.tasks;
CREATE POLICY tasks_insert ON public.tasks FOR INSERT TO authenticated
  WITH CHECK (public.can_edit_club_module(auth.uid(), club_id, 'coordinacion_interna'));
DROP POLICY IF EXISTS tasks_update ON public.tasks;
CREATE POLICY tasks_update ON public.tasks FOR UPDATE TO authenticated
  USING (
    public.can_edit_club_module(auth.uid(), club_id, 'coordinacion_interna')
    OR EXISTS (SELECT 1 FROM public.task_assignees ta WHERE ta.task_id = tasks.id AND ta.user_id = auth.uid())
  )
  WITH CHECK (club_id = public.get_user_club_id(auth.uid()));
DROP POLICY IF EXISTS tasks_delete ON public.tasks;
CREATE POLICY tasks_delete ON public.tasks FOR DELETE TO authenticated
  USING (public.can_edit_club_module(auth.uid(), club_id, 'coordinacion_interna'));

DROP POLICY IF EXISTS task_assignees_select ON public.task_assignees;
CREATE POLICY task_assignees_select ON public.task_assignees FOR SELECT TO authenticated
  USING (
    task_assignees.user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.tasks t
      WHERE t.id = task_assignees.task_id
        AND (
          public.can_view_club_module(auth.uid(), t.club_id, 'coordinacion_interna')
          OR EXISTS (SELECT 1 FROM public.task_assignees ta2 WHERE ta2.task_id = t.id AND ta2.user_id = auth.uid())
        )
    )
  );
DROP POLICY IF EXISTS task_assignees_write ON public.task_assignees;
CREATE POLICY task_assignees_write ON public.task_assignees FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.tasks t WHERE t.id = task_assignees.task_id
                   AND public.can_edit_club_module(auth.uid(), t.club_id, 'coordinacion_interna')))
  WITH CHECK (EXISTS (SELECT 1 FROM public.tasks t WHERE t.id = task_assignees.task_id
                   AND public.can_edit_club_module(auth.uid(), t.club_id, 'coordinacion_interna')));

-- ============ COORDINACIÓN: JUNTAS ============
DROP POLICY IF EXISTS meetings_select ON public.meetings;
CREATE POLICY meetings_select ON public.meetings FOR SELECT TO authenticated
  USING (
    public.can_view_club_module(auth.uid(), club_id, 'coordinacion_interna')
    OR EXISTS (SELECT 1 FROM public.meeting_attendees ma WHERE ma.meeting_id = meetings.id AND ma.user_id = auth.uid())
  );
DROP POLICY IF EXISTS meetings_insert ON public.meetings;
CREATE POLICY meetings_insert ON public.meetings FOR INSERT TO authenticated
  WITH CHECK (public.can_edit_club_module(auth.uid(), club_id, 'coordinacion_interna'));
DROP POLICY IF EXISTS meetings_update ON public.meetings;
CREATE POLICY meetings_update ON public.meetings FOR UPDATE TO authenticated
  USING (public.can_edit_club_module(auth.uid(), club_id, 'coordinacion_interna'))
  WITH CHECK (club_id = public.get_user_club_id(auth.uid()));
DROP POLICY IF EXISTS meetings_delete ON public.meetings;
CREATE POLICY meetings_delete ON public.meetings FOR DELETE TO authenticated
  USING (public.can_edit_club_module(auth.uid(), club_id, 'coordinacion_interna'));

DROP POLICY IF EXISTS meeting_attendees_select ON public.meeting_attendees;
CREATE POLICY meeting_attendees_select ON public.meeting_attendees FOR SELECT TO authenticated
  USING (
    meeting_attendees.user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.meetings m
      WHERE m.id = meeting_attendees.meeting_id
        AND (
          public.can_view_club_module(auth.uid(), m.club_id, 'coordinacion_interna')
          OR EXISTS (SELECT 1 FROM public.meeting_attendees ma2 WHERE ma2.meeting_id = m.id AND ma2.user_id = auth.uid())
        )
    )
  );
DROP POLICY IF EXISTS meeting_attendees_insert ON public.meeting_attendees;
CREATE POLICY meeting_attendees_insert ON public.meeting_attendees FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.meetings m WHERE m.id = meeting_attendees.meeting_id
                        AND public.can_edit_club_module(auth.uid(), m.club_id, 'coordinacion_interna')));
DROP POLICY IF EXISTS meeting_attendees_update ON public.meeting_attendees;
CREATE POLICY meeting_attendees_update ON public.meeting_attendees FOR UPDATE TO authenticated
  USING (
    meeting_attendees.user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.meetings m WHERE m.id = meeting_attendees.meeting_id
                 AND public.can_edit_club_module(auth.uid(), m.club_id, 'coordinacion_interna'))
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.meetings m WHERE m.id = meeting_attendees.meeting_id
              AND m.club_id = public.get_user_club_id(auth.uid()))
  );
DROP POLICY IF EXISTS meeting_attendees_delete ON public.meeting_attendees;
CREATE POLICY meeting_attendees_delete ON public.meeting_attendees FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.meetings m WHERE m.id = meeting_attendees.meeting_id
                   AND public.can_edit_club_module(auth.uid(), m.club_id, 'coordinacion_interna')));

-- ============ SOLICITUDES ============
DROP POLICY IF EXISTS requests_select_club ON public.requests;
CREATE POLICY requests_select_club ON public.requests FOR SELECT TO authenticated
  USING (
    public.has_club_access(auth.uid(), club_id)
    AND (
      requester_id = auth.uid()
      OR public.is_super_admin(auth.uid())
      OR public.can_edit_club_module(auth.uid(), club_id, 'solicitudes')
      OR public.can_approve_request_type(auth.uid(), type, requester_id)
    )
  );

DROP POLICY IF EXISTS requests_update ON public.requests;
CREATE POLICY requests_update ON public.requests FOR UPDATE TO authenticated
  USING (
    public.has_club_access(auth.uid(), club_id)
    AND (
      (requester_id = auth.uid() AND status = 'pendiente')
      OR public.is_super_admin(auth.uid())
      OR public.can_edit_club_module(auth.uid(), club_id, 'solicitudes')
      OR public.can_approve_request_type(auth.uid(), type, requester_id)
    )
  )
  WITH CHECK (
    public.has_club_access(auth.uid(), club_id)
    AND NOT (requester_id = auth.uid() AND status IN ('aprobada','rechazada'))
  );

DROP POLICY IF EXISTS requests_delete ON public.requests;
CREATE POLICY requests_delete ON public.requests FOR DELETE TO authenticated
  USING (
    public.has_club_access(auth.uid(), club_id)
    AND (
      (requester_id = auth.uid() AND status IN ('pendiente','cancelada','rechazada'))
      OR public.is_super_admin(auth.uid())
      OR public.can_edit_club_module(auth.uid(), club_id, 'solicitudes')
    )
  );

DROP POLICY IF EXISTS req_comments_delete ON public.request_comments;
CREATE POLICY req_comments_delete ON public.request_comments FOR DELETE TO authenticated
  USING (
    request_comments.user_id = auth.uid()
    OR public.is_super_admin(auth.uid())
    OR EXISTS (SELECT 1 FROM public.requests r WHERE r.id = request_comments.request_id
                 AND public.can_edit_club_module(auth.uid(), r.club_id, 'solicitudes'))
  );
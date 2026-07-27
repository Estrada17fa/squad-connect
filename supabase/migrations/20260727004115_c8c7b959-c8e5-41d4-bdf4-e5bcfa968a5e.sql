-- 1) Rename permission rows
UPDATE public.role_permissions SET module_key = 'agenda' WHERE module_key = 'calendario';
UPDATE public.user_permission_overrides SET module_key = 'agenda' WHERE module_key = 'calendario';

-- 2) Duplicate as 'mes'
INSERT INTO public.role_permissions (role_id, module_key, access_level)
SELECT role_id, 'mes', access_level FROM public.role_permissions WHERE module_key = 'agenda'
ON CONFLICT DO NOTHING;

INSERT INTO public.user_permission_overrides (user_id, team_id, module_key, access_level)
SELECT user_id, team_id, 'mes', access_level FROM public.user_permission_overrides WHERE module_key = 'agenda'
ON CONFLICT DO NOTHING;

-- 3) Rewrite calendar_events / event_attendees policies to use 'agenda'
DROP POLICY IF EXISTS "calendar_events_insert" ON public.calendar_events;
DROP POLICY IF EXISTS "calendar_events_update" ON public.calendar_events;
DROP POLICY IF EXISTS "calendar_events_delete" ON public.calendar_events;
DROP POLICY IF EXISTS "event_attendees_insert" ON public.event_attendees;
DROP POLICY IF EXISTS "event_attendees_delete" ON public.event_attendees;

CREATE POLICY "calendar_events_insert" ON public.calendar_events
  FOR INSERT TO authenticated
  WITH CHECK (public.has_module_editor(auth.uid(), team_id, 'agenda') OR public.is_super_admin(auth.uid()));

CREATE POLICY "calendar_events_update" ON public.calendar_events
  FOR UPDATE TO authenticated
  USING (public.has_module_editor(auth.uid(), team_id, 'agenda') OR public.is_super_admin(auth.uid()))
  WITH CHECK (public.has_module_editor(auth.uid(), team_id, 'agenda') OR public.is_super_admin(auth.uid()));

CREATE POLICY "calendar_events_delete" ON public.calendar_events
  FOR DELETE TO authenticated
  USING (public.has_module_editor(auth.uid(), team_id, 'agenda') OR public.is_super_admin(auth.uid()));

CREATE POLICY "event_attendees_insert" ON public.event_attendees
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.calendar_events e WHERE e.id = event_id
                       AND (public.has_module_editor(auth.uid(), e.team_id, 'agenda') OR public.is_super_admin(auth.uid()))));

CREATE POLICY "event_attendees_delete" ON public.event_attendees
  FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.calendar_events e WHERE e.id = event_id
                  AND (public.has_module_editor(auth.uid(), e.team_id, 'agenda') OR public.is_super_admin(auth.uid()))));
CREATE TABLE public.locations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id uuid NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,
  name text NOT NULL,
  address text,
  notes text,
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_locations_club ON public.locations(club_id);
CREATE UNIQUE INDEX idx_locations_club_name ON public.locations(club_id, lower(name));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.locations TO authenticated;
GRANT ALL ON public.locations TO service_role;

ALTER TABLE public.locations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "locations_select" ON public.locations FOR SELECT TO authenticated
USING (public.is_super_admin(auth.uid()) OR public.has_club_access(auth.uid(), club_id));

CREATE POLICY "locations_insert" ON public.locations FOR INSERT TO authenticated
WITH CHECK (
  public.is_super_admin(auth.uid())
  OR (public.has_club_access(auth.uid(), club_id)
      AND (public.has_module_editor_any(auth.uid(), 'agenda')
           OR public.has_module_editor_any(auth.uid(), 'entrenamientos')))
);

CREATE POLICY "locations_update" ON public.locations FOR UPDATE TO authenticated
USING (
  public.is_super_admin(auth.uid())
  OR (public.has_club_access(auth.uid(), club_id)
      AND (public.has_module_editor_any(auth.uid(), 'agenda')
           OR public.has_module_editor_any(auth.uid(), 'entrenamientos')))
)
WITH CHECK (
  public.is_super_admin(auth.uid())
  OR (public.has_club_access(auth.uid(), club_id)
      AND (public.has_module_editor_any(auth.uid(), 'agenda')
           OR public.has_module_editor_any(auth.uid(), 'entrenamientos')))
);

CREATE POLICY "locations_delete" ON public.locations FOR DELETE TO authenticated
USING (
  public.is_super_admin(auth.uid())
  OR (public.has_club_access(auth.uid(), club_id)
      AND (public.has_module_editor_any(auth.uid(), 'agenda')
           OR public.has_module_editor_any(auth.uid(), 'entrenamientos')))
);

CREATE TRIGGER locations_set_updated_at BEFORE UPDATE ON public.locations
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.calendar_events ADD COLUMN location_id uuid REFERENCES public.locations(id) ON DELETE SET NULL;

DROP POLICY IF EXISTS calendar_events_insert ON public.calendar_events;
CREATE POLICY calendar_events_insert ON public.calendar_events FOR INSERT TO authenticated
WITH CHECK (
  public.has_module_editor(auth.uid(), team_id, 'agenda')
  OR (event_type = 'entrenamiento' AND public.has_module_editor(auth.uid(), team_id, 'entrenamientos'))
  OR public.is_super_admin(auth.uid())
);

DROP POLICY IF EXISTS calendar_events_update ON public.calendar_events;
CREATE POLICY calendar_events_update ON public.calendar_events FOR UPDATE TO authenticated
USING (
  public.has_module_editor(auth.uid(), team_id, 'agenda')
  OR (event_type = 'entrenamiento' AND public.has_module_editor(auth.uid(), team_id, 'entrenamientos'))
  OR public.is_super_admin(auth.uid())
)
WITH CHECK (
  public.has_module_editor(auth.uid(), team_id, 'agenda')
  OR (event_type = 'entrenamiento' AND public.has_module_editor(auth.uid(), team_id, 'entrenamientos'))
  OR public.is_super_admin(auth.uid())
);

DROP POLICY IF EXISTS calendar_events_delete ON public.calendar_events;
CREATE POLICY calendar_events_delete ON public.calendar_events FOR DELETE TO authenticated
USING (
  public.has_module_editor(auth.uid(), team_id, 'agenda')
  OR (event_type = 'entrenamiento' AND public.has_module_editor(auth.uid(), team_id, 'entrenamientos'))
  OR public.is_super_admin(auth.uid())
);
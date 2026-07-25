
CREATE TABLE public.user_permission_overrides (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE,
  module_key TEXT NOT NULL,
  access_level public.access_level NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX user_perm_over_uniq_team
  ON public.user_permission_overrides (user_id, team_id, module_key)
  WHERE team_id IS NOT NULL;
CREATE UNIQUE INDEX user_perm_over_uniq_club
  ON public.user_permission_overrides (user_id, module_key)
  WHERE team_id IS NULL;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_permission_overrides TO authenticated;
GRANT ALL ON public.user_permission_overrides TO service_role;

ALTER TABLE public.user_permission_overrides ENABLE ROW LEVEL SECURITY;

-- Lectura: miembros del mismo club del usuario objetivo
CREATE POLICY "overrides_select_same_club"
  ON public.user_permission_overrides FOR SELECT
  TO authenticated
  USING (
    public.is_super_admin(auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = user_permission_overrides.user_id
        AND p.club_id = public.get_user_club_id(auth.uid())
    )
  );

-- Escritura: super admin o editor del módulo usuarios
CREATE POLICY "overrides_write_admins"
  ON public.user_permission_overrides FOR ALL
  TO authenticated
  USING (
    public.is_super_admin(auth.uid())
    OR public.has_module_editor_any(auth.uid(), 'usuarios')
  )
  WITH CHECK (
    public.is_super_admin(auth.uid())
    OR public.has_module_editor_any(auth.uid(), 'usuarios')
  );

CREATE TRIGGER user_perm_overrides_updated_at
  BEFORE UPDATE ON public.user_permission_overrides
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER PUBLICATION supabase_realtime ADD TABLE public.user_permission_overrides;

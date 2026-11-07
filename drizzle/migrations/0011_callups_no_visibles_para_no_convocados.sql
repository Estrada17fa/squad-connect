DROP POLICY IF EXISTS callups_select ON public.match_callups;
CREATE POLICY callups_select ON public.match_callups FOR SELECT TO authenticated
USING (
  public.can_view_match_ops(auth.uid(), match_id)
  OR (public.effective_permission(auth.uid(), 'torneo', public.match_team_id(match_id)) NOT IN ('sin_acceso','vista_jugador'))
  OR user_id = auth.uid()
);
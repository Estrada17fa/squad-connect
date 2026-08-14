CREATE POLICY tournament_crest_select ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'tournament-crests'
         AND public.can_view_module(auth.uid(), 'torneo', NULL)
         AND (split_part(name, '/', 1))::uuid = public.get_user_club_id(auth.uid()));
CREATE POLICY tournament_crest_insert ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'tournament-crests'
         AND public.can_edit_module(auth.uid(), 'torneo', NULL)
         AND (split_part(name, '/', 1))::uuid = public.get_user_club_id(auth.uid()));
CREATE POLICY tournament_crest_update ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'tournament-crests'
         AND public.can_edit_module(auth.uid(), 'torneo', NULL)
         AND (split_part(name, '/', 1))::uuid = public.get_user_club_id(auth.uid()));
CREATE POLICY tournament_crest_delete ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'tournament-crests'
         AND public.can_edit_module(auth.uid(), 'torneo', NULL)
         AND (split_part(name, '/', 1))::uuid = public.get_user_club_id(auth.uid()));
ALTER PUBLICATION supabase_realtime ADD TABLE public.tournaments;
ALTER PUBLICATION supabase_realtime ADD TABLE public.tournament_teams;
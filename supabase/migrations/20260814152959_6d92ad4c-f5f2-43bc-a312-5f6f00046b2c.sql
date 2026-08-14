DROP POLICY IF EXISTS media_posts_select ON public.media_posts;

CREATE POLICY media_posts_select ON public.media_posts
FOR SELECT TO authenticated
USING (
  public.has_club_access(auth.uid(), club_id)
  AND (
    author_id = auth.uid()
    OR (audience = 'club'::public.media_audience
        AND public.can_view_module(auth.uid(), 'multimedia', NULL))
    OR EXISTS (
      SELECT 1 FROM public.media_post_teams t
      WHERE t.post_id = media_posts.id
        AND public.can_view_team_media(auth.uid(), t.team_id)
    )
  )
);

DELETE FROM public.media_posts
WHERE club_id = '9b6c173f-4055-4a1a-8308-b350cfb28941'
  AND author_id = 'd064aa2c-4fca-470b-82bd-c672f001a40c'
  AND created_at > now() - interval '1 hour'
  AND NOT EXISTS (SELECT 1 FROM public.media_post_files f WHERE f.post_id = media_posts.id);
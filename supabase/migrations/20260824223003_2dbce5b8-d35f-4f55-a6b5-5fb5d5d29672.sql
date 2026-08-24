
-- 1. Club logos: fix broken folder-ownership check (used r.name instead of the object path)
DROP POLICY IF EXISTS "Club admins can upload club logos" ON storage.objects;
DROP POLICY IF EXISTS "Club admins can update club logos" ON storage.objects;
DROP POLICY IF EXISTS "Club admins can delete club logos" ON storage.objects;

CREATE POLICY "Club admins can upload club logos" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'club-logos' AND (
    public.is_super_admin(auth.uid()) OR EXISTS (
      SELECT 1 FROM public.team_memberships tm
      JOIN public.roles r ON r.id = tm.role_id
      WHERE tm.user_id = auth.uid() AND r.base_role = 'admin'
        AND r.club_id = ((storage.foldername(storage.objects.name))[1])::uuid
    )
  )
);

CREATE POLICY "Club admins can update club logos" ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'club-logos' AND (
    public.is_super_admin(auth.uid()) OR EXISTS (
      SELECT 1 FROM public.team_memberships tm
      JOIN public.roles r ON r.id = tm.role_id
      WHERE tm.user_id = auth.uid() AND r.base_role = 'admin'
        AND r.club_id = ((storage.foldername(storage.objects.name))[1])::uuid
    )
  )
);

CREATE POLICY "Club admins can delete club logos" ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'club-logos' AND (
    public.is_super_admin(auth.uid()) OR EXISTS (
      SELECT 1 FROM public.team_memberships tm
      JOIN public.roles r ON r.id = tm.role_id
      WHERE tm.user_id = auth.uid() AND r.base_role = 'admin'
        AND r.club_id = ((storage.foldername(storage.objects.name))[1])::uuid
    )
  )
);

-- 2. Avatars: scope reads to own file or same-club users
DROP POLICY IF EXISTS "avatars_select_auth" ON storage.objects;
CREATE POLICY "avatars_select_auth" ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'avatars' AND (
    (storage.foldername(storage.objects.name))[1] = auth.uid()::text
    OR public.is_super_admin(auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id::text = (storage.foldername(storage.objects.name))[1]
        AND p.club_id = public.get_user_club_id(auth.uid())
    )
  )
);

-- 3. Request attachments: only own uploads or files tied to a request the user may view
DROP POLICY IF EXISTS "request_attachments_select" ON storage.objects;
CREATE POLICY "request_attachments_select" ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'request-attachments'
  AND public.has_club_access(auth.uid(), (split_part(storage.objects.name, '/', 1))::uuid)
  AND (
    (split_part(storage.objects.name, '/', 2))::uuid = auth.uid()
    OR public.is_super_admin(auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.requests rq
      WHERE rq.club_id = (split_part(storage.objects.name, '/', 1))::uuid
        AND public.can_view_request(auth.uid(), rq.id)
        AND EXISTS (
          SELECT 1 FROM jsonb_each_text(coalesce(rq.details, '{}'::jsonb)) v
          WHERE v.value = storage.objects.name
        )
    )
  )
);

-- 4. role_permissions: only global 'usuarios' editors, and never their own role
DROP POLICY IF EXISTS "role_perms_write_own_club" ON public.role_permissions;
CREATE POLICY "role_perms_write_own_club" ON public.role_permissions FOR ALL TO authenticated
USING (
  public.is_super_admin(auth.uid()) OR (
    public.max_permission_any_team(auth.uid(), 'usuarios') = 'editor_global'::permission_level
    AND EXISTS (SELECT 1 FROM public.roles r WHERE r.id = role_permissions.role_id AND r.club_id = public.get_user_club_id(auth.uid()))
    AND NOT EXISTS (SELECT 1 FROM public.team_memberships tm WHERE tm.user_id = auth.uid() AND tm.role_id = role_permissions.role_id)
  )
)
WITH CHECK (
  public.is_super_admin(auth.uid()) OR (
    public.max_permission_any_team(auth.uid(), 'usuarios') = 'editor_global'::permission_level
    AND EXISTS (SELECT 1 FROM public.roles r WHERE r.id = role_permissions.role_id AND r.club_id = public.get_user_club_id(auth.uid()))
    AND NOT EXISTS (SELECT 1 FROM public.team_memberships tm WHERE tm.user_id = auth.uid() AND tm.role_id = role_permissions.role_id)
  )
);

-- 5. Lock down SECURITY DEFINER functions: no PUBLIC/anon execute.
DO $$
DECLARE f record;
BEGIN
  FOR f IN
    SELECT p.oid::regprocedure::text AS sig,
           pg_get_function_result(p.oid) = 'trigger' AS is_trigger,
           p.proname
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.prosecdef
  LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon, authenticated', f.sig);
    IF f.proname = 'get_invitation_by_token' THEN
      EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO anon, authenticated', f.sig);
    ELSIF NOT f.is_trigger AND f.proname NOT LIKE 'notify\_%' THEN
      EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated', f.sig);
    END IF;
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role', f.sig);
  END LOOP;
END $$;

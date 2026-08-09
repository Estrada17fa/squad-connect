-- Documentos: migración a la escala de 6 niveles
DROP POLICY IF EXISTS documents_select ON public.documents;
DROP POLICY IF EXISTS documents_insert ON public.documents;
DROP POLICY IF EXISTS documents_update ON public.documents;
DROP POLICY IF EXISTS documents_delete ON public.documents;

CREATE POLICY documents_select ON public.documents
FOR SELECT TO authenticated
USING (
  public.has_club_access(auth.uid(), club_id)
  AND (
    related_user_id = auth.uid()
    OR (
      related_user_id IS NULL
      AND CASE WHEN team_id IS NULL
            THEN public.can_view_club_module(auth.uid(), club_id, 'documentos')
            ELSE public.can_view_module(auth.uid(), 'documentos', team_id)
          END
    )
    OR (
      related_user_id IS NOT NULL
      AND CASE WHEN team_id IS NULL
            THEN public.can_edit_club_module(auth.uid(), club_id, 'documentos')
            ELSE public.can_edit_module(auth.uid(), 'documentos', team_id)
          END
    )
  )
);

CREATE POLICY documents_insert ON public.documents
FOR INSERT TO authenticated
WITH CHECK (
  public.has_club_access(auth.uid(), club_id)
  AND CASE WHEN team_id IS NULL
        THEN public.can_edit_club_module(auth.uid(), club_id, 'documentos')
        ELSE public.can_edit_module(auth.uid(), 'documentos', team_id)
      END
);

CREATE POLICY documents_update ON public.documents
FOR UPDATE TO authenticated
USING (
  public.has_club_access(auth.uid(), club_id)
  AND CASE WHEN team_id IS NULL
        THEN public.can_edit_club_module(auth.uid(), club_id, 'documentos')
        ELSE public.can_edit_module(auth.uid(), 'documentos', team_id)
      END
)
WITH CHECK (
  public.has_club_access(auth.uid(), club_id)
  AND CASE WHEN team_id IS NULL
        THEN public.can_edit_club_module(auth.uid(), club_id, 'documentos')
        ELSE public.can_edit_module(auth.uid(), 'documentos', team_id)
      END
);

CREATE POLICY documents_delete ON public.documents
FOR DELETE TO authenticated
USING (
  public.has_club_access(auth.uid(), club_id)
  AND CASE WHEN team_id IS NULL
        THEN public.can_edit_club_module(auth.uid(), club_id, 'documentos')
        ELSE public.can_edit_module(auth.uid(), 'documentos', team_id)
      END
);

-- Storage: bucket privado "documents"
DROP POLICY IF EXISTS documents_storage_select ON storage.objects;
DROP POLICY IF EXISTS documents_storage_insert ON storage.objects;
DROP POLICY IF EXISTS documents_storage_update ON storage.objects;
DROP POLICY IF EXISTS documents_storage_delete ON storage.objects;

CREATE POLICY documents_storage_select ON storage.objects
FOR SELECT TO authenticated
USING (
  bucket_id = 'documents'
  AND EXISTS (SELECT 1 FROM public.documents d WHERE d.file_path = storage.objects.name)
);

CREATE POLICY documents_storage_insert ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'documents'
  AND public.has_club_access(auth.uid(), (split_part(name, '/', 1))::uuid)
  AND (
    public.is_super_admin(auth.uid())
    OR public.max_permission_any_team(auth.uid(), 'documentos') IN ('editor_categoria','editor_global')
  )
);

CREATE POLICY documents_storage_update ON storage.objects
FOR UPDATE TO authenticated
USING (
  bucket_id = 'documents'
  AND public.has_club_access(auth.uid(), (split_part(name, '/', 1))::uuid)
  AND (
    public.is_super_admin(auth.uid())
    OR public.max_permission_any_team(auth.uid(), 'documentos') IN ('editor_categoria','editor_global')
  )
);

CREATE POLICY documents_storage_delete ON storage.objects
FOR DELETE TO authenticated
USING (
  bucket_id = 'documents'
  AND public.has_club_access(auth.uid(), (split_part(name, '/', 1))::uuid)
  AND (
    public.is_super_admin(auth.uid())
    OR public.max_permission_any_team(auth.uid(), 'documentos') IN ('editor_categoria','editor_global')
  )
);
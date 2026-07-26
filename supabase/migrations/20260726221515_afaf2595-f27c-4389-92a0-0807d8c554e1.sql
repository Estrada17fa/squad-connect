
-- Enum de categorías
DO $$ BEGIN
  CREATE TYPE public.document_category AS ENUM
    ('jugador','staff','institucional','legal','competicion','comercial','operativo');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Tabla documents
CREATE TABLE public.documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  category public.document_category NOT NULL,
  file_path TEXT NOT NULL,
  file_type TEXT,
  file_size BIGINT,
  related_user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  team_id UUID REFERENCES public.teams(id) ON DELETE SET NULL,
  issue_date DATE,
  expiry_date DATE,
  tags TEXT[],
  uploaded_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX documents_club_id_idx ON public.documents(club_id);
CREATE INDEX documents_category_idx ON public.documents(category);
CREATE INDEX documents_related_user_idx ON public.documents(related_user_id);
CREATE INDEX documents_expiry_idx ON public.documents(expiry_date);
CREATE INDEX documents_team_idx ON public.documents(team_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.documents TO authenticated;
GRANT ALL ON public.documents TO service_role;

ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;

-- SELECT: acceso al módulo o soy la persona relacionada; siempre acotado por club
CREATE POLICY "documents_select" ON public.documents
FOR SELECT TO authenticated
USING (
  public.has_club_access(auth.uid(), club_id)
  AND (
    public.has_module_access(auth.uid(), 'documentos')
    OR related_user_id = auth.uid()
  )
);

-- INSERT/UPDATE/DELETE: editor del módulo en el mismo club
CREATE POLICY "documents_insert" ON public.documents
FOR INSERT TO authenticated
WITH CHECK (
  public.has_club_access(auth.uid(), club_id)
  AND public.has_module_editor_any(auth.uid(), 'documentos')
);

CREATE POLICY "documents_update" ON public.documents
FOR UPDATE TO authenticated
USING (
  public.has_club_access(auth.uid(), club_id)
  AND public.has_module_editor_any(auth.uid(), 'documentos')
)
WITH CHECK (
  public.has_club_access(auth.uid(), club_id)
  AND public.has_module_editor_any(auth.uid(), 'documentos')
);

CREATE POLICY "documents_delete" ON public.documents
FOR DELETE TO authenticated
USING (
  public.has_club_access(auth.uid(), club_id)
  AND public.has_module_editor_any(auth.uid(), 'documentos')
);

-- Trigger updated_at
CREATE TRIGGER documents_set_updated_at
BEFORE UPDATE ON public.documents
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ==============================
-- Storage policies: bucket 'documents'
-- Convención de path: <club_id>/<document_id>/<filename>
-- ==============================

CREATE POLICY "documents_storage_select" ON storage.objects
FOR SELECT TO authenticated
USING (
  bucket_id = 'documents'
  AND (
    (
      public.has_club_access(auth.uid(), (split_part(name, '/', 1))::uuid)
      AND public.has_module_access(auth.uid(), 'documentos')
    )
    OR EXISTS (
      SELECT 1 FROM public.documents d
      WHERE d.file_path = name AND d.related_user_id = auth.uid()
    )
  )
);

CREATE POLICY "documents_storage_insert" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'documents'
  AND public.has_club_access(auth.uid(), (split_part(name, '/', 1))::uuid)
  AND public.has_module_editor_any(auth.uid(), 'documentos')
);

CREATE POLICY "documents_storage_update" ON storage.objects
FOR UPDATE TO authenticated
USING (
  bucket_id = 'documents'
  AND public.has_club_access(auth.uid(), (split_part(name, '/', 1))::uuid)
  AND public.has_module_editor_any(auth.uid(), 'documentos')
);

CREATE POLICY "documents_storage_delete" ON storage.objects
FOR DELETE TO authenticated
USING (
  bucket_id = 'documents'
  AND public.has_club_access(auth.uid(), (split_part(name, '/', 1))::uuid)
  AND public.has_module_editor_any(auth.uid(), 'documentos')
);

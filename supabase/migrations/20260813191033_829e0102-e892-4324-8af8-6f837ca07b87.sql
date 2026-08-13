-- ============ COMUNICADOS ============
CREATE TYPE public.announcement_priority AS ENUM ('normal','importante','urgente');
CREATE TYPE public.announcement_audience AS ENUM ('club','teams');

CREATE TABLE public.announcements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id uuid NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,
  title text NOT NULL,
  body text NOT NULL DEFAULT '',
  priority public.announcement_priority NOT NULL DEFAULT 'normal',
  audience public.announcement_audience NOT NULL DEFAULT 'teams',
  published_at timestamptz NOT NULL DEFAULT now(),
  author_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  attachment_path text,
  attachment_name text,
  attachment_type text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.announcement_teams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  announcement_id uuid NOT NULL REFERENCES public.announcements(id) ON DELETE CASCADE,
  team_id uuid NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  UNIQUE (announcement_id, team_id)
);

CREATE TABLE public.announcement_reads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  announcement_id uuid NOT NULL REFERENCES public.announcements(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  read_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (announcement_id, user_id)
);

CREATE INDEX idx_announcements_club ON public.announcements(club_id, published_at DESC);
CREATE INDEX idx_announcement_teams_team ON public.announcement_teams(team_id);
CREATE INDEX idx_announcement_reads_user ON public.announcement_reads(user_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.announcements TO authenticated;
GRANT ALL ON public.announcements TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.announcement_teams TO authenticated;
GRANT ALL ON public.announcement_teams TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.announcement_reads TO authenticated;
GRANT ALL ON public.announcement_reads TO service_role;

CREATE TRIGGER announcements_touch BEFORE UPDATE ON public.announcements
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ---------- Helpers ----------
CREATE OR REPLACE FUNCTION public.can_edit_team_announcement(_user_id uuid, _team_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.can_edit_module(_user_id, 'comunicados', _team_id)
     AND (public.effective_permission(_user_id, 'comunicados', _team_id) = 'editor_global'
          OR public.has_team_scope(_user_id, _team_id))
$$;

CREATE OR REPLACE FUNCTION public.can_view_team_announcement(_user_id uuid, _team_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.can_view_module(_user_id, 'comunicados', _team_id)
     AND (public.effective_permission(_user_id, 'comunicados', _team_id)
            IN ('lector_global','editor_global')
          OR public.has_team_scope(_user_id, _team_id))
$$;

CREATE OR REPLACE FUNCTION public.can_view_announcement(_user_id uuid, _announcement_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.announcements a
    WHERE a.id = _announcement_id
      AND (
        (a.audience = 'club' AND public.can_view_module(_user_id, 'comunicados', NULL))
        OR EXISTS (
          SELECT 1 FROM public.announcement_teams t
          WHERE t.announcement_id = a.id
            AND public.can_view_team_announcement(_user_id, t.team_id)
        )
      )
  )
$$;

CREATE OR REPLACE FUNCTION public.can_edit_announcement(_user_id uuid, _announcement_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.announcements a
    WHERE a.id = _announcement_id
      AND (
        public.effective_permission(_user_id, 'comunicados', NULL) = 'editor_global'
        OR (
          a.audience = 'teams'
          AND EXISTS (SELECT 1 FROM public.announcement_teams t WHERE t.announcement_id = a.id)
          AND NOT EXISTS (
            SELECT 1 FROM public.announcement_teams t
            WHERE t.announcement_id = a.id
              AND NOT public.can_edit_team_announcement(_user_id, t.team_id)
          )
        )
      )
  )
$$;

-- ---------- RLS ----------
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.announcement_teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.announcement_reads ENABLE ROW LEVEL SECURITY;

CREATE POLICY announcements_select ON public.announcements FOR SELECT TO authenticated
  USING (public.can_view_announcement(auth.uid(), id));

CREATE POLICY announcements_insert ON public.announcements FOR INSERT TO authenticated
  WITH CHECK (
    author_id = auth.uid()
    AND club_id = public.get_user_club_id(auth.uid())
    AND (
      CASE WHEN audience = 'club'
        THEN public.effective_permission(auth.uid(), 'comunicados', NULL) = 'editor_global'
        ELSE public.can_edit_module(auth.uid(), 'comunicados', NULL)
      END
    )
  );

CREATE POLICY announcements_update ON public.announcements FOR UPDATE TO authenticated
  USING (public.can_edit_announcement(auth.uid(), id))
  WITH CHECK (public.can_edit_announcement(auth.uid(), id));

CREATE POLICY announcements_delete ON public.announcements FOR DELETE TO authenticated
  USING (public.can_edit_announcement(auth.uid(), id));

CREATE POLICY announcement_teams_select ON public.announcement_teams FOR SELECT TO authenticated
  USING (public.can_view_announcement(auth.uid(), announcement_id));

CREATE POLICY announcement_teams_write ON public.announcement_teams TO authenticated
  USING (public.can_edit_team_announcement(auth.uid(), team_id))
  WITH CHECK (public.can_edit_team_announcement(auth.uid(), team_id));

CREATE POLICY announcement_reads_select ON public.announcement_reads FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.can_edit_announcement(auth.uid(), announcement_id));

CREATE POLICY announcement_reads_insert ON public.announcement_reads FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND public.can_view_announcement(auth.uid(), announcement_id));

-- ---------- Notificaciones ----------
CREATE OR REPLACE FUNCTION public.notify_announcement_club()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_prefix text;
BEGIN
  IF NEW.audience <> 'club' THEN RETURN NEW; END IF;
  v_prefix := CASE NEW.priority WHEN 'urgente' THEN 'URGENTE: '
                                WHEN 'importante' THEN 'Importante: ' ELSE '' END;
  PERFORM public.notify_group(NEW.club_id, 'club', NULL, 'comunicado',
    v_prefix || NEW.title, left(NEW.body, 160), 'comunicados', NEW.id);
  RETURN NEW;
END $$;

CREATE TRIGGER announcements_notify_club AFTER INSERT ON public.announcements
  FOR EACH ROW EXECUTE FUNCTION public.notify_announcement_club();

CREATE OR REPLACE FUNCTION public.notify_announcement_team()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE a public.announcements%ROWTYPE; v_prefix text;
BEGIN
  SELECT * INTO a FROM public.announcements WHERE id = NEW.announcement_id;
  IF a.id IS NULL THEN RETURN NEW; END IF;
  v_prefix := CASE a.priority WHEN 'urgente' THEN 'URGENTE: '
                              WHEN 'importante' THEN 'Importante: ' ELSE '' END;
  PERFORM public.notify_group(a.club_id, 'team', NEW.team_id, 'comunicado',
    v_prefix || a.title, left(a.body, 160), 'comunicados', a.id);
  RETURN NEW;
END $$;

CREATE TRIGGER announcement_teams_notify AFTER INSERT ON public.announcement_teams
  FOR EACH ROW EXECUTE FUNCTION public.notify_announcement_team();

-- ---------- Realtime ----------
ALTER PUBLICATION supabase_realtime ADD TABLE public.announcements;
ALTER PUBLICATION supabase_realtime ADD TABLE public.announcement_reads;
ALTER PUBLICATION supabase_realtime ADD TABLE public.announcement_teams;

-- ---------- Archivos adjuntos ----------
CREATE POLICY announcement_files_select ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'announcement-attachments'
         AND public.can_view_module(auth.uid(), 'comunicados', NULL)
         AND (split_part(name, '/', 1))::uuid = public.get_user_club_id(auth.uid()));
CREATE POLICY announcement_files_insert ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'announcement-attachments'
         AND public.can_edit_module(auth.uid(), 'comunicados', NULL)
         AND (split_part(name, '/', 1))::uuid = public.get_user_club_id(auth.uid()));
CREATE POLICY announcement_files_delete ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'announcement-attachments'
         AND public.can_edit_module(auth.uid(), 'comunicados', NULL)
         AND (split_part(name, '/', 1))::uuid = public.get_user_club_id(auth.uid()));
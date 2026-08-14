-- Tipos
CREATE TYPE public.media_post_type AS ENUM ('entrenamiento','partido','evento_especial','convivencia','institucional','otro');
CREATE TYPE public.media_audience AS ENUM ('club','teams');
CREATE TYPE public.media_file_kind AS ENUM ('image','video');

-- Publicaciones
CREATE TABLE public.media_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id uuid NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,
  album_id uuid NOT NULL DEFAULT gen_random_uuid(),
  title text,
  description text,
  type public.media_post_type NOT NULL DEFAULT 'otro',
  audience public.media_audience NOT NULL DEFAULT 'club',
  match_id uuid REFERENCES public.tournament_matches(id) ON DELETE SET NULL,
  published_at timestamptz NOT NULL DEFAULT now(),
  author_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.media_posts TO authenticated;
GRANT ALL ON public.media_posts TO service_role;

CREATE TABLE public.media_post_files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES public.media_posts(id) ON DELETE CASCADE,
  storage_path text NOT NULL,
  file_name text NOT NULL,
  mime_type text,
  kind public.media_file_kind NOT NULL DEFAULT 'image',
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.media_post_files TO authenticated;
GRANT ALL ON public.media_post_files TO service_role;

CREATE TABLE public.media_post_teams (
  post_id uuid NOT NULL REFERENCES public.media_posts(id) ON DELETE CASCADE,
  team_id uuid NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  PRIMARY KEY (post_id, team_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.media_post_teams TO authenticated;
GRANT ALL ON public.media_post_teams TO service_role;

CREATE TABLE public.media_likes (
  post_id uuid NOT NULL REFERENCES public.media_posts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (post_id, user_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.media_likes TO authenticated;
GRANT ALL ON public.media_likes TO service_role;

CREATE TABLE public.media_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES public.media_posts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.media_comments TO authenticated;
GRANT ALL ON public.media_comments TO service_role;

CREATE INDEX media_posts_club_idx ON public.media_posts(club_id, published_at DESC);
CREATE INDEX media_post_files_post_idx ON public.media_post_files(post_id);
CREATE INDEX media_comments_post_idx ON public.media_comments(post_id, created_at);

-- updated_at
CREATE TRIGGER media_posts_updated_at BEFORE UPDATE ON public.media_posts
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER media_comments_updated_at BEFORE UPDATE ON public.media_comments
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Alcance por categoría (mismo patrón que comunicados)
CREATE OR REPLACE FUNCTION public.can_view_team_media(_user_id uuid, _team_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT public.can_view_module(_user_id, 'multimedia', _team_id)
     AND (public.effective_permission(_user_id, 'multimedia', _team_id)
            IN ('lector_global','editor_global')
          OR public.has_team_scope(_user_id, _team_id))
$$;

CREATE OR REPLACE FUNCTION public.can_edit_team_media(_user_id uuid, _team_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT public.can_edit_module(_user_id, 'multimedia', _team_id)
     AND (public.effective_permission(_user_id, 'multimedia', _team_id) = 'editor_global'
          OR public.has_team_scope(_user_id, _team_id))
$$;

CREATE OR REPLACE FUNCTION public.can_view_media_post(_user_id uuid, _post_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.media_posts p
    WHERE p.id = _post_id
      AND public.has_club_access(_user_id, p.club_id)
      AND (
        p.author_id = _user_id
        OR (p.audience = 'club' AND public.can_view_module(_user_id, 'multimedia', NULL))
        OR EXISTS (
          SELECT 1 FROM public.media_post_teams t
          WHERE t.post_id = p.id AND public.can_view_team_media(_user_id, t.team_id)
        )
      )
  )
$$;

CREATE OR REPLACE FUNCTION public.can_edit_media_post(_user_id uuid, _post_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.media_posts p
    WHERE p.id = _post_id
      AND public.has_club_access(_user_id, p.club_id)
      AND (
        public.max_permission_any_team(_user_id, 'multimedia') = 'editor_global'
        OR (
          p.author_id = _user_id
          AND public.max_permission_any_team(_user_id, 'multimedia')
                IN ('editor_categoria','editor_global')
        )
        OR (
          p.audience = 'teams'
          AND EXISTS (SELECT 1 FROM public.media_post_teams t WHERE t.post_id = p.id)
          AND NOT EXISTS (
            SELECT 1 FROM public.media_post_teams t
            WHERE t.post_id = p.id AND NOT public.can_edit_team_media(_user_id, t.team_id)
          )
        )
      )
  )
$$;

-- RLS
ALTER TABLE public.media_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.media_post_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.media_post_teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.media_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.media_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "media_posts_select" ON public.media_posts FOR SELECT TO authenticated
  USING (public.can_view_media_post(auth.uid(), id));
CREATE POLICY "media_posts_insert" ON public.media_posts FOR INSERT TO authenticated
  WITH CHECK (
    author_id = auth.uid()
    AND public.has_club_access(auth.uid(), club_id)
    AND public.max_permission_any_team(auth.uid(), 'multimedia') IN ('editor_categoria','editor_global')
    AND (audience = 'teams' OR public.max_permission_any_team(auth.uid(), 'multimedia') = 'editor_global')
  );
CREATE POLICY "media_posts_update" ON public.media_posts FOR UPDATE TO authenticated
  USING (public.can_edit_media_post(auth.uid(), id))
  WITH CHECK (public.can_edit_media_post(auth.uid(), id));
CREATE POLICY "media_posts_delete" ON public.media_posts FOR DELETE TO authenticated
  USING (public.can_edit_media_post(auth.uid(), id));

CREATE POLICY "media_files_select" ON public.media_post_files FOR SELECT TO authenticated
  USING (public.can_view_media_post(auth.uid(), post_id));
CREATE POLICY "media_files_write" ON public.media_post_files FOR ALL TO authenticated
  USING (public.can_edit_media_post(auth.uid(), post_id))
  WITH CHECK (public.can_edit_media_post(auth.uid(), post_id));

CREATE POLICY "media_teams_select" ON public.media_post_teams FOR SELECT TO authenticated
  USING (public.can_view_media_post(auth.uid(), post_id));
CREATE POLICY "media_teams_write" ON public.media_post_teams FOR ALL TO authenticated
  USING (public.can_edit_team_media(auth.uid(), team_id))
  WITH CHECK (public.can_edit_team_media(auth.uid(), team_id));

CREATE POLICY "media_likes_select" ON public.media_likes FOR SELECT TO authenticated
  USING (public.can_view_media_post(auth.uid(), post_id));
CREATE POLICY "media_likes_insert" ON public.media_likes FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND public.can_view_media_post(auth.uid(), post_id));
CREATE POLICY "media_likes_delete" ON public.media_likes FOR DELETE TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "media_comments_select" ON public.media_comments FOR SELECT TO authenticated
  USING (public.can_view_media_post(auth.uid(), post_id));
CREATE POLICY "media_comments_insert" ON public.media_comments FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND public.can_view_media_post(auth.uid(), post_id));
CREATE POLICY "media_comments_update" ON public.media_comments FOR UPDATE TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "media_comments_delete" ON public.media_comments FOR DELETE TO authenticated
  USING (user_id = auth.uid() OR public.can_edit_media_post(auth.uid(), post_id));

-- Notificaciones
CREATE OR REPLACE FUNCTION public.notify_media_post_club()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF NEW.audience <> 'club' THEN RETURN NEW; END IF;
  PERFORM public.notify_group(NEW.club_id, 'club', NULL, 'multimedia',
    'Nueva publicación en Multimedia',
    COALESCE(NEW.title, 'Se publicaron nuevas fotos o videos'), 'multimedia', NEW.id);
  RETURN NEW;
END $$;

CREATE OR REPLACE FUNCTION public.notify_media_post_team()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE p public.media_posts%ROWTYPE;
BEGIN
  SELECT * INTO p FROM public.media_posts WHERE id = NEW.post_id;
  IF p.id IS NULL THEN RETURN NEW; END IF;
  PERFORM public.notify_group(p.club_id, 'team', NEW.team_id, 'multimedia',
    'Nueva publicación en Multimedia',
    COALESCE(p.title, 'Se publicaron nuevas fotos o videos'), 'multimedia', p.id);
  RETURN NEW;
END $$;

CREATE TRIGGER media_posts_notify AFTER INSERT ON public.media_posts
  FOR EACH ROW EXECUTE FUNCTION public.notify_media_post_club();
CREATE TRIGGER media_post_teams_notify AFTER INSERT ON public.media_post_teams
  FOR EACH ROW EXECUTE FUNCTION public.notify_media_post_team();
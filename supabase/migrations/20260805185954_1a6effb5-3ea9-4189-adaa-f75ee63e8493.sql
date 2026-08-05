ALTER TABLE public.notifications
  ADD COLUMN IF NOT EXISTS audience text NOT NULL DEFAULT 'direct';

ALTER TABLE public.notifications
  DROP CONSTRAINT IF EXISTS notifications_audience_check;
ALTER TABLE public.notifications
  ADD CONSTRAINT notifications_audience_check CHECK (audience IN ('direct','broadcast'));

-- notify_users conserva su firma; toma el "audience" del contexto de la transacción
-- (lo fija notify_group) y por defecto crea notificaciones directas.
CREATE OR REPLACE FUNCTION public.notify_users(_club_id uuid, _user_ids uuid[], _type text, _title text, _body text, _related_module text, _related_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_id uuid;
  v_audience text := coalesce(nullif(current_setting('app.notification_audience', true), ''), 'direct');
BEGIN
  IF _club_id IS NULL OR _user_ids IS NULL THEN RETURN; END IF;

  FOR v_id IN
    SELECT DISTINCT u FROM unnest(_user_ids) AS u
    WHERE u IS NOT NULL AND EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = u)
  LOOP
    INSERT INTO public.notifications
      (club_id, user_id, type, title, body, related_module, related_id, audience)
    VALUES (_club_id, v_id, _type, _title, _body, _related_module, _related_id, v_audience)
    RETURNING id INTO v_id;
    PERFORM public.notifications_push_hook(v_id);
  END LOOP;
END;
$function$;

-- Difusión por grupo: club completo, un equipo o un rol.
CREATE OR REPLACE FUNCTION public.notify_group(_club_id uuid, _scope text, _scope_id uuid, _type text, _title text, _body text, _related_module text, _related_id uuid)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_targets uuid[];
BEGIN
  IF _club_id IS NULL OR _scope IS NULL THEN RETURN 0; END IF;

  IF _scope = 'club' THEN
    SELECT array_agg(p.id) INTO v_targets
    FROM public.profiles p
    WHERE p.club_id = _club_id;

  ELSIF _scope = 'team' THEN
    IF _scope_id IS NULL THEN
      RAISE EXCEPTION 'scope "team" requiere scope_id (team_id)';
    END IF;
    SELECT array_agg(DISTINCT tm.user_id) INTO v_targets
    FROM public.team_memberships tm
    JOIN public.profiles p ON p.id = tm.user_id
    JOIN public.teams t ON t.id = _scope_id
    WHERE p.club_id = _club_id
      AND t.club_id = _club_id
      AND (
        tm.team_id = _scope_id
        OR (tm.team_id IS NULL AND EXISTS (
              SELECT 1 FROM public.roles r
              WHERE r.id = tm.role_id AND r.club_id = _club_id AND r.allows_club_wide
           ))
      );

  ELSIF _scope = 'role' THEN
    IF _scope_id IS NULL THEN
      RAISE EXCEPTION 'scope "role" requiere scope_id (role_id)';
    END IF;
    SELECT array_agg(DISTINCT tm.user_id) INTO v_targets
    FROM public.team_memberships tm
    JOIN public.profiles p ON p.id = tm.user_id
    JOIN public.roles r ON r.id = tm.role_id
    WHERE tm.role_id = _scope_id
      AND r.club_id = _club_id
      AND p.club_id = _club_id;

  ELSE
    RAISE EXCEPTION 'scope inválido: % (usa club, team o role)', _scope;
  END IF;

  IF v_targets IS NULL OR array_length(v_targets, 1) IS NULL THEN
    RETURN 0;
  END IF;

  PERFORM set_config('app.notification_audience', 'broadcast', true);
  PERFORM public.notify_users(_club_id, v_targets, _type, _title, _body, _related_module, _related_id);
  PERFORM set_config('app.notification_audience', 'direct', true);

  RETURN array_length(v_targets, 1);
END;
$function$;

REVOKE ALL ON FUNCTION public.notify_group(uuid, text, uuid, text, text, text, text, uuid) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.notify_group(uuid, text, uuid, text, text, text, text, uuid) TO service_role;
CREATE TYPE public.injury_severity AS ENUM ('leve','moderada','grave');
CREATE TYPE public.injury_status AS ENUM ('activa','en_recuperacion','recuperada');

-- Nivel efectivo del módulo 'salud' para un equipo (rol de equipo o club-wide + overrides)
CREATE OR REPLACE FUNCTION public.health_level(_user_id uuid, _team_id uuid)
RETURNS public.access_level
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_club uuid;
  v_lvl public.access_level := 'none';
  v_o public.access_level;
BEGIN
  IF _user_id IS NULL THEN RETURN 'none'; END IF;
  IF public.is_super_admin(_user_id) THEN RETURN 'approver'; END IF;
  v_club := public.get_user_club_id(_user_id);
  IF v_club IS NULL THEN RETURN 'none'; END IF;
  IF _team_id IS NOT NULL AND NOT EXISTS (
      SELECT 1 FROM public.teams t WHERE t.id = _team_id AND t.club_id = v_club) THEN
    RETURN 'none';
  END IF;

  SELECT max(CASE rp.access_level
               WHEN 'approver' THEN 3 WHEN 'editor' THEN 2 WHEN 'read' THEN 1 ELSE 0 END)
    INTO v_lvl
  FROM public.team_memberships tm
  JOIN public.role_permissions rp ON rp.role_id = tm.role_id
  WHERE tm.user_id = _user_id
    AND rp.module_key = 'salud'
    AND (tm.team_id = _team_id OR tm.team_id IS NULL);

  v_lvl := COALESCE((
    SELECT CASE max(CASE rp.access_level
                 WHEN 'approver' THEN 3 WHEN 'editor' THEN 2 WHEN 'read' THEN 1 ELSE 0 END)
             WHEN 3 THEN 'approver'::public.access_level
             WHEN 2 THEN 'editor'::public.access_level
             WHEN 1 THEN 'read'::public.access_level
             ELSE 'none'::public.access_level END
    FROM public.team_memberships tm
    JOIN public.role_permissions rp ON rp.role_id = tm.role_id
    WHERE tm.user_id = _user_id
      AND rp.module_key = 'salud'
      AND (tm.team_id = _team_id OR tm.team_id IS NULL)
  ), 'none');

  -- Override club-wide y luego el del equipo (el más específico gana)
  SELECT o.access_level INTO v_o FROM public.user_permission_overrides o
   WHERE o.user_id = _user_id AND o.module_key = 'salud' AND o.team_id IS NULL LIMIT 1;
  IF v_o IS NOT NULL THEN v_lvl := v_o; END IF;

  IF _team_id IS NOT NULL THEN
    SELECT o.access_level INTO v_o FROM public.user_permission_overrides o
     WHERE o.user_id = _user_id AND o.module_key = 'salud' AND o.team_id = _team_id LIMIT 1;
    IF v_o IS NOT NULL THEN v_lvl := v_o; END IF;
  END IF;

  RETURN COALESCE(v_lvl, 'none');
END;
$$;

CREATE OR REPLACE FUNCTION public.can_access_health(_user_id uuid, _team_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.health_level(_user_id, _team_id) <> 'none'
$$;

CREATE OR REPLACE FUNCTION public.can_edit_health(_user_id uuid, _team_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.health_level(_user_id, _team_id) IN ('editor','approver')
$$;

-- 1. Ficha médica base
CREATE TABLE public.player_medical_profile (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id uuid NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,
  team_id uuid NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  player_user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  blood_type text,
  allergies text,
  chronic_conditions text,
  emergency_contact_name text,
  emergency_contact_phone text,
  notes text,
  created_by uuid REFERENCES public.profiles(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (player_user_id, team_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.player_medical_profile TO authenticated;
GRANT ALL ON public.player_medical_profile TO service_role;
ALTER TABLE public.player_medical_profile ENABLE ROW LEVEL SECURITY;
CREATE POLICY "med_profile_select" ON public.player_medical_profile FOR SELECT TO authenticated
  USING (player_user_id = auth.uid() OR public.can_access_health(auth.uid(), team_id));
CREATE POLICY "med_profile_insert" ON public.player_medical_profile FOR INSERT TO authenticated
  WITH CHECK (public.can_edit_health(auth.uid(), team_id) AND public.has_club_access(auth.uid(), club_id));
CREATE POLICY "med_profile_update" ON public.player_medical_profile FOR UPDATE TO authenticated
  USING (public.can_edit_health(auth.uid(), team_id)) WITH CHECK (public.can_edit_health(auth.uid(), team_id));
CREATE POLICY "med_profile_delete" ON public.player_medical_profile FOR DELETE TO authenticated
  USING (public.can_edit_health(auth.uid(), team_id));
CREATE TRIGGER trg_med_profile_updated BEFORE UPDATE ON public.player_medical_profile
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 2. Revisiones
CREATE TABLE public.medical_checkups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id uuid NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,
  team_id uuid NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  player_user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  checkup_date timestamptz NOT NULL DEFAULT now(),
  reason text NOT NULL,
  findings text,
  diagnosis text,
  notes text,
  request_id uuid REFERENCES public.requests(id) ON DELETE SET NULL,
  created_by uuid REFERENCES public.profiles(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_checkups_player ON public.medical_checkups(player_user_id, checkup_date DESC);
CREATE INDEX idx_checkups_request ON public.medical_checkups(request_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.medical_checkups TO authenticated;
GRANT ALL ON public.medical_checkups TO service_role;
ALTER TABLE public.medical_checkups ENABLE ROW LEVEL SECURITY;
CREATE POLICY "checkups_select" ON public.medical_checkups FOR SELECT TO authenticated
  USING (player_user_id = auth.uid() OR public.can_access_health(auth.uid(), team_id));
CREATE POLICY "checkups_insert" ON public.medical_checkups FOR INSERT TO authenticated
  WITH CHECK (public.can_edit_health(auth.uid(), team_id) AND public.has_club_access(auth.uid(), club_id));
CREATE POLICY "checkups_update" ON public.medical_checkups FOR UPDATE TO authenticated
  USING (public.can_edit_health(auth.uid(), team_id)) WITH CHECK (public.can_edit_health(auth.uid(), team_id));
CREATE POLICY "checkups_delete" ON public.medical_checkups FOR DELETE TO authenticated
  USING (public.can_edit_health(auth.uid(), team_id));
CREATE TRIGGER trg_checkups_updated BEFORE UPDATE ON public.medical_checkups
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 3. Recetas
CREATE TABLE public.medical_prescriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id uuid NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,
  team_id uuid NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  checkup_id uuid REFERENCES public.medical_checkups(id) ON DELETE CASCADE,
  player_user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  medication text NOT NULL,
  dosage text,
  duration text,
  instructions text,
  prescribed_by uuid REFERENCES public.profiles(id),
  prescribed_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_prescriptions_player ON public.medical_prescriptions(player_user_id, prescribed_at DESC);
CREATE INDEX idx_prescriptions_checkup ON public.medical_prescriptions(checkup_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.medical_prescriptions TO authenticated;
GRANT ALL ON public.medical_prescriptions TO service_role;
ALTER TABLE public.medical_prescriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "prescriptions_select" ON public.medical_prescriptions FOR SELECT TO authenticated
  USING (player_user_id = auth.uid() OR public.can_access_health(auth.uid(), team_id));
CREATE POLICY "prescriptions_insert" ON public.medical_prescriptions FOR INSERT TO authenticated
  WITH CHECK (public.can_edit_health(auth.uid(), team_id) AND public.has_club_access(auth.uid(), club_id));
CREATE POLICY "prescriptions_update" ON public.medical_prescriptions FOR UPDATE TO authenticated
  USING (public.can_edit_health(auth.uid(), team_id)) WITH CHECK (public.can_edit_health(auth.uid(), team_id));
CREATE POLICY "prescriptions_delete" ON public.medical_prescriptions FOR DELETE TO authenticated
  USING (public.can_edit_health(auth.uid(), team_id));
CREATE TRIGGER trg_prescriptions_updated BEFORE UPDATE ON public.medical_prescriptions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 4. Lesiones
CREATE TABLE public.injuries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id uuid NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,
  team_id uuid NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  player_user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  injury_type text NOT NULL,
  body_part text NOT NULL,
  severity public.injury_severity NOT NULL DEFAULT 'leve',
  occurred_at date NOT NULL DEFAULT (now() AT TIME ZONE 'America/Mazatlan')::date,
  estimated_return date,
  status public.injury_status NOT NULL DEFAULT 'activa',
  description text,
  created_by uuid REFERENCES public.profiles(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_injuries_player ON public.injuries(player_user_id, occurred_at DESC);
CREATE INDEX idx_injuries_team ON public.injuries(team_id, status);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.injuries TO authenticated;
GRANT ALL ON public.injuries TO service_role;
ALTER TABLE public.injuries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "injuries_select" ON public.injuries FOR SELECT TO authenticated
  USING (player_user_id = auth.uid() OR public.can_access_health(auth.uid(), team_id));
CREATE POLICY "injuries_insert" ON public.injuries FOR INSERT TO authenticated
  WITH CHECK (public.can_edit_health(auth.uid(), team_id) AND public.has_club_access(auth.uid(), club_id));
CREATE POLICY "injuries_update" ON public.injuries FOR UPDATE TO authenticated
  USING (public.can_edit_health(auth.uid(), team_id)) WITH CHECK (public.can_edit_health(auth.uid(), team_id));
CREATE POLICY "injuries_delete" ON public.injuries FOR DELETE TO authenticated
  USING (public.can_edit_health(auth.uid(), team_id));
CREATE TRIGGER trg_injuries_updated BEFORE UPDATE ON public.injuries
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 5. Seguimiento de recuperación
CREATE TABLE public.injury_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  injury_id uuid NOT NULL REFERENCES public.injuries(id) ON DELETE CASCADE,
  note text NOT NULL,
  progress_date timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES public.profiles(id),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_injury_progress_injury ON public.injury_progress(injury_id, progress_date DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.injury_progress TO authenticated;
GRANT ALL ON public.injury_progress TO service_role;
ALTER TABLE public.injury_progress ENABLE ROW LEVEL SECURITY;
CREATE POLICY "injury_progress_select" ON public.injury_progress FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.injuries i WHERE i.id = injury_id
    AND (i.player_user_id = auth.uid() OR public.can_access_health(auth.uid(), i.team_id))));
CREATE POLICY "injury_progress_insert" ON public.injury_progress FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.injuries i WHERE i.id = injury_id
    AND public.can_edit_health(auth.uid(), i.team_id)));
CREATE POLICY "injury_progress_update" ON public.injury_progress FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.injuries i WHERE i.id = injury_id
    AND public.can_edit_health(auth.uid(), i.team_id)))
  WITH CHECK (EXISTS (SELECT 1 FROM public.injuries i WHERE i.id = injury_id
    AND public.can_edit_health(auth.uid(), i.team_id)));
CREATE POLICY "injury_progress_delete" ON public.injury_progress FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.injuries i WHERE i.id = injury_id
    AND public.can_edit_health(auth.uid(), i.team_id)));

-- Notificaciones al jugador
CREATE OR REPLACE FUNCTION public.notify_checkup_created()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM public.notify_users(
    NEW.club_id, ARRAY[NEW.player_user_id], 'salud_revision',
    'Tienes una nueva revisión médica registrada',
    NEW.reason || ' · ' || to_char(NEW.checkup_date AT TIME ZONE 'America/Mazatlan', 'DD/MM HH24:MI'),
    'salud', NEW.id
  );
  RETURN NEW;
END;
$$;
CREATE TRIGGER trg_notify_checkup_created AFTER INSERT ON public.medical_checkups
  FOR EACH ROW EXECUTE FUNCTION public.notify_checkup_created();

CREATE OR REPLACE FUNCTION public.notify_prescription_created()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM public.notify_users(
    NEW.club_id, ARRAY[NEW.player_user_id], 'salud_receta',
    'Nueva receta o tratamiento',
    NEW.medication || COALESCE(' · ' || NEW.dosage, ''),
    'salud', COALESCE(NEW.checkup_id, NEW.id)
  );
  RETURN NEW;
END;
$$;
CREATE TRIGGER trg_notify_prescription_created AFTER INSERT ON public.medical_prescriptions
  FOR EACH ROW EXECUTE FUNCTION public.notify_prescription_created();

CREATE OR REPLACE FUNCTION public.notify_injury_created()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM public.notify_users(
    NEW.club_id, ARRAY[NEW.player_user_id], 'salud_lesion',
    'Se registró una lesión en tu expediente',
    NEW.injury_type || ' · ' || NEW.body_part,
    'salud', NEW.id
  );
  RETURN NEW;
END;
$$;
CREATE TRIGGER trg_notify_injury_created AFTER INSERT ON public.injuries
  FOR EACH ROW EXECUTE FUNCTION public.notify_injury_created();

-- El rol Médico aprueba solicitudes médicas por default
INSERT INTO public.role_request_approvals (role_id, request_type)
SELECT r.id, 'medica'::public.request_type
FROM public.roles r
WHERE lower(COALESCE(r.base_role, r.name)) IN ('medico','médico')
  AND NOT EXISTS (
    SELECT 1 FROM public.role_request_approvals x
    WHERE x.role_id = r.id AND x.request_type = 'medica'
  );
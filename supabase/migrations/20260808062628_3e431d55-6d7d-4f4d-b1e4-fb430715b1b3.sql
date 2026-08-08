-- =========================================================
-- PARTE 1: nueva escala de permisos, en paralelo
-- =========================================================

CREATE TYPE public.permission_level AS ENUM (
  'sin_acceso',
  'vista_jugador',
  'lector_categoria',
  'lector_global',
  'editor_categoria',
  'editor_global'
);

ALTER TABLE public.role_permissions
  ADD COLUMN level public.permission_level NOT NULL DEFAULT 'sin_acceso';

ALTER TABLE public.user_permission_overrides
  ADD COLUMN level public.permission_level NOT NULL DEFAULT 'sin_acceso';

-- ---------------------------------------------------------
-- Tabla de permisos por defecto de los roles del sistema
-- ---------------------------------------------------------
CREATE TEMP TABLE _defaults(base_role text, module_key text, lvl public.permission_level) ON COMMIT DROP;

INSERT INTO _defaults(base_role, module_key, lvl) VALUES
-- ADMIN
('admin','plantel','editor_global'),('admin','salud','editor_global'),('admin','desarrollo','editor_global'),
('admin','nutricion','editor_global'),('admin','entrenamientos','editor_global'),('admin','tacticas','editor_global'),
('admin','torneo','editor_global'),('admin','comunicados','editor_global'),('admin','viajes','editor_global'),
('admin','agenda','editor_global'),('admin','mes','editor_global'),('admin','documentos','editor_global'),
('admin','inventario','editor_global'),('admin','compras_facturas','editor_global'),('admin','solicitudes','editor_global'),
('admin','usuarios','editor_global'),('admin','coordinacion_interna','editor_global'),('admin','multimedia','editor_global'),
-- JUGADOR
('jugador','plantel','vista_jugador'),('jugador','salud','vista_jugador'),('jugador','desarrollo','vista_jugador'),
('jugador','nutricion','vista_jugador'),('jugador','entrenamientos','vista_jugador'),('jugador','tacticas','vista_jugador'),
('jugador','torneo','vista_jugador'),('jugador','comunicados','vista_jugador'),('jugador','viajes','vista_jugador'),
('jugador','agenda','vista_jugador'),('jugador','mes','vista_jugador'),('jugador','documentos','sin_acceso'),
('jugador','inventario','sin_acceso'),('jugador','compras_facturas','sin_acceso'),('jugador','solicitudes','lector_global'),
('jugador','usuarios','sin_acceso'),('jugador','coordinacion_interna','sin_acceso'),('jugador','multimedia','vista_jugador'),
-- MEDICO
('medico','plantel','lector_categoria'),('medico','salud','editor_categoria'),('medico','desarrollo','sin_acceso'),
('medico','nutricion','editor_categoria'),('medico','entrenamientos','lector_categoria'),('medico','tacticas','sin_acceso'),
('medico','torneo','lector_categoria'),('medico','comunicados','lector_categoria'),('medico','viajes','lector_categoria'),
('medico','agenda','lector_categoria'),('medico','mes','lector_categoria'),('medico','documentos','lector_categoria'),
('medico','inventario','lector_global'),('medico','compras_facturas','sin_acceso'),('medico','solicitudes','lector_global'),
('medico','usuarios','sin_acceso'),('medico','coordinacion_interna','lector_global'),('medico','multimedia','lector_categoria'),
-- TECNICO
('tecnico','plantel','editor_categoria'),('tecnico','salud','sin_acceso'),('tecnico','desarrollo','editor_categoria'),
('tecnico','nutricion','sin_acceso'),('tecnico','entrenamientos','editor_categoria'),('tecnico','tacticas','editor_categoria'),
('tecnico','torneo','editor_categoria'),('tecnico','comunicados','editor_categoria'),('tecnico','viajes','lector_categoria'),
('tecnico','agenda','editor_categoria'),('tecnico','mes','editor_categoria'),('tecnico','documentos','lector_categoria'),
('tecnico','inventario','lector_global'),('tecnico','compras_facturas','sin_acceso'),('tecnico','solicitudes','lector_global'),
('tecnico','usuarios','sin_acceso'),('tecnico','coordinacion_interna','lector_global'),('tecnico','multimedia','lector_categoria'),
-- STAFF
('staff','plantel','lector_categoria'),('staff','salud','sin_acceso'),('staff','desarrollo','sin_acceso'),
('staff','nutricion','sin_acceso'),('staff','entrenamientos','lector_categoria'),('staff','tacticas','sin_acceso'),
('staff','torneo','lector_categoria'),('staff','comunicados','lector_categoria'),('staff','viajes','editor_categoria'),
('staff','agenda','lector_categoria'),('staff','mes','lector_categoria'),('staff','documentos','lector_categoria'),
('staff','inventario','editor_global'),('staff','compras_facturas','editor_global'),('staff','solicitudes','editor_global'),
('staff','usuarios','sin_acceso'),('staff','coordinacion_interna','lector_global'),('staff','multimedia','lector_categoria');

-- Roles del sistema con base_role conocido -> tabla por defecto
UPDATE public.role_permissions rp
SET level = d.lvl
FROM public.roles r, _defaults d
WHERE rp.role_id = r.id
  AND lower(r.base_role) = d.base_role
  AND rp.module_key = d.module_key;

-- Roles restantes (custom o módulos fuera de la tabla) -> traducción determinista
UPDATE public.role_permissions rp
SET level = CASE
  WHEN rp.access_level = 'none' THEN 'sin_acceso'::public.permission_level
  WHEN rp.access_level = 'read' AND rp.module_key IN
    ('inventario','compras_facturas','solicitudes','documentos','usuarios','coordinacion_interna','torneo','comunicados')
    THEN 'lector_global'::public.permission_level
  WHEN rp.access_level = 'read' THEN 'lector_categoria'::public.permission_level
  WHEN rp.module_key IN
    ('inventario','compras_facturas','solicitudes','documentos','usuarios','coordinacion_interna','torneo','comunicados')
    THEN 'editor_global'::public.permission_level
  ELSE 'editor_categoria'::public.permission_level
END
FROM public.roles r
WHERE rp.role_id = r.id
  AND NOT EXISTS (
    SELECT 1 FROM _defaults d WHERE d.base_role = lower(r.base_role) AND d.module_key = rp.module_key
  );

-- Overrides por usuario
UPDATE public.user_permission_overrides o
SET level = CASE
  WHEN o.access_level = 'none' THEN 'sin_acceso'::public.permission_level
  WHEN o.module_key IN ('salud','desarrollo','nutricion')
       AND o.access_level = 'read'
       AND EXISTS (
         SELECT 1 FROM public.team_memberships tm JOIN public.roles r2 ON r2.id = tm.role_id
         WHERE tm.user_id = o.user_id
       )
       AND NOT EXISTS (
         SELECT 1 FROM public.team_memberships tm JOIN public.roles r2 ON r2.id = tm.role_id
         WHERE tm.user_id = o.user_id AND lower(coalesce(r2.base_role,'')) <> 'jugador'
       )
    THEN 'vista_jugador'::public.permission_level
  WHEN o.access_level = 'read' AND o.module_key IN
    ('inventario','compras_facturas','solicitudes','documentos','usuarios','coordinacion_interna','torneo','comunicados')
    THEN 'lector_global'::public.permission_level
  WHEN o.access_level = 'read' THEN 'lector_categoria'::public.permission_level
  WHEN o.module_key IN
    ('inventario','compras_facturas','solicitudes','documentos','usuarios','coordinacion_interna','torneo','comunicados')
    THEN 'editor_global'::public.permission_level
  ELSE 'editor_categoria'::public.permission_level
END;

-- Aprobadores vigentes: garantizar nivel de editor en el módulo correspondiente
UPDATE public.role_permissions rp
SET level = 'editor_global'
FROM public.role_request_approvals a
WHERE a.role_id = rp.role_id
  AND rp.module_key = public.request_approver_module(a.request_type)
  AND rp.level NOT IN ('editor_categoria','editor_global');

UPDATE public.user_permission_overrides o
SET level = 'editor_global'
FROM public.request_type_user_overrides ro
WHERE ro.user_id = o.user_id
  AND ro.mode = 'grant'
  AND o.module_key = public.request_approver_module(ro.request_type)
  AND o.level NOT IN ('editor_categoria','editor_global');

-- ---------------------------------------------------------
-- Verificaciones (abortan la migración si fallan)
-- ---------------------------------------------------------
DO $$
DECLARE n int;
BEGIN
  SELECT count(*) INTO n FROM public.role_permissions WHERE level IS NULL;
  IF n > 0 THEN RAISE EXCEPTION 'role_permissions con level nulo: %', n; END IF;

  SELECT count(*) INTO n FROM public.user_permission_overrides WHERE level IS NULL;
  IF n > 0 THEN RAISE EXCEPTION 'user_permission_overrides con level nulo: %', n; END IF;

  SELECT count(*) INTO n
  FROM public.role_permissions rp
  WHERE rp.access_level <> 'none' AND rp.level = 'sin_acceso';
  IF n > 0 THEN RAISE EXCEPTION 'roles que perderian acceso: %', n; END IF;

  SELECT count(*) INTO n
  FROM public.user_permission_overrides o
  WHERE o.access_level <> 'none' AND o.level = 'sin_acceso';
  IF n > 0 THEN RAISE EXCEPTION 'overrides que perderian acceso: %', n; END IF;

  SELECT count(*) INTO n
  FROM public.role_request_approvals a
  JOIN public.role_permissions rp
    ON rp.role_id = a.role_id AND rp.module_key = public.request_approver_module(a.request_type)
  WHERE rp.level NOT IN ('editor_categoria','editor_global');
  IF n > 0 THEN RAISE EXCEPTION 'aprobadores sin nivel de editor: %', n; END IF;
END $$;

-- ---------------------------------------------------------
-- Funciones helper nuevas (nadie las consume todavia)
-- ---------------------------------------------------------
CREATE OR REPLACE FUNCTION public.effective_permission(_user_id uuid, _module_key text, _team_id uuid)
RETURNS public.permission_level
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE
    WHEN public.is_super_admin(_user_id) THEN 'editor_global'::public.permission_level
    ELSE COALESCE(
      -- override de categoria (mas especifico)
      (SELECT o.level FROM public.user_permission_overrides o
        WHERE o.user_id = _user_id AND o.module_key = _module_key
          AND _team_id IS NOT NULL AND o.team_id = _team_id
        LIMIT 1),
      -- override club-wide
      (SELECT o.level FROM public.user_permission_overrides o
        WHERE o.user_id = _user_id AND o.module_key = _module_key AND o.team_id IS NULL
        LIMIT 1),
      -- maximo entre las membresias aplicables
      (SELECT max(rp.level) FROM public.team_memberships tm
        JOIN public.role_permissions rp ON rp.role_id = tm.role_id AND rp.module_key = _module_key
        WHERE tm.user_id = _user_id
          AND (tm.team_id IS NULL OR _team_id IS NULL OR tm.team_id = _team_id)),
      'sin_acceso'::public.permission_level
    )
  END
$$;

CREATE OR REPLACE FUNCTION public.can_view_module(_user_id uuid, _module_key text, _team_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT public.effective_permission(_user_id, _module_key, _team_id) <> 'sin_acceso'
$$;

CREATE OR REPLACE FUNCTION public.can_edit_module(_user_id uuid, _module_key text, _team_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT public.effective_permission(_user_id, _module_key, _team_id)
         IN ('editor_categoria','editor_global')
$$;

CREATE OR REPLACE FUNCTION public.can_view_own_row(_user_id uuid, _module_key text, _owner_id uuid, _team_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT CASE public.effective_permission(_user_id, _module_key, _team_id)
    WHEN 'sin_acceso' THEN false
    WHEN 'vista_jugador' THEN _owner_id = _user_id
    ELSE true
  END
$$;

CREATE OR REPLACE FUNCTION public.max_permission_any_team(_user_id uuid, _module_key text)
RETURNS public.permission_level
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT CASE
    WHEN public.is_super_admin(_user_id) THEN 'editor_global'::public.permission_level
    ELSE COALESCE(
      (SELECT max(lvl) FROM (
         SELECT public.effective_permission(_user_id, _module_key, tm.team_id) AS lvl
         FROM public.team_memberships tm WHERE tm.user_id = _user_id
         UNION ALL
         SELECT public.effective_permission(_user_id, _module_key, NULL)
       ) s),
      'sin_acceso'::public.permission_level
    )
  END
$$;
# Permisos: la base de datos como única fuente de verdad (puntos 1 y 4)

## Problema
`useAccess.ts` recalcula los permisos en el navegador a partir de membresías y overrides, y esa copia ya no coincide con `effective_permission` (la regla que usa la base de datos):
- **Punto 1:** quien tiene `lector_global` / `editor_global` en una membresía de equipo no ve las demás categorías en los selectores.
- **Punto 4:** los overrides por categoría solo se aplican a equipos donde el usuario tiene membresía.

## Solución
Una sola llamada a la base de datos devuelve los equipos accesibles y el nivel efectivo por módulo (calculado con `effective_permission`). El hook solo lee ese resultado.

### SQL de la función

```sql
CREATE OR REPLACE FUNCTION public.get_my_access(p_club_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_super boolean;
  v_modules text[];
  v_club jsonb;
  v_teams jsonb;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;

  v_super := public.is_super_admin(v_uid);

  -- Solo su propio club (o cualquiera si es super admin).
  IF NOT v_super AND NOT EXISTS (
    SELECT 1 FROM profiles WHERE id = v_uid AND club_id = p_club_id
  ) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  -- Módulos conocidos del club: los que aparecen en permisos de sus roles.
  SELECT coalesce(array_agg(DISTINCT rp.module_key), '{}')
    INTO v_modules
    FROM role_permissions rp
    JOIN roles r ON r.id = rp.role_id
   WHERE r.club_id = p_club_id;

  -- Nivel club-wide (team_id NULL) por módulo.
  SELECT coalesce(jsonb_object_agg(m, effective_permission(v_uid, m, NULL)), '{}'::jsonb)
    INTO v_club
    FROM unnest(v_modules) AS m;

  -- Todos los equipos del club, con su nivel por módulo; solo se devuelven
  -- los que tienen al menos lectura en algún módulo.
  WITH per_team AS (
    SELECT t.id, t.name, t.category, t.display_order, t.is_primary,
           jsonb_object_agg(m, effective_permission(v_uid, m, t.id)) AS levels,
           bool_or(effective_permission(v_uid, m, t.id) <> 'sin_acceso') AS any_access
      FROM teams t
      CROSS JOIN unnest(v_modules) AS m
     WHERE t.club_id = p_club_id
     GROUP BY t.id
  )
  SELECT coalesce(jsonb_agg(jsonb_build_object(
           'id', id, 'name', name, 'category', category,
           'display_order', display_order, 'is_primary', is_primary,
           'levels', levels)
         ORDER BY is_primary DESC, display_order, name), '[]'::jsonb)
    INTO v_teams
    FROM per_team
   WHERE any_access;

  RETURN jsonb_build_object(
    'is_super_admin', v_super,
    'club_levels', v_club,
    'teams', v_teams
  );
END;
$$;

REVOKE ALL ON FUNCTION public.get_my_access(uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.get_my_access(uuid) TO authenticated;
```

Usa `auth.uid()`; no recibe ningún user_id. No se cambian políticas RLS ni `effective_permission`.

### `src/hooks/useAccess.ts`
- Sigue leyendo perfil/club y las membresías propias (solo para nombres de rol, rol base, `teams` e `isPlayerOnly`, que alimentan el mapa de páginas).
- Llama a `get_my_access(club_id)`:
  - `teamOptions` = equipos de la función (con el rol de la membresía correspondiente: la del equipo o, si no hay, la club-wide).
  - `permissionsByTeam` = `{ club: club_levels, [teamId]: levels }`.
  - `permissions` = mejor nivel entre todos los contextos; `globalPermissions` = los niveles `lector_global` / `editor_global`.
  - `isSuperAdmin` de la función; `primaryTeamId` igual que hoy.
- Se elimina el cálculo manual con `byMembership` / `overridesByTeam`.
- Misma clave de caché (`squad-access`) y mismo tipo `AccessData`: ningún campo cambia de nombre.

### `src/hooks/useTeamAccess.ts` / `useEditableTeams.ts`
Siguen leyendo `permissionsByTeam` y `globalPermissions` del contexto. Como ahora cada equipo trae su nivel ya resuelto, la combinación manual "global > equipo > club" se queda solo como respaldo; no se vuelve a calcular la lógica.

### Caché e invalidación
Se mantiene la escucha en tiempo real actual (roles, permisos de rol, overrides y membresías del usuario) y se agrega:
- `addMembership` / `updateMembership` / `removeMembership` (ficha de Usuarios): invalidar `squad-access`.
- Ajustes avanzados (overrides): ya invalida; se confirma.
- Matriz de permisos por rol: ya invalida; se confirma.

## Un cambio de comportamiento a revisar
En el contexto club-wide, `effective_permission(..., NULL)` suma también las membresías de equipo, mientras que hoy el navegador solo usa las club-wide. En módulos de ámbito club (Coordinación, Solicitudes, etc.), alguien con membresía solo de equipo verá el nivel que la base de datos ya le permite. Así queda alineado con el servidor; las políticas no cambian.

## Quién depende de esto (interfaz pública sin cambios)
- `useAccess` lo usa solo `AppLayout.tsx`, que lo pasa al contexto (`app-context.tsx`: `teamOptions`, `primaryTeamId`, `permissionsByTeam`, `globalPermissions`, `permissions`, `isSuperAdmin`, `isPlayerOnly`, `getModuleAccess`, `canViewModule`, `canEditModule`). El hook no tiene helpers `can()` propios; esos helpers están en el contexto y no cambian.
- Por el contexto, `useTeamAccess`, `useEditableTeams`, `TeamFilter`, `TeamSelectField`, `useClubNextMatch` y estas pantallas: Agenda, Mes, Comunicados, Coordinación, Desarrollo, Documentos, Entrenamientos, Multimedia y su gestión, Nutrición, Partidos, Plantel y expediente, Salud, Solicitudes, Torneo y admin de Torneo, Viajes, y los formularios y fichas de Calendario, Comunicados, Desarrollo, Documentos, Entrenamientos, Multimedia, Plantel, Solicitudes, Torneo y Viajes.
- Invalidación: `UserAdvancedSettings.tsx`, `RolePermissionsMatrix.tsx`, `mi-perfil.tsx`, `MembersTab.tsx`.

## Archivos que se modifican
- Migración nueva: `get_my_access`
- `src/hooks/useAccess.ts`
- `src/hooks/useTeamAccess.ts` y `src/hooks/useEditableTeams.ts` (solo comentarios o simplificación; misma firma)
- `src/components/usuarios/MembersTab.tsx` (invalidar acceso tras cambios de membresía)

## Verificación
- Un usuario con `editor_global` en una sola categoría ve todas las categorías en los selectores.
- Un override por categoría en un equipo donde no tiene membresía se refleja en ese equipo.
- Comparar con consultas a la base de datos que `permissionsByTeam` coincide con `effective_permission` para 2-3 usuarios.

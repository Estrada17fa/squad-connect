# Permisos: la base de datos como única fuente de verdad (puntos 1 y 4)

## Problema
`useAccess.ts` recalcula los permisos en el navegador y esa copia ya no coincide con `effective_permission`:
- **Punto 1:** quien tiene `lector_global` / `editor_global` en una membresía de equipo no ve las demás categorías en los selectores.
- **Punto 4:** los overrides por categoría solo se aplican a equipos donde el usuario tiene membresía.

## Confirmaciones
- **Un solo club por usuario.** `profiles.club_id` es único y `has_club_access` solo compara contra ese club, salvo los super admin. Ninguna membresía actual apunta a otro club. La función valida con `has_club_access` y además exige al menos una membresía cuyo rol pertenezca a `p_club_id`.
- **Enum:** `sin_acceso`, `vista_jugador`, `lector_categoria`, `lector_global`, `editor_categoria`, `editor_global`. `teams` no tiene campo de archivado ni de inactividad, así que no hay equipos que excluir.
- **Módulos:** no hay tabla de módulos en la base de datos; la lista canónica es la constante `MODULES` de la app. La función usa la unión de `role_permissions` (roles del club) y `user_permission_overrides` (del usuario). En la app, cualquier módulo de `MODULES` que no llegue se toma como `sin_acceso`.

## Decisión: contexto club = `effective_permission(uid, módulo, NULL)`
`permissionsByTeam.club = club_levels` (unión de membresías, igual que el servidor).

**Nadie pierde acceso en la interfaz.** Para quien no es solo jugador, el menú ya usa hoy la unión de todas sus membresías, que coincide con `club_levels`. Un Jugador con una sola categoría hoy tiene el contexto club vacío; con `club_levels` recibe `vista_jugador` en Solicitudes y Comunicados. Es una ganancia que coincide con lo que la base de datos ya permite. Los niveles de su propia categoría no cambian.

| Rol (una sola categoría) | Coordinación | Solicitudes | Compras | Documentos | Usuarios | Comunicados |
|---|---|---|---|---|---|---|
| Técnico | editor_categoria | editor_categoria | sin_acceso | lector_categoria | sin_acceso | editor_categoria |
| Médico | editor_categoria | editor_categoria | sin_acceso | lector_categoria | sin_acceso | lector_categoria |
| Staff | editor_categoria | editor_categoria | editor_categoria | lector_categoria | sin_acceso | lector_categoria |
| Jugador | sin_acceso | vista_jugador | sin_acceso | sin_acceso | sin_acceso | vista_jugador |

## Diagnóstico de reglas de la base de datos (solo lectura, no se cambia nada)
Caso: Técnico con membresía solo en Sub-15.

| Módulo | Puede LEER | Puede EDITAR o BORRAR |
|---|---|---|
| Coordinación (tareas y juntas) | Las de Sub-15, **todas las de "Todo el club" de cualquier autor** y aquellas donde está asignado o invitado. No ve las de otras categorías. | Las de Sub-15 y **todas las de "Todo el club", aunque sean de otros**. También las tareas donde está asignado. |
| Solicitudes | Las suyas, las de Sub-15, **todas las de "Todo el club" de otras personas** y las de los tipos que puede aprobar. | Las de Sub-15 y **todas las de "Todo el club" de otras personas, incluido borrarlas**. Las suyas mientras están pendientes. |
| Compras y facturas | Nada (necesita `lector_global`). | Nada (necesita `editor_global`). |
| Documentos | Los no personales de Sub-15, **todos los no personales de "Todo el club"** y sus propios documentos personales. No ve los personales de otros. | Nada (es lector). |
| Comunicados | Los de todo el club, los de Sub-15 y los suyos. | Crear y editar en Sub-15, **incluso los de otros autores**, si todos sus equipos son editables por él. No puede publicar a todo el club. |

Hallazgos para decidir después (no se tocan en este cambio):
1. Con `editor_categoria`, un editor de categoría puede editar y borrar los registros sin categoría ("Todo el club") de Coordinación y Solicitudes. Esto pasa porque `coord_scope_ok` y `request_scope_ok` devuelven verdadero cuando `team_id` es nulo.
2. En Solicitudes eso incluye modificar o borrar solicitudes ajenas sin categoría, como reembolsos o permisos.
3. Staff tiene `editor_categoria` en Compras, pero la base de datos exige nivel global: verá el módulo, pero vacío.
4. En Comunicados, un editor de la categoría puede editar los comunicados de otros autores en esa categoría.

## SQL de la función

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
  v_result jsonb;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'not authenticated' USING ERRCODE = '28000';
  END IF;

  v_super := public.is_super_admin(v_uid);

  IF NOT v_super AND NOT (
    public.has_club_access(v_uid, p_club_id)
    AND EXISTS (
      SELECT 1 FROM team_memberships tm
      JOIN roles r ON r.id = tm.role_id
      WHERE tm.user_id = v_uid AND r.club_id = p_club_id
    )
  ) THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;

  WITH modules AS (
    SELECT rp.module_key AS m
      FROM role_permissions rp
      JOIN roles r ON r.id = rp.role_id
     WHERE r.club_id = p_club_id
    UNION
    SELECT o.module_key
      FROM user_permission_overrides o
     WHERE o.user_id = v_uid
  ),
  -- effective_permission se calcula UNA vez por (equipo, módulo).
  team_levels AS (
    SELECT t.id AS team_id, mo.m,
           public.effective_permission(v_uid, mo.m, t.id) AS lvl
      FROM teams t
      CROSS JOIN modules mo
     WHERE t.club_id = p_club_id
  ),
  per_team AS (
    SELECT team_id,
           jsonb_object_agg(m, lvl) AS levels,
           bool_or(lvl <> 'sin_acceso'::permission_level) AS any_access
      FROM team_levels
     GROUP BY team_id
  ),
  club_levels AS (
    SELECT jsonb_object_agg(m, public.effective_permission(v_uid, m, NULL)) AS levels
      FROM modules
  )
  SELECT jsonb_build_object(
    'is_super_admin', v_super,
    'club_levels', COALESCE((SELECT levels FROM club_levels), '{}'::jsonb),
    'teams', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
               'id', t.id, 'name', t.name, 'category', t.category,
               'display_order', t.display_order, 'is_primary', t.is_primary,
               'levels', pt.levels)
             ORDER BY t.is_primary DESC, t.display_order, t.name)
        FROM per_team pt
        JOIN teams t ON t.id = pt.team_id
       WHERE pt.any_access
    ), '[]'::jsonb)
  ) INTO v_result;

  RETURN v_result;
END;
$$;

REVOKE ALL ON FUNCTION public.get_my_access(uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.get_my_access(uuid) TO authenticated;
```

Usa `auth.uid()`; no recibe ningún user_id. No cambian las reglas RLS ni `effective_permission`.

## Cambios en la app

### `src/hooks/useAccess.ts`
- Sigue leyendo perfil y club, y las membresías propias, solo para nombres de rol, rol base, `teams` e `isPlayerOnly` (mapa de páginas).
- Llama a `get_my_access(club_id)`:
  - `teamOptions` = equipos de la función. El rol mostrado es el de la membresía de ese equipo o, si no hay, el club-wide.
  - `permissionsByTeam` = `{ club: club_levels, [teamId]: levels }`.
  - `permissions` = mejor nivel entre todos los contextos; `globalPermissions` = niveles `lector_global` / `editor_global`.
  - `isSuperAdmin` y `primaryTeamId` como hoy.
- Se elimina el cálculo manual con `byMembership` / `overridesByTeam`.
- Misma clave de caché (`squad-access`) y mismo tipo `AccessData` (solo se agrega `noMemberships`).
- Si la función responde `forbidden` (sin membresías en el club, por ejemplo porque le quitaron la última), el hook devuelve acceso vacío con `noMemberships: true` en vez de lanzar un error. `AppLayout` muestra "No tienes categorías asignadas, contacta al administrador" con el botón Cerrar sesión, sin romper la app.

### `src/hooks/useTeamAccess.ts` y `src/hooks/useEditableTeams.ts`
Sin respaldo "global > equipo > club": leen solo lo que devolvió la función.
- `levelForTeam(teamId)` = `permissionsByTeam[teamId][módulo]`; sin `teamId`, usa `permissionsByTeam.club`. Un equipo ausente queda en `sin_acceso`.
- `useEditableTeams` = equipos de `teamOptions` cuyo nivel propio permite editar.
- Mismas firmas y helpers: `levelForTeam`, `canEditTeam`, `canReadTeam`, `isPlayerScoped`, `onlyOwnRows`.

### Caché e invalidación
Siguen las escuchas en tiempo real (roles, permisos de rol, overrides y membresías del usuario), y además:
- `addMembership` / `updateMembership` / `removeMembership` en la ficha de Usuarios invalidan `squad-access`.
- Ajustes avanzados (overrides) y la matriz de permisos ya invalidan; se mantiene.

## Quién depende de esto (interfaz pública sin cambios)
- `useAccess` lo usa solo `AppLayout.tsx`, que llena el contexto (`app-context.tsx`) con:
  - `teamOptions`, `primaryTeamId`, `permissionsByTeam`, `globalPermissions`, `permissions`, `isSuperAdmin` e `isPlayerOnly`.
  - Los helpers `getModuleAccess`, `canViewModule` y `canEditModule`, que no cambian.
- Leen del contexto `useTeamAccess`, `useEditableTeams`, `TeamFilter`, `TeamSelectField` y `useClubNextMatch`. También estas pantallas:
  - Agenda, Mes, Comunicados, Coordinación, Desarrollo, Documentos y Entrenamientos.
  - Multimedia y su gestión, Nutrición, Partidos, y Plantel con su expediente.
  - Salud, Solicitudes, Torneo y admin de Torneo, y Viajes.
  - Los formularios y fichas de Calendario, Comunicados, Desarrollo, Documentos, Entrenamientos, Multimedia, Plantel, Solicitudes, Torneo y Viajes.
- Invalidan la caché: `UserAdvancedSettings.tsx`, `RolePermissionsMatrix.tsx`, `mi-perfil.tsx` y `MembersTab.tsx`.

## Archivos
- Migración nueva: `get_my_access`
- `src/hooks/useAccess.ts`
- `src/components/squad/AppLayout.tsx` (pantalla "sin categorías")
- `src/hooks/useTeamAccess.ts`
- `src/hooks/useEditableTeams.ts`
- `src/components/usuarios/MembersTab.tsx`

## Verificación
- Un usuario con `editor_global` en una sola categoría ve todas las categorías en los selectores.
- Un override por categoría en un equipo sin membresía se refleja en ese equipo.
- Para 2 o 3 usuarios, `permissionsByTeam` coincide con `effective_permission` consultado en la base de datos.
- Un usuario sin membresías ve el mensaje "No tienes categorías asignadas" en vez de un error.

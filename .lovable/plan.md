# Permisos: la base de datos como única fuente de verdad (puntos 1 y 4)

## Problema
`useAccess.ts` recalcula los permisos en el navegador a partir de membresías y overrides, y esa copia ya no coincide con `effective_permission`:
- **Punto 1:** quien tiene `lector_global` / `editor_global` en una membresía de equipo no ve las demás categorías en los selectores.
- **Punto 4:** los overrides por categoría solo se aplican a equipos donde el usuario tiene membresía.

## Respuestas a las preguntas

**Multi-club (punto 3).** Hoy un usuario pertenece a un solo club: `profiles.club_id` es único y `has_club_access` (que usa `effective_permission`) solo compara contra ese club, salvo los super admin. En la base de datos no hay ninguna membresía cuyo rol o equipo sea de otro club distinto al de su perfil. La función valida con `has_club_access` (la misma regla que `effective_permission`) y además exige al menos una membresía cuyo rol pertenezca a `p_club_id`. Si algún día se permiten varios clubes, solo hay que cambiar esa validación.

**Enum (punto 5).** Los valores exactos de `permission_level` son `sin_acceso`, `vista_jugador`, `lector_categoria`, `lector_global`, `editor_categoria` y `editor_global`. La tabla `teams` no tiene campo de archivado ni de inactividad (`id, club_id, name, category, created_at, display_order, is_primary`), así que no hay equipos que excluir.

**Lista de módulos (punto 2).** No existe una tabla de módulos en la base de datos; la lista canónica es la constante `MODULES` de la app. La función usa la unión de `role_permissions` (roles del club) y `user_permission_overrides` (del usuario), así un override sobre un módulo que ningún rol tiene no se pierde. Del lado de la app, cualquier módulo de `MODULES` que no llegue se toma como `sin_acceso`.

## Tabla del punto 1 (decisión pendiente, no se aplica nada)

Nivel que obtiene HOY un usuario con membresía SOLO de equipo en los módulos de ámbito club, según `effective_permission(uid, módulo, NULL)` (club Los Cabos United, sin overrides). La última columna muestra qué recibiría si `team_id NULL` solo considerara membresías club-wide.

| Rol | Coordinación | Solicitudes | Compras | Documentos | Usuarios | Comunicados | Solo club-wide |
|---|---|---|---|---|---|---|---|
| Admin | editor_global | editor_global | editor_global | editor_global | editor_global | editor_global | igual (los niveles `_global` siempre cuentan) |
| Técnico | editor_categoria | editor_categoria | sin_acceso | lector_categoria | sin_acceso | editor_categoria | todo sin_acceso |
| Médico | editor_categoria | editor_categoria | sin_acceso | lector_categoria | sin_acceso | lector_categoria | todo sin_acceso |
| Staff | editor_categoria | editor_categoria | editor_categoria | lector_categoria | sin_acceso | lector_categoria | todo sin_acceso |
| Jugador | sin_acceso | vista_jugador | sin_acceso | sin_acceso | sin_acceso | vista_jugador | todo sin_acceso |

A tomar en cuenta: con la opción "solo club-wide", un Técnico o Médico de una sola categoría perdería Coordinación y Solicitudes, y un Jugador perdería "Mis solicitudes" y Comunicados, salvo que se le dé una membresía "Todo el club" o un override. Hoy la app ya muestra esos módulos a quienes no son jugadores porque usa la unión de sus membresías. **Mientras no decidas, la app conserva para el contexto club el cálculo actual (solo membresías club-wide más overrides club-wide, unidos a los niveles globales)**, que ya devuelve la función como un campo aparte; no se cambia `effective_permission`.

## SQL actualizado

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
  -- Contexto club según effective_permission(uid, m, NULL).
  club_levels AS (
    SELECT jsonb_object_agg(m, public.effective_permission(v_uid, m, NULL)) AS levels
      FROM modules
  ),
  -- Contexto club "solo club-wide": membresías sin equipo + overrides sin equipo.
  -- Es el cálculo que la app usa hoy; se devuelve aparte hasta decidir la tabla.
  club_only AS (
    SELECT jsonb_object_agg(m, lvl) AS levels FROM (
      SELECT mo.m,
             COALESCE(
               (SELECT o.level FROM user_permission_overrides o
                 WHERE o.user_id = v_uid AND o.module_key = mo.m AND o.team_id IS NULL
                 LIMIT 1),
               (SELECT max(rp.level) FROM team_memberships tm
                  JOIN role_permissions rp ON rp.role_id = tm.role_id AND rp.module_key = mo.m
                 WHERE tm.user_id = v_uid AND tm.team_id IS NULL),
               'sin_acceso'::permission_level
             ) AS lvl
        FROM modules mo
    ) s
  )
  SELECT jsonb_build_object(
    'is_super_admin', v_super,
    'club_levels', COALESCE((SELECT levels FROM club_levels), '{}'::jsonb),
    'club_only_levels', COALESCE((SELECT levels FROM club_only), '{}'::jsonb),
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

Usa `auth.uid()`, sin user_id recibido. No se cambian RLS ni `effective_permission`. Para un super admin, `effective_permission` ya devuelve `editor_global` en todo.

## Cambios en la app

### `src/hooks/useAccess.ts`
- Sigue leyendo perfil/club y las membresías propias solo para nombres de rol, rol base, `teams` e `isPlayerOnly` (mapa de páginas).
- Llama a `get_my_access(club_id)`:
  - `teamOptions` = equipos de la función (rol mostrado: el de la membresía del equipo o, si no hay, el club-wide).
  - `permissionsByTeam` = `{ club: club_only_levels (hasta que decidas), [teamId]: levels }`.
  - `permissions` = mejor nivel entre todos los contextos; `globalPermissions` = niveles `lector_global` / `editor_global`.
  - `isSuperAdmin` y `primaryTeamId` como hoy.
- Se elimina el cálculo manual con `byMembership` / `overridesByTeam`.
- Misma clave de caché (`squad-access`) y mismo tipo `AccessData`.

### `src/hooks/useTeamAccess.ts` y `src/hooks/useEditableTeams.ts`
Sin lógica de respaldo "global > equipo > club": leen solo lo que devolvió la función.
- `levelForTeam(teamId)` = `permissionsByTeam[teamId][módulo]`; con `teamId` vacío usa `permissionsByTeam.club`. Un equipo que no aparece queda en `sin_acceso`.
- `useEditableTeams` = equipos de `teamOptions` cuyo nivel propio permite editar.
- Se mantienen las mismas firmas y helpers (`levelForTeam`, `canEditTeam`, `canReadTeam`, `isPlayerScoped`, `onlyOwnRows`).

### Caché e invalidación
Siguen activas las escuchas en tiempo real (roles, permisos de rol, overrides y membresías del usuario), y además:
- `addMembership` / `updateMembership` / `removeMembership` en la ficha de Usuarios invalidan `squad-access`.
- Ajustes avanzados (overrides) y la matriz de permisos ya invalidan; se mantiene.

## Quién depende de esto (interfaz pública sin cambios)
- `useAccess`: solo `AppLayout.tsx`, que llena el contexto (`app-context.tsx`) con `teamOptions`, `primaryTeamId`, `permissionsByTeam`, `globalPermissions`, `permissions`, `isSuperAdmin`, `isPlayerOnly`, `getModuleAccess`, `canViewModule` y `canEditModule`. Los helpers `can…` viven en el contexto y no cambian.
- Leen del contexto: `useTeamAccess`, `useEditableTeams`, `TeamFilter`, `TeamSelectField` y `useClubNextMatch`. También estas pantallas:
  - Agenda, Mes, Comunicados, Coordinación, Desarrollo, Documentos y Entrenamientos.
  - Multimedia y su gestión, Nutrición, Partidos, y Plantel con su expediente.
  - Salud, Solicitudes, Torneo y admin de Torneo, y Viajes.
  - Los formularios y fichas de Calendario, Comunicados, Desarrollo, Documentos, Entrenamientos, Multimedia, Plantel, Solicitudes, Torneo y Viajes.
- Invalidación: `UserAdvancedSettings.tsx`, `RolePermissionsMatrix.tsx`, `mi-perfil.tsx` y `MembersTab.tsx`.

## Archivos
- Migración nueva: `get_my_access`
- `src/hooks/useAccess.ts`
- `src/hooks/useTeamAccess.ts`
- `src/hooks/useEditableTeams.ts`
- `src/components/usuarios/MembersTab.tsx`

## Verificación
- Un usuario con `editor_global` en una sola categoría ve todas las categorías en los selectores.
- Un override por categoría en un equipo sin membresía se refleja en ese equipo.
- Para 2 o 3 usuarios, `permissionsByTeam` coincide con `effective_permission` consultado en la base de datos.

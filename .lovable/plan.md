
# Fundación multi-club y multi-categoría

Objetivo: dejar la base lista para que en el futuro varios clubes convivan en Squad sin verse entre sí, y para que dentro de un club las categorías (Primera, Sub-20, Sub-15, Femenil, etc.) queden aisladas donde debe importar, permitiendo que una misma persona tenga roles distintos en varias categorías.

## Decisiones tomadas

- **Alta de clubes**: solo el Super Admin de plataforma crea clubes e invita al Admin de cada club.
- **Visibilidad entre categorías**: aislamiento por módulo. Los módulos operativos son estrictos por categoría; los transversales viven a nivel club.
- **Roles por categoría**: cambio manual de contexto vía el selector de equipo del header (ya existe, se formaliza).

## Clasificación de módulos

- **Estrictos por categoría** (solo ven datos del `team_id` activo): `plantel`, `tacticas`, `salud`, `desarrollo`, `nutricion`, `uniformes`, `multimedia` (por equipo).
- **Nivel club** (ignoran el selector de equipo): `coordinacion_interna`, `comunicados`, `documentos`, `usuarios`, `solicitudes`, `torneo` (según liga/club).
- **Mixto** (club + equipo activo): `calendario` (ya se comporta así), `viajes`, `inventario`.

Esta clasificación se guarda como metadata (`scope: 'team' | 'club' | 'mixed'`) en `src/lib/modules.ts` para que la UI y las RLS futuras la usen consistentemente.

## Cambios de datos (una sola migración)

1. **Aislamiento estricto por club** — auditoría y refuerzo:
   - Verificar que todas las tablas con datos de club tengan `club_id NOT NULL`.
   - Reescribir las policies de SELECT/INSERT/UPDATE/DELETE para que TODAS pasen por `get_user_club_id(auth.uid()) = club_id` o `is_super_admin(auth.uid())`. Nada de policies "TO authenticated USING (true)".
   - Añadir `has_club_access(_user_id, _club_id)` SECURITY DEFINER para simplificar policies.

2. **Aislamiento por categoría** en módulos estrictos:
   - Nueva función `has_team_scope(_user_id, _team_id)` SECURITY DEFINER: devuelve true si el usuario tiene membresía específica a ese `team_id` (no cuenta la membresía club-wide para módulos estrictos por equipo).
   - Policies de `player_profiles` (y futuras tablas estrictas) usarán `has_team_scope` en vez de `has_team_access`, de modo que un Admin club-wide siga viendo todo, pero un DT del Sub-15 no vea al Sub-20.
   - Admins/Super Admins mantienen visibilidad total vía `has_role('admin')` o `is_super_admin`.

3. **Alta de clubes controlada**:
   - Nueva tabla `club_invitations`: `id, club_id, email, role_id, token, expires_at, accepted_at, created_by`.
   - Policies: solo Super Admin inserta/lee; el trigger `handle_new_user` consume la invitación por email al registrarse (asigna `club_id` y crea la `team_membership` correspondiente), en vez del comportamiento actual "primer usuario = super admin del club semilla".
   - Se conserva el fallback actual solo si NO existe ningún super_admin (bootstrap inicial).

4. **Grants** para cada tabla nueva/modificada según el patrón estándar del proyecto.

## Cambios de UI (sin construir módulos nuevos)

1. **`src/lib/modules.ts`**: agregar `scope` a cada módulo.
2. **`AppLayout` / `useAccess`**:
   - El selector de equipo se oculta cuando la ruta activa es un módulo `scope: 'club'`.
   - En módulos `scope: 'team'`, si el usuario no tiene membresía específica al `team_id` activo (solo tiene club-wide sin rol Admin), mostrar `EmptyState` "Selecciona una categoría específica".
   - El header muestra el rol vigente en la categoría activa (ej. "Sub-15 · DT") para que quede claro el contexto cuando la persona tiene roles distintos por equipo.
3. **Panel de Super Admin** (`/admin/clubs`, protegido por `is_super_admin`):
   - Listado de clubes, crear club nuevo, generar invitación al Admin del club (copia link/token).
   - Solo la fundación: alta de club + invitación. No construimos gestión avanzada aquí.
4. **Pantalla `/invite/$token`** pública para aceptar invitación → registro → asignación automática al club y rol.

## Verificación

- Correr el linter de seguridad de la base.
- Probar con dos usuarios de clubes distintos que ninguna consulta cruce datos.
- Probar una persona con `Auxiliar` en Primera + `DT` en Sub-15: al cambiar de equipo en el header, permisos y datos cambian; en Coordinación (club) ve todo lo del club una sola vez.

## Fuera de alcance de este plan

- Construir módulos nuevos (viajes, inventario, comunicados, etc.).
- UI avanzada de administración de clubes (billing, límites, branding por club más allá de logo/colores ya existentes).
- Migrar datos existentes de "Los Cabos United" a otros clubes — se queda como está.

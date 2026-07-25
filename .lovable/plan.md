## Objetivo

Que los permisos de cada usuario se calculen según el **equipo activo** del selector (auxiliar en Primer Equipo, DT en Sub-15) y que un Admin pueda **ajustar permisos puntuales por usuario+equipo+módulo** sin tocar el rol base ni afectar a otros usuarios. Todo dentro del módulo Usuarios (`/m/usuarios`).

## Cambios de datos (una migración)

1. Nueva tabla `user_permission_overrides`:
   - `user_id` (FK profiles), `team_id` (nullable = club-wide), `module_key` (text), `access_level` (enum existente), `created_at`, `updated_at`.
   - UNIQUE (`user_id`, `team_id`, `module_key`) — con `team_id` NULL manejado por índice parcial.
   - RLS: lectura para miembros del mismo club; escritura solo con `has_module_editor_any(auth.uid(),'usuarios')` o super admin.
   - GRANT a `authenticated` y `service_role`.
2. Función `get_effective_access(_user_id uuid, _team_id uuid)` SECURITY DEFINER que devuelve `module_key → access_level` combinando:
   - membresías donde `team_id = _team_id` o `team_id IS NULL` (club-wide),
   - unión por rol tomando el máximo entre esas membresías (no todas),
   - override por usuario si existe (pisa el resultado del rol).

## Cambios de lógica (permisos por equipo activo)

3. `src/hooks/useAccess.ts`:
   - Devolver además `permissionsByTeam: Record<teamId|'club', Record<module, level>>` calculado desde membresías filtradas por `team_id` (y club-wide siempre incluidas), aplicando overrides de `user_permission_overrides`.
   - Suscripción realtime adicional a `user_permission_overrides`.
   - Mantener `permissions` (unión máxima) solo para decisiones globales (ej. mostrar el módulo en el bottom nav si en algún contexto tiene acceso).
4. `src/components/squad/AppLayout.tsx` (`useApp`):
   - Exponer `activePermissions` = permisos del `activeTeam` (o club-wide cuando no hay equipo activo o el módulo es scope `club`).
   - Los botones/acciones de cada módulo (`plantel`, `calendario`, etc.) leen `activePermissions[key]` en vez de `permissions[key]`.
   - Los módulos scope `club` (usuarios, coordinación) siguen usando la unión club-wide.

## Cambios de UI — pestaña "Miembros"

5. Nueva pestaña **Miembros** dentro de `/m/usuarios`:
   - Lista de personas del club (`profiles` del `club_id`), buscador por nombre/email, chip de conteo de equipos.
   - Al abrir una persona, panel con:
     - **Membresías**: filas `equipo (o Club) · rol` con acciones agregar/quitar/cambiar rol (`team_memberships`). Combos alimentados por `teams` y `roles` del club.
     - **Overrides**: por cada membresía, un botón "Personalizar permisos" que abre una matriz idéntica a la de Roles pero pre-cargada con los permisos efectivos del rol; cambiar un módulo crea/actualiza una fila en `user_permission_overrides`, "Restablecer" la elimina. Cada fila indica visualmente si viene del rol o es override.
6. Reutilizar `PermissionsMatrix` extrayéndolo a `src/components/usuarios/PermissionsMatrix.tsx` para servir tanto a Roles como a Overrides (mismo look, prop `source: 'role' | 'override'`).

## Fuera de alcance

- Invitar nuevos usuarios por email desde esta pestaña (ya existe flujo por invitación de club).
- Historial/auditoría de cambios de permisos.
- Plantillas de overrides o copiar entre usuarios.

## Verificación

- Como usuario con DT en Sub-15 y Auxiliar en Primer Equipo: al cambiar de equipo activo, los botones de crear/editar aparecen o desaparecen según el rol de ese equipo.
- Como Admin, quitar "editor" en Calendario a un utilero específico en Primer Equipo no afecta al utilero de Sub-15 ni a otros utileros del Primer Equipo.
- "Restablecer" elimina el override y el usuario vuelve al permiso del rol.
- Cambios realtime: al ajustar overrides o membresías, el usuario afectado ve la UI recalcularse sin re-login.
- Correr linter de seguridad tras la migración.

## Detalles técnicos

- Índice único con `NULLS NOT DISTINCT` (PG15+) o índice parcial doble para permitir un solo override por (user, team_id NULL, module).
- `activePermissions` se deriva con `useMemo` en `AppLayout` a partir de `activeTeam?.id` y `permissionsByTeam`.
- Para módulos scope `team`, si no hay equipo activo, tratar acceso como `none` (fuerza al usuario a elegir contexto).

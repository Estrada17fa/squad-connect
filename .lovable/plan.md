## Nueva regla de visibilidad

- **No-jugadores (Admin, Técnico, Médico, Staff):** ven **todo el club**, sin importar a qué categoría/equipo pertenezcan sus membresías. Sus permisos (read/editor/approver) se calculan por unión de todas sus membresías y overrides.
- **Jugadores:** siguen viendo únicamente lo de su(s) categoría(s).
- Las membresías de no-jugadores dejan de ser por categoría: se asignan a nivel club (team_id NULL). Los jugadores siguen asignándose a un equipo específico.

## Cambios en base de datos (migración)

1. Nueva función `public.is_player_only(_user_id)` STABLE SECURITY DEFINER: `true` si el usuario **solo** tiene membresías con rol base `jugador` y ninguna otra (fallback a Super Admin = false).
2. Nueva función `public.user_sees_all_club(_user_id, _club_id)`: `is_super_admin OR (get_user_club_id = _club_id AND NOT is_player_only)`.
3. Reemplazar SELECT policies dependientes del equipo:
   - `player_profiles_select` → permitir si `user_sees_all_club(auth.uid(), teams.club_id)` o `has_team_scope` (para jugadores).
   - `calendar_events_select` → permitir si `user_sees_all_club(auth.uid(), club_id)`; jugadores mantienen la regla actual (`has_team_access(team_id)` o invitado).
   - Verificar `viajes`, `inventario`, `tacticas`, `salud`, `desarrollo`, `nutricion`, `multimedia`, `torneo`, `comunicados` (cuando existan tablas con `team_id`): aplicar el mismo patrón.
4. Migración de datos: convertir membresías **no-jugador** con `team_id` no nulo a club-wide (`team_id = NULL`), deduplicando por `(user_id, role_id)`. Las membresías de rol `Jugador` permanecen intactas.
5. Ajustar policies de escritura (`_insert/_update/_delete`) para que `has_module_editor_any` (unión de permisos) baste para no-jugadores; jugadores editores siguen restringidos a su team.

## Cambios en frontend

- **`useAccess.ts`**: exponer `isPlayerOnly` (calculado en cliente a partir de `teams[].baseRole`). Cuando `isPlayerOnly === false`, `getModuleAccess` usa `permissions` (unión) en vez de `activePermissions`.
- **`AppLayout.tsx`**:
  - Ocultar el selector de equipo para no-jugadores (siempre muestran datos de todo el club); mostrar solo nombre del club.
  - Para jugadores con un solo equipo, tampoco mostrar selector.
  - `activeBaseRole` de no-jugadores: elegir el "mejor" rol (Admin > Técnico > Médico > Staff) a partir de la unión, no del team activo.
- **`useCalendarEvents.ts`**: si `isPlayerOnly` es `false`, listar todos los `calendar_events` del club (`club_id = profile.club_id`) sin filtrar por team; jugadores conservan el filtro por team.
- **`useRoster.ts` / `usePlayers.ts`**: no-jugadores cargan todos los miembros/jugadores del club (todas las categorías); mostrar columna/etiqueta de categoría. Jugadores siguen scoped al team.
- **`m.plantel.tsx`**: agregar filtro por categoría (opcional) visible solo para no-jugadores; el filtro por rol actual se mantiene.
- **`CreateMemberDialog` / `MembersTab`**: al asignar rol distinto de "Jugador", forzar `team_id = NULL` (membresía club-wide) y ocultar el selector de categoría en esa fila. Para "Jugador" seguir pidiendo categoría obligatoria.
- **`prefetch.ts`**: pasar `teamId = null` para no-jugadores al precargar calendario/plantel.

## Verificación

- Migración: comprobar que no-jugadores previamente ligados a un equipo específico quedan como club-wide y no pierden acceso.
- Login como Técnico de una sola categoría: debe ver plantel completo del club, agenda con eventos de todas las categorías, sin selector de equipo.
- Login como Jugador de Sub-15: solo ve su equipo, sin eventos ni jugadores de otras categorías.
- Super Admin: sigue viendo todo (comportamiento intacto).

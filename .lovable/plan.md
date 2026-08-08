# Parte 2B-2 — RLS de módulos de categoría al sistema de 6 niveles

Migra las políticas de Plantel, Entrenamientos, Viajes y Agenda para que usen `can_view_module` / `can_edit_module` / `effective_permission`. Las funciones viejas (`can_view_trip`, `can_edit_trip`, `can_view_training`, `can_edit_training`, `has_team_access`, `has_team_scope`, `has_module_access`, `has_module_editor`, `has_event_access`) no se borran: simplemente estas tablas dejan de referenciarlas (limpieza al cierre de 2B).

## Regla de visibilidad aplicada

En estos módulos el contenido es colectivo, así que `vista_jugador` = ve su categoría (no "solo lo mío"). Como `can_view_module` devuelve verdadero para cualquier nivel distinto de `sin_acceso`, y `effective_permission` ya resuelve categoría / club-wide / global con aislamiento por club (correcciones de 2B-1), el SELECT queda simplemente:

```
can_view_module(auth.uid(), '<modulo>', team_id)
```

y la escritura:

```
can_edit_module(auth.uid(), '<modulo>', team_id)
```

Super admin ya está cubierto dentro de `effective_permission`, así que se quitan los `is_super_admin(...)` sueltos.

## Políticas por tabla

### Plantel — `player_profiles`
- SELECT: `can_view_module(uid, 'plantel', team_id)` OR `user_id = auth.uid()` (uno siempre ve su propia ficha).
- INSERT / UPDATE / DELETE: `can_edit_module(uid, 'plantel', team_id)`.

### Entrenamientos
- `exercises`: la biblioteca puede ser de club (`team_id IS NULL`) o de categoría.
  - SELECT: si `team_id` no es nulo → `can_view_module(uid,'entrenamientos',team_id)`; si es nulo → `has_club_access(uid, club_id) AND max_permission_any_team(uid,'entrenamientos') <> 'sin_acceso'`.
  - Escritura: mismo patrón con nivel editor (`can_edit_module` por equipo; para los de club, exigir un nivel editor en algún contexto **y** `has_club_access`).
- `training_sessions`: SELECT `can_view_module(uid,'entrenamientos',team_id)`; escritura `can_edit_module(...)` + `has_club_access(uid, club_id)` en el WITH CHECK.
- `session_exercises`: hereda por `EXISTS` contra `training_sessions` resolviendo `s.team_id`.

### Viajes
`team_id` vive en `trips`. Se resuelve con un helper interno nuevo, security definer, para no repetir subconsultas:
- `trip_team_id(_trip_id uuid) -> uuid`
- `can_view_trip_new(_user_id, _trip_id)` = `can_view_module(_user_id,'viajes', trip_team_id(_trip_id))` OR el usuario está en `trip_travelers` de ese viaje (vista "mi viaje" del convocado).
- `can_edit_trip_new(_user_id, _trip_id)` = `can_edit_module(_user_id,'viajes', trip_team_id(_trip_id))`.

Tablas y cómo resuelven el viaje:
- `trips` → directo por `id` (SELECT vía can_view_trip_new, escritura vía can_edit_trip_new + `has_club_access`).
- Hijas directas (`trip_travelers`, `trip_flights`, `trip_hotels`, `trip_transports`, `trip_meals`, `trip_luggage`) → `trip_id`.
- Nietas: `trip_flight_passengers`, `trip_flight_baggage_handlers`, `trip_boarding_passes` → vía `trip_flights.trip_id`; `trip_rooms` → vía `trip_hotels.trip_id`; `trip_room_occupants` → vía `trip_rooms → trip_hotels`; `trip_transport_passengers` → vía `trip_transports.trip_id`.
- Se corrige de paso `trip_travelers_select`, que hoy deja ver cualquier fila de cualquier viaje: pasará a exigir acceso al viaje.
- Se conservan los WITH CHECK que exigen que el pasajero/ocupante sea un `trip_traveler` del viaje.

**Pase de abordar (dueño):** `trip_boarding_passes` SELECT = `user_id = auth.uid()` OR `can_edit_module(...)` del viaje. Es decir, el jugador solo ve el suyo, y los editores de viajes ven todos; un lector de viajes que no sea el dueño no ve pases ajenos (hoy sí los ve — es un endurecimiento intencional). Escritura sigue siendo solo de editores.

### Agenda / Calendario
- `calendar_events` SELECT: `can_view_module(uid,'agenda', team_id)` OR convocado (`EXISTS` en `event_attendees` con `user_id = auth.uid()`) OR, para eventos sin `team_id` (club), `has_club_access(uid, club_id) AND max_permission_any_team(uid,'agenda') <> 'sin_acceso'`.
- `calendar_events` escritura: `can_edit_module(uid,'agenda', team_id)` OR (evento de tipo `entrenamiento` AND `can_edit_module(uid,'entrenamientos', team_id)`) — se conserva la doble puerta actual.
- `event_attendees`: SELECT `user_id = auth.uid()` OR acceso al evento padre (misma regla de arriba); escritura por `EXISTS` contra el evento con `can_edit_module(...,'agenda', e.team_id)`.

## Verificación (antes de cerrar)

Consultas SQL ejecutadas como cada usuario real (vía `set local role authenticated` + `request.jwt.claims`), más una pasada en el navegador:

1. Jugador (`vista_jugador`): ve plantel / entrenamientos / viajes / agenda de su categoría; 0 filas de otra categoría; ve su pase de abordar y los eventos donde está convocado; no ve pases ajenos.
2. Técnico (`editor_categoria`): lee y escribe en su categoría; INSERT/UPDATE en otra categoría es rechazado.
3. Staff (editor en viajes, lector en plantel): edita viajes de su categoría; UPDATE en `player_profiles` rechazado; lectura de plantel OK.
4. Aislamiento entre clubes: usuario del club A obtiene 0 filas de todas las tablas del club B, incluso con membresía club-wide.
5. Editor de categoría A no puede editar contenido de categoría B (por tabla padre e hija: `trip_flights`, `session_exercises`, `event_attendees`).
6. Revisión en el navegador de Plantel, Entrenamientos, Viajes y Agenda con sesión real: cargan sin errores y sin regresiones visibles.

Si alguna prueba falla, no se cierra la parte. Se entregan los resultados de las 6.

## Notas técnicas

- Todo en una sola migración transaccional: `DROP POLICY` + `CREATE POLICY` por tabla, más los tres helpers nuevos (`trip_team_id`, `can_view_trip_new`, `can_edit_trip_new`, security definer con `search_path = public`).
- Sin cambios de esquema de datos ni de frontend; 2A ya lee los 6 niveles, así que la UI y la RLS quedan alineadas.
- Documentos, coordinación, solicitudes, inventario y compras siguen con las funciones viejas hasta 2B-3.

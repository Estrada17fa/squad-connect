# Viajes — Parte 1 (fundación)

Módulo de ámbito EQUIPO en `/m/viajes` (chip dentro de Coordinación, ya mapeado en el rol admin/técnico/staff). Solo la base: lista, alta/edición, detalle cronológico y convocatoria.

## Tablas nuevas

### `trips`
| Campo | Tipo | Notas |
|---|---|---|
| id | uuid PK | |
| club_id | uuid → clubs | aislamiento |
| team_id | uuid → teams | ámbito equipo (NOT NULL) |
| title | text | |
| destination | text null | |
| match_event_id | uuid null → calendar_events | partido asociado, opcional |
| departure_at | timestamptz | inicio del viaje |
| return_at | timestamptz null | |
| meeting_point | text null | citatorio |
| meeting_at | timestamptz null | |
| status | enum `trip_status` | planeacion / confirmado / en_curso / completado (default planeacion) |
| notes | text null | |
| created_by, created_at, updated_at | | trigger `set_updated_at` |

### `trip_travelers`
| Campo | Tipo | Notas |
|---|---|---|
| id | uuid PK | |
| trip_id | uuid → trips (on delete cascade) | |
| user_id | uuid → profiles | |
| role_note | text null | 'jugador', 'utilero', libre |
| created_at | timestamptz | |

Único `(trip_id, user_id)`.

Índices: `trips(club_id, team_id, departure_at)`, `trip_travelers(trip_id)`, `trip_travelers(user_id)`.

## Vínculo con Agenda/Calendario

- `match_event_id` apunta a un `calendar_events` existente de tipo `partido` del equipo. El selector del formulario lista solo eventos `partido` del equipo activo. Es opcional y nullable, listo para que Torneo lo llene automáticamente después.
- Para que el viaje aparezca en Agenda más adelante se seguirá el patrón ya usado por juntas (evento espejo en `calendar_events` con tipo `viaje`). En esta parte **no** se crea el espejo todavía: se deja `departure_at`/`return_at` como una sola columna timestamptz cada uno para que el espejo sea directo.

## Permisos y RLS

- `module_key = 'viajes'` (ya existe en el catálogo de módulos).
- Lectura: `has_team_scope(auth.uid(), team_id)` + `has_module_access(uid,'viajes')`.
- Escritura (insert/update/delete): `has_module_editor(uid, team_id, 'viajes')`.
- `trip_travelers` hereda vía EXISTS contra su `trips`.
- GRANTs a `authenticated` y `service_role` en ambas tablas.

## Notificaciones

Trigger AFTER INSERT en `trip_travelers` → `notify_users(club, [user], 'viaje_convocatoria', 'Fuiste convocado a un viaje', '<destino> · <fecha salida>', 'viajes', trip_id)`. Se añade el caso `viajes` a `notificationTargets.ts` para deep-link a `/m/viajes?open=<trip_id>`.

## Interfaz

- `src/hooks/useTrips.ts`: lista por equipo activo, detalle, viajeros, mutaciones, realtime.
- `src/routes/_authenticated/m.viajes.tsx`: `ModuleTabs` + botón verde ancho "Agregar viaje" (solo editor) + secciones **Próximos** / **Pasados** con `StandardCard` (título, destino, fechas, `StatusBadge` del estado, conteo de convocados). Skeletons y `EmptyState`.
- `src/components/viajes/TripFormDialog.tsx`: título, destino, partido asociado, salida/regreso, punto y hora de citatorio, estado, notas.
- `src/components/viajes/TripDetailSheet.tsx` (`EntitySheet`): info general, **línea de tiempo** que hoy solo pinta el citatorio y la salida/regreso, y sección **Convocatoria** con avatares. Bloques vacíos comentados y ordenados por hora, listos para transporte, vuelos, hotel, comidas, equipaje y documentos en los siguientes prompts.
- `src/components/viajes/TravelerPicker.tsx`: buscador sobre `useRoster` del equipo activo, agregar/quitar (solo editor).
- FAB: crea viaje en la lista; agrega viajero cuando el detalle está abierto.
- Home: tarjeta de Viajes con el próximo viaje del equipo activo donde el usuario está convocado (destino + fecha de salida).
- `?open=<trip_id>` abre el detalle (mismo patrón que los otros módulos).

## Notas técnicas

- Mapeo de estado a `StatusBadge`: planeacion → info, confirmado → approved, en_curso → pending, completado → info.
- Prefetch en `src/lib/prefetch.ts` para el chip de Viajes.
- Sin cambios en `modules.ts`/`rolePages.ts`: `viajes` ya está registrado en Coordinación.

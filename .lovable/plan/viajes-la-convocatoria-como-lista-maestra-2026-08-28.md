# Viajes: la convocatoria como lista maestra

## Diagnóstico

**1. Dónde vive la convocatoria y cómo se quita a alguien hoy**

- Tabla: `trip_travelers` (una fila por persona convocada al viaje).
- Se quita SOLO desde el frontend, con un simple borrado de esa fila:
  - `removeTraveler()` en `src/hooks/useTrips.ts` (borra la fila y nada más).
  - Se llama desde la ficha del viaje (`TripDetailSheet.tsx`) y desde el formulario de viaje (`TripFormDialog.tsx`).
- No existe ningún trigger ni cascada en la base que limpie lo demás.

**2. Dónde puede quedar asignada una persona dentro de un viaje**

| Asignación | Tabla | ¿Se limpia hoy? |
|---|---|---|
| Pasajero de vuelo | `trip_flight_passengers` | No |
| Equipaje por vuelo | `trip_flight_baggage_handlers` | No |
| Pase de abordar (fila) | `trip_boarding_passes` | No |
| Pase de abordar (archivo en almacenamiento) | bucket `trip-documents` | No |
| Pasajero de transporte | `trip_transport_passengers` | No |
| Ocupante de habitación | `trip_room_occupants` | No |
| Material/equipaje del viaje (responsable) | `trip_luggage.responsible_user_id` | No |

Las comidas (`trip_meals`) son del grupo, no tienen asignación por persona: no hay nada que limpiar ahí.

Nota: en los datos actuales del club no hay filas huérfanas todavía, así que el arreglo es preventivo + limpieza por si aparecen.

**3. ¿Deja de ver el viaje al quitarla de la convocatoria?**

Sí, la visibilidad ya está correcta por RLS: `can_view_trip_new` deja ver el viaje si la persona tiene permiso del módulo Viajes en esa categoría **o** está en `trip_travelers`. Un jugador (que no tiene permiso de módulo) pierde el acceso al viaje y a toda su logística en cuanto sale de la convocatoria. No hace falta tocar permisos. Lo único que quedaba mal era la basura de datos: seguía apareciendo su nombre en la lista de pasajeros para los demás.

## Arreglo propuesto

**En la base de datos (fuente de verdad, venga de donde venga el borrado)**

Un disparador sobre el borrado de un convocado que, para ESE viaje y ESA persona únicamente, elimina:
- pasajero de vuelos del viaje,
- equipaje por vuelo,
- pase de abordar,
- pasajero de transportes,
- ocupante de habitaciones,
- y libera al responsable del material del viaje (queda sin responsable, no se borra el material).

Nunca toca otros viajes.

Además, en la misma migración se limpia cualquier huérfano histórico que pudiera existir.

**Archivo del pase de abordar**

El archivo guardado en el almacenamiento privado no se puede borrar desde la base. Se borra desde el frontend justo antes de quitar al convocado: si esa persona tenía pase de abordar con archivo en ese viaje, se elimina el archivo y luego se quita de la convocatoria (el disparador borra la fila). Si el borrado del archivo falla, se continúa igual: el archivo queda inaccesible porque nadie tendrá fila que lo referencie.

**Confirmación en pantalla**

Al quitar a alguien de la convocatoria se pedirá confirmación indicando que también se eliminarán sus asignaciones de vuelo, transporte, habitación, equipaje y pase de abordar de ese viaje, y se refrescarán las vistas (vuelos, transportes, hoteles, material) para que el cambio se vea al instante.

## Detalles técnicos

- Migración: función `public.trip_traveler_cleanup()` (`SECURITY DEFINER`, `search_path=public`) + trigger `AFTER DELETE ON public.trip_travelers FOR EACH ROW`. Borra en `trip_flight_passengers`, `trip_flight_baggage_handlers`, `trip_boarding_passes` (filtrando por `flight_id IN (SELECT id FROM trip_flights WHERE trip_id = OLD.trip_id)`), `trip_transport_passengers` (vía `trip_transports`), `trip_room_occupants` (vía `trip_rooms`/`trip_hotels`) y `UPDATE trip_luggage SET responsible_user_id = NULL`. Más un bloque de limpieza única de huérfanos existentes.
- `src/hooks/useTrips.ts`: `removeTraveler(tripId, userId, travelerId)` — consulta `trip_boarding_passes.file_path` de esa persona en los vuelos del viaje, hace `supabase.storage.from(TRIP_DOCS_BUCKET).remove([...])` y luego borra la fila de `trip_travelers`.
- `src/components/viajes/TripDetailSheet.tsx` y `TripFormDialog.tsx`: usar la nueva firma, añadir `ConfirmDialog` en la ficha e invalidar las claves `trip-flights`, `trip-transports`, `trip-hotels`, `trip-material` y `trips`.
- Sin cambios en RLS, permisos ni otros módulos.

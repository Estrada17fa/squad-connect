# Arreglo: el mapa no aparece en el detalle del evento

## Diagnóstico confirmado

En `LocationPicker`, al elegir un resultado del mapa (Nominatim) la función `pickPlace` hace `onLocationIdChange(null)` y deja el lugar solo en un estado local `pending`. Ese `pending` únicamente se convierte en una fila real de `locations` si el usuario pulsa "Guardar esta ubicación en el catálogo". Si no lo pulsa, el evento se guarda con el texto pero con `location_id` nulo, y el detalle no tiene coordenadas que mostrar.

`saveCalendarEvent` sí persiste `location_id` correctamente, y `LocationDisplay` sí pinta mapa + "Cómo llegar" cuando la ubicación tiene coordenadas. El único eslabón roto es el guardado del lugar elegido.

## Enfoque elegido: ligar `location_id` creando la ubicación

Se persiste el lugar en `locations` en cuanto se elige, y se liga su `id`. Es el enfoque más limpio porque:

- `calendar_events`, `meetings`, `trip_hotels` y `trips` ya tienen columna `location_id`; no hace falta duplicar `latitude`/`longitude` en cuatro tablas.
- Una sola fuente de verdad para el lugar: si se corrige la dirección o el pin, se corrige en todos los eventos que lo usan.
- `LocationDisplay` ya lee la ubicación por `location_id`; no cambia nada aguas abajo.

Para no ensuciar el catálogo visible, la tabla `locations` gana una bandera `is_catalog`:

- Lugar elegido del mapa sin pulsar "Guardar": se crea con `is_catalog = false` (existe, tiene coordenadas, pinta el mapa, pero no aparece en la lista de lugares del club).
- "Guardar esta ubicación en el catálogo": marca esa misma fila como `is_catalog = true`, sin duplicarla.
- Las ubicaciones ya existentes quedan como catálogo (`true`).

## Cambios

1. Migración: `locations.is_catalog boolean not null default true`; las filas nuevas creadas automáticamente se insertan con `false`.
2. `useLocations`: el listado del catálogo (sugerencias "Guardadas" y gestor del club) filtra `is_catalog = true`. Nueva mutación para resolver/crear un lugar desde un resultado de mapa, reutilizando la fila existente si ya hay una con el mismo `place_id` en ese club (sin duplicados), y otra para promover a catálogo.
3. `LocationPicker`:
   - Al elegir un resultado de Nominatim, crea/reutiliza la fila y llama a `onLocationIdChange(id)` de inmediato. Se muestra el mapa con el lugar ya ligado.
   - Si se arrastra el pin, se actualizan las coordenadas de esa fila.
   - "Guardar esta ubicación en el catálogo" pasa a marcar `is_catalog = true` (mismo botón, mismo texto).
   - Elegir un lugar guardado y el texto libre siguen igual (texto libre = sin `location_id`, sin mapa).
4. Verificación de persistencia: `saveCalendarEvent` ya escribe `location_id`; se comprueba en el guardado real que el evento queda con la ubicación ligada.
5. Detalle: al heredar el `location_id`, el mapa y "Cómo llegar" aparecen en detalle de evento, sesión de entrenamiento, junta, viaje (punto de reunión) y hotel, que ya usan `LocationDisplay`. Se revisa cada uno tras el arreglo.
6. `DaySheet` se queda compacto (solo texto), como pide el requerimiento.

## Verificación

Crear un evento eligiendo "Estadio Banorte" del buscador sin pulsar "Guardar", abrir el detalle y comprobar que se ve el mapa con pin y el botón "Cómo llegar"; comprobar además que ese lugar no aparece en el gestor de ubicaciones del club hasta guardarlo.

## Detalles técnicos

- Migración sobre `public.locations` (nueva columna + índice único parcial por `club_id, place_id`).
- Modificados: `src/hooks/useLocations.ts`, `src/components/calendar/LocationPicker.tsx`.
- Sin cambios en `saveCalendarEvent`, `LocationDisplay` ni en los formularios de evento, sesión, junta, viaje y hotel.

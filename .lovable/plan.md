# Ubicaciones reales con mapa (OpenStreetMap, sin API key)

## Librerías: confirmación

- **Nominatim (OpenStreetMap)** para el buscador de lugares: API pública gratuita, **sin API key**. Se llama desde el servidor de la app (no desde el navegador) para respetar su política de uso, con un identificador de la app, límite de 1 búsqueda por segundo y resultados en español. Se añade un pequeño retardo al teclear (debounce) y caché por término.
- **Leaflet + react-leaflet** con tiles de OpenStreetMap para el mapa: **sin API key**, sin costo. Se cargan solo en el navegador (importación diferida) para no romper el renderizado en servidor. Se muestra siempre la atribución "© OpenStreetMap" que exige la licencia.
- **"Cómo llegar"**: enlace directo a `https://www.google.com/maps/search/?api=1&query=LAT,LNG`, que abre la app de mapas del teléfono. No requiere key.

## Base de datos

La tabla `locations` ya existe (club_id, name, address, notes, created_by, fechas) con aislamiento por club: se **amplía**, no se recrea.

- `locations` gana `latitude` y `longitude` (numéricos, opcionales para no invalidar lugares ya guardados), más `place_id` y `source` para recordar de dónde vino el resultado de búsqueda y evitar duplicados.
- Se conservan los permisos actuales: cualquier miembro del club ve el catálogo; solo editores crean, editan o eliminan. Sin fuga entre clubes.
- `calendar_events` ya tiene `location_id` y el texto `location`: se mantienen tal cual (texto libre para lo que no tenga coordenadas).
- Para reutilizar el mismo componente fuera de la agenda se añade `location_id` opcional a `meetings`, y a `trips` (punto de reunión) y `trip_hotels`. El texto existente se conserva y sigue mostrándose cuando no haya ubicación ligada.

## Componente reutilizable de ubicación

**`LocationPicker`** (evoluciona el actual `LocationField`), usado en todos los formularios:

- Una sola caja de búsqueda que mezcla dos fuentes: primero las **ubicaciones guardadas del club** que coincidan, y debajo los **resultados de mapa** de Nominatim con su dirección completa.
- Al elegir un resultado de mapa se guardan nombre, dirección y coordenadas en el evento; aparece un mini-mapa de confirmación con el pin **arrastrable** para ajustarlo si no quedó exacto.
- Botón "Guardar esta ubicación" para añadirla al catálogo del club con sus coordenadas y reutilizarla después.
- Se mantiene la opción de **escribir texto libre** (sala de juntas, link de video, etc.) sin coordenadas.
- El gestor del catálogo (crear / editar / eliminar, con aviso cuando la ubicación está en uso en algún evento) sigue accesible desde el propio campo y se añade también en Admin / configuración del club, solo para editores.

**`LocationDisplay`**, usado en todas las fichas de detalle:

- Nombre y dirección.
- Mapa pequeño con el pin (Leaflet + OSM), solo si hay coordenadas.
- Botón "Cómo llegar".
- Si la ubicación es solo texto (o un link de videollamada, como en juntas), se muestra igual que hoy, sin mapa.

## Dónde se aplica

- Formularios: evento de agenda, sesión de entrenamiento, junta, viaje (punto de reunión) y hotel del viaje.
- Detalles: evento, sesión, junta, viaje y hotel.

## Detalles técnicos

- Nuevos: `src/lib/geocode.functions.ts` (búsqueda Nominatim vía server function), `src/components/calendar/LocationPicker.tsx`, `src/components/calendar/LocationDisplay.tsx`, `src/components/calendar/LocationMap.tsx` (Leaflet cargado solo en cliente), `src/hooks/useGeocodeSearch.ts`.
- Modificados: `useLocations.ts` (coordenadas), `EventFormDialog`, `SessionFormDialog`, `MeetingFormDialog`, `TripFormDialog`, `HotelFormDialog` y sus sheets de detalle; `LocationField.tsx` se reemplaza por `LocationPicker`.
- Dependencias nuevas: `leaflet` y `react-leaflet` (ambas gratuitas y sin key).
- Migración: columnas de coordenadas en `locations` y `location_id` en `meetings`, `trips` y `trip_hotels`.

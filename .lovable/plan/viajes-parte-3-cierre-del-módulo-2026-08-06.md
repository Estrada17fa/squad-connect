# Viajes — Parte 3 (cierre del módulo)

Cierra Viajes conectando el material al inventario real, documentando el equipaje de vuelo, ligando documentos al viaje y dando al jugador una vista compacta de "mi viaje", además de una pestaña de Viajes en Agenda.

## Cambios en la base de datos

Antes de construir, esto es exactamente lo que se crea o altera:

**Columnas nuevas**
- `inventory_loans.trip_id` (uuid, nullable, referencia a `trips`): liga un préstamo a un viaje. Índice por `trip_id`.
- `documents.trip_id` (uuid, nullable, referencia a `trips`): liga un documento a un viaje. Índice por `trip_id`.
- `trip_flights.baggage_instructions` (texto, nullable): la instrucción de equipaje del vuelo.
- `trip_luggage.is_free_text` no hace falta: los ítems libres siguen viviendo en `trip_luggage` tal como están hoy; el material de inventario vive en `inventory_loans` con `trip_id`. La sección de Equipaje une ambas fuentes.

**Tabla nueva: `trip_flight_baggage_handlers`**
- `id`, `flight_id` (referencia a `trip_flights`, borrado en cascada), `user_id` (referencia a perfiles), `pieces` (entero, opcional), `created_at`.
- Único por (vuelo, persona).
- Permisos: ven los que pueden ver el viaje; crean/editan/borran solo los editores del viaje (mismas funciones `can_view_trip` / `can_edit_trip` ya existentes). GRANT a `authenticated` y `service_role`.

**Evento espejo en el calendario**
- Trigger sobre `trips` (alta, edición, baja) que mantiene una fila en `calendar_events` de tipo `viaje`, del día de salida al de regreso, con `team_id` del viaje — mismo patrón que las juntas.
- Para poder borrarlo/actualizarlo se agrega `calendar_events.trip_id` (uuid, nullable, referencia a `trips`, cascada).

**Reglas de acceso ajustadas**
- Préstamos con `trip_id`: además de las reglas de inventario actuales, los convocados del viaje pueden ver los préstamos de su viaje.
- Documentos con `trip_id`: los convocados del viaje pueden verlos; solo editor de viajes (o de documentos) sube.

**Notificaciones (triggers `notify_users`)**
- Pase de abordar asignado a alguien → aviso a esa persona.
- Alta o cambio de asignación de vuelo/transporte → aviso al pasajero.
- Marcado como quien documenta maletas → aviso a esa persona.

## 1. Equipaje de material conectado a inventario

- La sección Equipaje del viaje pasa a tener dos tipos de renglón, con un toggle en el formulario: **Material de inventario** o **Ítem libre**.
- Material de inventario: se elige con el `InventoryItemPicker` existente (miniatura, categoría, disponibilidad), más cantidad y responsable (solo convocados). Al confirmar se crea un préstamo en `inventory_loans` con `trip_id`, `borrower_user_id` = responsable y la fecha de regreso del viaje como fecha esperada de devolución — la disponibilidad baja sola con la lógica ya existente.
- Ítem libre: sigue guardándose en `trip_luggage` como hoy.
- Botón **"Devolver material del viaje"** visible para editores: lista los préstamos del viaje con saldo pendiente y permite devolución total o parcial reutilizando el flujo de devolución de Inventario.
- La lista muestra ambos tipos juntos, con etiqueta de origen y estado de devolución.

## 2. Equipaje de vuelo

Dentro de cada vuelo (no como sección aparte):

- Campo **instrucción de equipaje** en el formulario del vuelo (texto corto).
- Bloque **"Documentan las maletas del equipo"**: se eligen una o varias personas de entre los pasajeros de ese vuelo, con número de piezas opcional por persona.
- En la tarjeta del vuelo se ve la instrucción general y la lista de quienes documentan.
- Para el pasajero: si le toca, aparece destacado "Tú documentas las maletas del equipo (N piezas)"; si no, ve la instrucción general.
- Solo editor de viajes configura ambos.

## 3. Documentos del viaje

- Nueva sección **Documentos** dentro del detalle del viaje, reutilizando el diálogo de subida y el visor del módulo Documentos, con `trip_id` prellenado.
- Los mismos documentos aparecen en Documentos general con una etiqueta del viaje.
- Suben solo editores de viajes; los ven todos los convocados.

## 4. Vista del jugador

El detalle del viaje abre con dos modos, conmutables por un toggle arriba:

- **MI VIAJE** (por defecto para quien no es editor): solo lo suyo, en orden cronológico y compacto —
  1. su citatorio (hora y punto de reunión),
  2. su transporte de ida,
  3. su vuelo de ida: horario, puerta, su asiento, su pase de abordar (abrir/descargar) y su instrucción de equipaje, con el aviso de si le toca documentar,
  4. su cuarto de hotel y con quién lo comparte,
  5. sus comidas,
  6. su vuelo/transporte de regreso,
  7. el material del que es responsable,
  8. los documentos del viaje.
  Si algo aún no se le asigna, aparece un renglón neutro ("Pendiente de asignar").
- **Ver itinerario completo**: la línea de tiempo completa actual, en modo consulta.
- El staff editor abre directo en el itinerario completo con sus acciones; también puede alternar a "mi viaje".
- Se implementa con una propiedad `readOnly` en `TripDetailSheet`, sin duplicar componentes.

## 5. Pestaña de Viajes en Agenda

- Nueva pestaña **Viajes** junto a Agenda y Mes, con los chips de filtro por equipo ya existentes.
- Lista los viajes accesibles (próximos y pasados) y al tocar uno abre el mismo `TripDetailSheet` en modo consulta, respetando "mi viaje" / completo. Aquí no se crea ni se edita.
- En la vista de Mes y en la agenda, el viaje aparece como evento de tipo `viaje` (del día de salida al de regreso) gracias al espejo; al tocarlo se abre el detalle del viaje en modo consulta.

## Notas técnicas

- Hooks nuevos: `useTripMaterial` (préstamos por viaje + devolución), `useTripDocuments`, `useFlightBaggageHandlers`; se extienden `useTripFlights` (instrucción + handlers) y `useTripLuggage`.
- Los enums y RLS existentes (`can_view_trip`, `can_edit_trip`, `has_club_access`) se reutilizan sin cambiar su firma.
- Realtime se suma a `useTripChannel` para las tablas nuevas.

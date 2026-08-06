# Viajes — Parte 2: Logística del viaje

Estructura confirmada antes de construir. Todo cuelga del viaje existente y se muestra dentro del detalle del viaje, en orden cronológico.

## Tablas nuevas (13)

Vuelos
- `trip_flights` — trip_id, leg ('ida'/'regreso'), flight_code, airline, departs_at, arrives_at, origin, destination, gate, notes
- `trip_flight_passengers` — flight_id, user_id (único por vuelo+usuario)
- `trip_boarding_passes` — flight_id (FK por id, con borrado en cascada del vuelo), user_id, file_path, seat, notes

Transporte
- `trip_transports` — trip_id, leg, transport_type ('bus'/'van'/'taxi'/'privado'/'otro'), departs_at, pickup_location, destination, notes
- `trip_transport_passengers` — transport_id, user_id

Hotel
- `trip_hotels` — trip_id, name, address, check_in_at, check_out_at, phone, notes
- `trip_rooms` — hotel_id, room_label, notes
- `trip_room_occupants` — room_id, user_id

Comidas y equipaje
- `trip_meals` — trip_id, meal_type ('desayuno'/'comida'/'cena'/'snack'), scheduled_at, location, notes
- `trip_luggage` — trip_id, description, quantity, responsible_user_id, notes

Enums nuevos: `trip_leg`, `trip_transport_type`, `trip_meal_type`.
Todas con created_at/updated_at + trigger, y permisos de acceso vía la tabla de datos (GRANT) como el resto.

## Seguridad

- Cada tabla hereda del viaje: se puede ver si puedes ver el viaje (mismo club/equipo), y solo puede crear/editar/eliminar quien sea 'editor' de viajes en ese equipo. Las tablas hijas (pasajeros, ocupantes, pases) validan contra su padre para que no haya fuga entre clubes.
- Bucket privado nuevo `trip-documents` para pases de abordar: sube y gestiona el editor; cada pasajero puede leer únicamente el archivo del pase que le pertenece.

## Hooks (uno por bloque, nada monolítico)

- `src/hooks/useTripFlights.ts` (vuelos + pasajeros + pases)
- `src/hooks/useTripTransports.ts`
- `src/hooks/useTripHotels.ts` (hoteles + cuartos + ocupantes)
- `src/hooks/useTripMeals.ts`
- `src/hooks/useTripLuggage.ts`

Cada uno con sus consultas, mutaciones y suscripción en tiempo real de sus propias tablas.

## Componentes (carpeta `src/components/viajes/logistica/`)

Bloques de la línea de tiempo (solo lectura + acciones si eres editor):
- `FlightsSection.tsx`, `TransportsSection.tsx`, `HotelSection.tsx`, `MealsSection.tsx`, `LuggageSection.tsx`

Formularios cortos, cada uno en su archivo:
- `FlightFormDialog.tsx`, `TransportFormDialog.tsx`, `HotelFormDialog.tsx`, `RoomFormDialog.tsx`, `MealFormDialog.tsx`, `LuggageFormDialog.tsx`, `BoardingPassDialog.tsx` (subida de archivo + asignación a pasajero + asiento)

Compartidos:
- `PassengerAssignDialog.tsx` — lista buscable de la convocatoria del viaje con selección múltiple y botón "Importar del otro tramo" (o de otra unidad/vuelo), reutilizado por vuelos, transportes y cuartos.
- `PersonChips.tsx` — muestra avatares/nombres asignados de forma compacta.

`TripDetailSheet.tsx` solo compone los bloques en orden: citatorio → transporte ida → vuelo ida → hotel (con rooming) → comidas → equipaje → vuelo regreso → transporte regreso. No crece con lógica de formularios.

## Notas

- Fechas siempre en una sola columna timestamptz, mostradas en horario del club.
- Los pases de abordar se ligan al vuelo por id, así que editar el vuelo no borra los pases.
- La vista compacta de jugador vs. completa de staff y la conexión con Inventario quedan para la Parte 3.

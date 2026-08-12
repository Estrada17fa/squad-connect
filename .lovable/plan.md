# Viajes: eliminar cada elemento, arreglar el chip de maleta y resumen en vivo

## 1. Poder eliminar todo (solo quien puede editar el viaje)

Hoy el botón "Eliminar" existe pero está escondido dentro del formulario de edición de cada elemento (vuelo, transporte, hotel, cuarto, comida, material, documento, pase). Desde la ficha de detalle no hay forma de borrar.

Se agrega una acción "Eliminar" visible en la ficha de detalle de cada elemento, con confirmación previa, y solo si la persona tiene permiso de edición de viajes en la categoría del viaje:

- Viaje completo (desde el detalle del viaje)
- Transporte
- Vuelo (y sus pases de abordar asociados)
- Hotel y cuarto
- Comida
- Material / préstamo del viaje
- Documento del viaje
- Pase de abordar (ya existe; se homologa el estilo)

Todas usan el mismo diálogo de confirmación y muestran aviso de éxito o error.

## 2. "Sigue apareciendo lo de la maleta aunque la quites"

En el resumen personal ("Mi viaje") la leyenda "Tú documentas las maletas del equipo" se muestra en cuanto existe un registro de equipaje para esa persona en el vuelo, aunque ese registro sea "Sin equipaje" (sin maleta documentada ni de mano).

Corrección: la leyenda solo aparece cuando la persona realmente lleva maleta documentada. Cuando el registro es "Sin equipaje" no se muestra nada, y cuando solo lleva maleta de mano se indica eso.

## 3. Que los cambios se vean en tiempo real

La tabla que guarda el equipaje por persona en cada vuelo no está publicada para tiempo real, por eso al marcar o quitar una maleta el resumen de otras vistas o de otro dispositivo no se actualiza hasta recargar.

- Migración: publicar esa tabla en tiempo real (igual que vuelos, transportes, cuartos y pasajeros).
- Al cambiar equipaje, pasajeros de transporte/vuelo, ocupantes de cuarto o al eliminar cualquier elemento, se refrescan también las demás vistas del viaje (itinerario general y "Mi viaje") para que el resumen quede al instante.

## Detalles técnicos

- `MyTripView.tsx`: condicionar `highlight` a `handler.checked_bag`; añadir texto de maleta de mano.
- Nuevo componente compartido `DeleteAction` (botón + `ConfirmDialog`) usado por `FlightDetailSheet`, `TransportDetailSheet`, `HotelDetailSheet`, `RoomDetailSheet`, `MealDetailSheet`, `MaterialLoanDetailSheet`, `TripDocumentsSection`, `TripDetailSheet`, reutilizando las mutaciones `remove` ya existentes en los hooks (`useTripFlights`, `useTripTransports`, `useTripHotels`, `useTripMeals`, `useTripMaterial`, `useTripDocuments`, `useTrips`).
- Migración: `ALTER PUBLICATION supabase_realtime ADD TABLE public.trip_flight_baggage_handlers;` (y `REPLICA IDENTITY FULL`).
- `useTripChannel`: suscribir la tabla de equipaje también en la vista de resumen; invalidar en conjunto las claves `trip-flights`, `trip-transports`, `trip-hotels`, `trip-meals` y `trips` tras eliminar.

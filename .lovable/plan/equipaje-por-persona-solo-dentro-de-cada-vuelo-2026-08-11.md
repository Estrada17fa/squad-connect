# Equipaje por persona: solo dentro de cada vuelo

Hoy el equipaje aparece dos veces: como "Equipaje por persona" en la pestaña General (chips por convocado) y como "Documentan maletas" dentro del vuelo (lista con piezas). Se unifica en un solo lugar: dentro del vuelo, con el mismo estilo de chips.

## Qué cambia

**En cada vuelo (pestañas Ida / Regreso)**
- Nueva sección "Equipaje" con la lista de los pasajeros asignados a ese vuelo (avatar + nombre).
- A la derecha de cada persona, tres chips de un toque: **Documentada**, **Mano** y **Sin equipaje**.
  - Documentada y Mano se pueden combinar.
  - "Sin equipaje" es excluyente: al elegirla se apagan las otras dos, y al elegir cualquiera de las otras se apaga "Sin equipaje".
- Contador arriba: cuántos documentan, cuántos llevan de mano y cuántos sin equipaje.
- El registro es **por vuelo**: ida y regreso pueden ser distintos.
- Si no hay pasajeros asignados al vuelo, se invita a asignarlos primero.
- Sin permiso de edición, los chips se ven en modo lectura (solo los activos), igual que hoy en el resto del módulo.
- Desaparece el diálogo actual de "Documentan maletas" con conteo de piezas; su función queda cubierta por el chip "Documentada".

**En la pestaña General**
- Se quita la sección "Equipaje por persona". El material del club (préstamos de inventario) y el resto de General se quedan igual.

## Detalles técnicos

- Base de datos: se reutiliza `trip_flight_baggage_handlers` añadiendo `checked_bag` y `carry_on` (booleanos). Una fila con ambos en falso representa "Sin equipaje" marcado explícitamente; sin fila = aún sin capturar. Las filas actuales se migran con `checked_bag = true`. La columna `pieces` deja de usarse en la interfaz.
- Se retira la sección de equipaje de viaje de General: se elimina `TravelerLuggageSection`, el hook `useTripTravelerLuggage` y la tabla `trip_traveler_luggage` (contiene solo capturas de prueba).
- Nuevo componente `FlightLuggageSection` reutilizando el patrón de chips ya existente, montado dentro de `FlightDetailSheet` y con resumen en la tarjeta del vuelo.
- Mutaciones en `useTripFlights` (upsert por vuelo+persona) con actualización optimista e invalidación de `trip-flights`; permisos vía `canEdit` del viaje, sin cambios en las reglas de acceso.

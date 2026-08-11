# Corregir chips de equipaje: ocultar "Documentada" y "Mano" cuando "Sin equipaje" está activo

## Problema

En `FlightLuggageSection.tsx`, en modo edición los tres chips (Documentada, Mano, Sin equipaje) siempre se muestran como botones. Cuando una persona tiene "Sin equipaje" marcado, el chip "Documentada" sigue visible con su etiqueta, lo que confunde: parece que la persona documenta aunque está marcada como sin equipaje.

## Qué cambia

**`FlightLuggageSection.tsx`**
- Cuando "Sin equipaje" está activo (`none = true`), ocultar los chips de "Documentada" y "Mano" en modo edición. Solo se muestra el chip "Sin equipaje" activo.
- Hacer "Sin equipaje" conmutable: si ya está activo y se vuelve a tocar, se elimina el registro (vuelve a estado "sin capturar") y reaparecen los otros dos chips.
- En modo lectura no hay cambio: ya solo se muestran los chips activos.

**`useTripFlights.ts`**
- Añadir mutación `clearLuggageFlags` que elimina la fila de `trip_flight_baggage_handlers` para un vuelo+persona (borra el registro, volviendo a "sin capturar").

## Detalle técnico

En el render de cada persona, calcular `none` y condicionar:
- Si `none` es true: renderizar solo el chip "Sin equipaje" (activo). Su `onClick` llama a `clearLuggageFlags` (eliminar fila) en lugar de `setNone`.
- Si `none` es false: renderizar "Documentada", "Mano" y "Sin equipaje" como hoy.

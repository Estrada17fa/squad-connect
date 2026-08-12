# Arreglo del resumen de equipaje y regreso de las chips

## Qué está mal

En la tarjeta de cada vuelo (lista de Vuelos) aparece la leyenda "Tú documentas las maletas del equipo en este vuelo" o "Documentan: ..." con solo existir un registro de equipaje de esa persona — incluso cuando eligió "Sin equipaje" o solo "Mano". Por eso la leyenda sigue apareciendo aunque quites la maleta.

Además, en el detalle del vuelo las chips de "Documentada" y "Mano" se ocultan cuando está activo "Sin equipaje"; eso no era lo pedido.

## Cambios

1. Resumen del vuelo (`FlightsSection.tsx`)
   - Considerar únicamente a quienes tengan maleta documentada (`checked_bag`) para la leyenda "Tú documentas..." y para la lista "Documentan: ...".
   - Si nadie documenta, no se muestra ninguna leyenda de maletas.

2. Chips de equipaje (`FlightLuggageSection.tsx`)
   - Mostrar siempre las tres chips en modo edición: Documentada, Mano y Sin equipaje.
   - Al marcar "Documentada" o "Mano" se desactiva automáticamente "Sin equipaje"; al marcar "Sin equipaje" se apagan las otras dos.
   - Volver a tocar la chip activa la desmarca (vuelve a "sin capturar").
   - En modo lectura se sigue mostrando solo la chip activa.

3. Verificación
   - Marcar "Sin equipaje" a una persona y confirmar que la leyenda desaparece de la tarjeta del vuelo y del resumen "Mi viaje", en tiempo real.

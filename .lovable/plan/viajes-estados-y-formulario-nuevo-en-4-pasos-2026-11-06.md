# Viajes: estados y formulario nuevo en 4 pasos

## Punto 0: estado actual (ya revisado, sin cambios)
Hay 5 viajes en el club y **los 5 están en "completado" (Finalizado)**: Jornada 1 (Irapuato), 3 (Celaya), 5 (Morelia), 7 (La Piedad) y 9 (Racing de Veracruz, regreso el 26 oct). **No existe ningún viaje con salida mañana (7 nov).** No hay nada que pasar a "Publicado". Si el viaje de mañana ya se capturó, quizá quedó con otras fechas o en otro club. Si todavía no se ha creado, se crea con el formulario nuevo y se publica. No se toca ningún viaje hasta que lo confirmes.

## 1. Estados (sin cambios en la base de datos)
- Nombres en pantalla: Borrador / Publicado / En curso / Finalizado.
- "En curso" se calcula: Publicado y hoy entre la salida y el regreso (día completo). El estado guardado no cambia.
- En la ficha, el estado va arriba con su acción principal:
  - Borrador → "Publicar a viajeros". Pasa a Publicado y avisa a los viajeros con "Tu viaje a <destino> está listo", usando el aviso de viaje que ya existe.
  - Publicado o En curso → "Finalizar viaje", con confirmación.
  - Menú "⋯": "Volver a borrador" y "Reabrir".
- Coordinación: pestañas "Próximos" (Borrador, Publicado, En curso) y "Finalizados", con etiqueta de estado en cada fila.
- Vista del jugador (Agenda › Viajes):
  - Próximos: sus viajes Publicados o En curso, sin filtrar por fecha.
  - "Viajes anteriores" (plegada): sus viajes Finalizados, con acceso a su pase.
  - Los Borradores nunca aparecen.
- Mismo arreglo en cualquier otra pantalla del jugador que filtre por fecha: Inicio, la tarjeta de General y el enlace de avisos.

## 2. Formulario en 4 pasos (crear) y editar por sección
Mismo estilo que el alta de miembros: barra delgada "Paso N de 4 · nombre" y botón fijo abajo.
1. **Partido:** próximos partidos de visita con logos, fecha y sede, más la tarjeta "Viaje sin partido". Elegir uno prellena título, destino y fecha de salida.
2. **Fechas y reunión:** salida y regreso lado a lado, sin atajos. Punto de reunión con el selector de lugares (opcional).
3. **Viajeros:** dos filas, "Jugadores · N" y "Staff y acompañantes · N", con caras y "+N". Si el partido tiene convocatoria, aparece el botón "Agregar convocados (N)".
   - Cada fila abre un selector a pantalla completa con búsqueda, filtro (posición o rol), "Seleccionar todos" y "Listo (N seleccionados)".
   - Cada persona va a su grupo según su rol en la categoría del viaje: el rol Jugador va a Jugadores y todo lo demás a Staff. Esto corrige el error de hoy.
4. **Resumen:** tarjetas compactas con "Editar" por sección y el botón "Crear borrador".

Editar un viaje usa las mismas secciones y guarda cada una por separado.

## Pruebas (solo datos temporales)
- Crear un viaje de prueba en 4 pasos con un jugador y un staff temporales, sin partido real.
  - Queda como Borrador y el jugador temporal no lo ve.
  - Publicar: le llega el aviso y ve su viaje y su pase.
  - Con regreso = hoy, el viaje sigue visible para él.
  - Finalizar: pasa a "Viajes anteriores" y aún abre su pase.
- Al final borro todo lo de prueba y confirmo que no queda rastro.
- Sin errores de TypeScript.
- Capturas en celular de lo pedido.
- Ningún aviso a personas reales y ningún cambio a viajes reales.

## Detalles técnicos
- `src/lib/viajes.ts`: `tripDisplayStatus`, `isPlayerVisible`, `splitPlayerTrips` y `splitCoordTrips`, con pruebas.
- Las comparaciones de fecha usan el fin del día local del regreso.
- Archivos que cambian:
  - Viajes: `agenda-viajes.tsx`, las rutas `coordinacion.general.viajes.*`, `components/coord/viajes/*` (pasos nuevos, `TravelerPickerSheet`) y `useTrips` (mutación de estado).
  - Inicio: el bloque de próximo viaje.
- El aviso de publicación usa el `notify_users` que ya existe, con los IDs de los viajeros.
- El grupo de cada persona sale de `team_memberships.role` en el `team_id` del viaje.

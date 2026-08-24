# Crear viaje en pocos toques

Solo cambia el flujo de creación de viajes. El detalle del viaje y toda la logística (transporte, vuelos, hoteles, equipaje, pases) quedan igual.

## Confirmaciones pedidas

- Sí: al elegir el partido se precargan fecha, destino/sede, rival en el título y categoría.
- Sí: no se pide ninguna hora al crear el viaje (ni salida, ni regreso, ni citación).
- Sí: los jugadores convocados del partido entran solos, y aparte se puede sumar staff (cuerpo técnico, médico, utilería, directivos) y quitar a quien no vaya.

## 1. Elegir partido de una lista

- El formulario abre con una lista de los PRÓXIMOS partidos de nuestros equipos (los pasados no aparecen), ordenados por fecha.
- Cada partido se muestra como tarjeta tocable: escudo del rival, "vs Rival" con local/visita, fecha larga, sede y categoría.
- Un toque selecciona el partido; se puede cambiar con "Cambiar partido".
- Debajo de la lista: "Crear viaje sin partido", que abre el formulario manual de siempre (título, destino, categoría, convocados a mano).

## 2. Precarga al elegir el partido

Al seleccionar un partido se llenan automáticamente, y todo queda editable:

- Categoría: la del partido (queda fija, no se pregunta).
- Título: "Visita a {Rival}" o "Jornada N · {Rival}".
- Destino: la sede del partido cuando jugamos de visita; vacío si es en casa.
- Fecha de salida: sugerida el día del partido.
- Fecha de regreso: sugerida el mismo día del partido (editable).

## 3. Fechas: el partido ancla, no fija

- Se muestra un renglón de referencia fijo y claro: "Partido: sáb 29 ago · Estadio X" marcado como referencia, visualmente separado de los campos del viaje.
- Debajo, dos campos propios del viaje: **Salida** y **Regreso**, solo fecha (sin hora).
- Atajos rápidos junto a Salida: "El día del partido", "1 día antes", "2 días antes"; y junto a Regreso: "Mismo día", "1 día después".
- Se valida que el regreso no sea anterior a la salida.
- Se elimina del formulario de creación el campo de hora de citación y el punto de reunión: eso vive en la logística del detalle (como ya está).

## 4. Convocados = jugadores del partido + staff aparte

- Al elegir el partido se leen sus convocados del módulo Partidos y se precargan como viajeros, mostrados en una sección "Jugadores convocados (N)" con avatares y una X para quitar a alguien.
- Si el partido aún no tiene convocatoria, se avisa con un estado vacío suave y un botón para elegir jugadores a mano.
- Segunda sección "Staff y acompañantes": selector separado con las personas de la categoría y del club que no son jugadores convocados, agrupadas por rol (técnico, médico, utilería, directivos/admin), con buscador por nombre.
- Total del viaje visible: "12 jugadores + 4 staff".
- Sin partido: se usa el selector manual actual para todos.

## 5. Diseño

- Se mantiene la sheet actual y el estándar visual del proyecto (secciones con encabezado en mayúsculas + icono, tarjetas con barra de color, sin emojis).
- Orden final del formulario de creación: PARTIDO → FECHAS DEL VIAJE → CONVOCADOS → DETALLES (estado y notas).
- Al guardar se abre el detalle del viaje como hoy, para seguir con la logística.

## Detalles técnicos

- `TripFormDialog.tsx` se reorganiza en dos modos: "desde partido" (por defecto) y "manual". La edición de un viaje existente conserva el formulario actual.
- La lista de partidos usa `useOurMatches` de `src/hooks/useMatchOps.ts` filtrando `kickoff_at >= hoy` y estado programado; los convocados usan `useMatchCallups`.
- `trips.match_event_id` apunta al evento espejo del calendario; se resuelve desde `tournament_matches.calendar_event_id` del partido elegido, para no romper la relación existente.
- `departure_at` y `return_at` siguen siendo timestamps: se guardan a mediodía local del día elegido para evitar corrimientos de zona horaria; ningún campo de hora se pide en el formulario.
- Se reutilizan `TravelerPicker`/`useTeamMembers` para el selector de staff, excluyendo a los ya precargados.
- No se tocan tablas, RLS ni permisos.

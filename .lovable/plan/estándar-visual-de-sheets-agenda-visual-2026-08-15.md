# Estándar visual de sheets + Agenda visual

Solo capa visual. No se toca lógica, permisos, RLS, consultas ni qué datos ve cada quien.

## 1. Un solo patrón de sheet para toda la app

Ya existen `EntitySheet` (contenedor) y `DetailSheet` (lectura/edición con `DetailSection`, `DetailField`, `DetailGrid`). El problema no es que falte base, es que la cabecera es pobre y cada módulo pinta su cuerpo a mano. Se consolida así:

**Piezas nuevas/mejoradas en `src/components/squad/DetailSheet.tsx`:**

- `DetailSheetHero` — cabecera rica: avatar/foto/escudo grande opcional (o icono con color de tipo), título grande, línea secundaria, fila de badges de estado/tipo, y acciones (Editar y demás) alineadas a la derecha, mostradas solo si se pasa permiso — misma condición que hoy, sin cambios de lógica.
- `DetailSection` — se le añade `icon` y el encabezado queda en MAYÚSCULAS con separador; espaciado uniforme entre secciones.
- `DetailField` — etiqueta chica en gris, valor destacado; ya existe, se afina tipografía y alineación.
- `DetailItemCard` (nueva) — mini-tarjeta escaneable para elementos repetidos (lesión, gasto, partido, comentario, vuelo, comida): icono + título + subtítulo + badge de color + acción opcional.
- `DetailEmptyBlock` (nueva) — estado vacío suave con icono y texto ("Sin lesiones activas").
- `DetailChips` / `DetailBadge` — badges de color consistentes con los tokens del tema.

Todo queda exportado desde el mismo archivo para que ningún módulo tenga que inventar markup.

**Módulos donde se aplica** (reemplazando cabeceras y listas planas por las piezas anteriores):

Plantel (`PersonDetailSheet`), Salud (`PlayerHealthSheet`, `InjuryDetailSheet`), Desarrollo (`PlayerDevelopmentSheet`), Nutrición (`PlayerNutritionSheet`, `EquivalenceSheet`), Entrenamientos (`SessionDetailSheet`), Torneo/Partidos (`MatchOpsSheet`), Viajes (`TripDetailSheet`, Vuelo/Hotel/Transporte/Comida/Material), Solicitudes (`RequestDetailSheet`), Compras, Coordinación (`TaskDetailSheet`, `MeetingDetailSheet`), Comunicados, Multimedia, Agenda (`EventDetailSheet`, `DaySheet`).

Se hace por olas para no romper nada: (a) piezas base, (b) Plantel + Agenda + Salud, (c) Coordinación/Solicitudes/Compras/Partidos, (d) Viajes/Nutrición/Entrenamientos/Desarrollo/Comunicados/Multimedia. Cada sheet conserva exactamente sus mismos campos, condiciones y acciones.

## 2. Plantel más visual

- `PersonCards`: tarjeta con foto más grande, dorsal destacado en esquina, nombre en dos niveles (nombre / apellidos), badges de posición y estado físico con color, y jerarquía clara por grupo de posición (encabezado con icono y conteo).
- Ficha del jugador: cabecera `DetailSheetHero` con foto, dorsal y estado; secciones DATOS DEPORTIVOS / CONTACTO / SALUD con campos etiqueta-valor y mini-tarjetas.

## 3. Agenda rehecha (visual)

Colores por tipo ya centralizados en `src/lib/eventTypes.ts` (`--event-partido`, etc.). Se reutiliza ese mapa en las tres pestañas y en cualquier otra vista que muestre eventos, para que "partido" sea el mismo color en toda la app.

- **Nuevo `EventCard`** (`src/components/calendar/EventCard.tsx`): barra lateral con el color del tipo, hora grande a la izquierda, icono del tipo, título, y renglón de contexto (rival y sede, destino, equipo). Sustituye el `StandardCard` genérico de la lista.
- **AGENDA (lista)**: encabezados de día con etiqueta humana ("HOY", "MAÑANA", "Vie 15 ago") y contador de eventos; chips de filtro por tipo con su color (se mantienen los filtros actuales); estado vacío con icono.
- **MES (calendario)**: grid mensual limpio, celdas con puntos de color por tipo, hoy marcado, día seleccionado resaltado y sus eventos listados debajo con el mismo `EventCard`; leyenda de colores al pie.
- **VIAJES**: se mantiene la misma información y permisos, presentada con el estándar de sheet (hero + secciones + mini-tarjetas para vuelos, hotel, transporte, comidas y pase de abordar).

## Notas técnicas

- Cambios limitados a componentes de presentación y a `src/styles.css` si hace falta afinar tokens de color de evento.
- Sin migraciones, sin cambios en hooks de datos, sin tocar condiciones de permiso (se siguen recibiendo tal cual por props).
- Sin emojis; solo iconos lucide.

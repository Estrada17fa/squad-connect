# Rehacer módulo Coordinación (Tareas y Juntas)

Look tipo Notion/Monday con nuestra identidad (dark, verde neón, glass), mismo lenguaje visual que Usuarios: filtros compactos, tarjetas escaneables, sheets en lectura + botón Editar, iconos (nunca emojis), fechas consistentes.

## 1. Base de datos (una sola migración)

Hoy `tasks` y `meetings` no tienen categoría: son solo de club, así que los 6 niveles no se pueden aplicar de verdad. Se añade alcance, prioridad "urgente" y checklist:

- `tasks.team_id` y `meetings.team_id` (nullable = "todo el club").
- Nuevo valor `urgente` en el enum de prioridad.
- Nueva tabla `task_checklist_items` (tarea, texto, hecho, orden) con permisos y reglas de acceso heredadas de la tarea.
- Nueva función de alcance `coord_scope_ok(user, team_id, requiere_edicion)` — misma forma que la que ya usa Solicitudes — y reescritura de las reglas de acceso de `tasks`, `task_assignees`, `meetings`, `meeting_attendees` y checklist a los 6 niveles:
  - Sin acceso: nada.
  - Vista jugador: solo lo asignado/convocado a él.
  - Lector categoría: lo suyo + sus categorías + club entero (sin editar).
  - Lector global: todo (sin editar).
  - Editor categoría: crear/editar/borrar en sus categorías y club.
  - Editor global: todo.
  - En todos los casos el asignado puede cambiar el estado de SU tarea y confirmar su asistencia a una junta.
- El evento espejo en el calendario (tipo junta) se mantiene y hereda el `team_id` de la junta, de modo que Agenda/Mes ya podrán filtrarlo por categoría. Las tareas con fecha límite quedan consultables por fecha (índice sobre fecha límite + club) para que Inicio/Agenda las consuman después. No se construyen esas vistas ahora.

## 2. Tareas — tablero tipo Monday

- Agrupación por estado en tres grupos colapsables: **Por hacer** (pendiente), **En progreso** (en progreso y en pausa, con su chip distintivo), **Hecha** (completada). Cada grupo con contador.
- Móvil: grupos apilados (por defecto). Escritorio: interruptor para ver Kanban en columnas con arrastrar y soltar entre columnas para cambiar de estado.
- Fila/tarjeta de tarea escaneable: barra de color de prioridad a la izquierda (baja/media/alta/urgente), título, avatares de asignados (apilados, +N), fecha límite con aviso si está vencida, chip de categoría o "Club". Nada de texto sobrante.
- Cambio de estado rápido: arrastrar en escritorio; menú rápido en la tarjeta en móvil. Disponible para editores y para el propio asignado.
- Detalle en sheet: lectura primero, con Editar/Eliminar solo si tiene permiso. Incluye checklist estilo Notion (agregar, marcar, reordenar por orden de creación, borrar) con barra de progreso.
- Crear/editar: título, descripción, alcance + asignados (ver punto 4), fecha límite, prioridad, estado.
- Filtros tipo Usuarios: buscador + chips de estado, prioridad, "solo mías" y categoría.

## 3. Juntas — agenda

- Lista dividida en **Próximas** y **Pasadas**, cada junta como tarjeta: título, fecha y hora, ubicación (componente de ubicación con mapa ya existente), avatares de convocados y chip de categoría/Club.
- Crear/editar: título, agenda/descripción, fecha y hora, ubicación (catálogo del club con mapa), alcance + convocados. Sigue generando el evento espejo en el calendario.
- Detalle en lectura: agenda, notas, ubicación con mapa y "Cómo llegar", lista de convocados con su estado. El convocado confirma o rechaza asistencia desde ahí, aunque no sea editor.
- Filtros: buscador + chips próximas/pasadas, estado, "solo mías" y categoría.

## 4. Asignación / convocatoria (control compartido)

Un único selector reutilizable con tres alcances claros:

- **Personas**: buscador y selección múltiple del staff/miembros del club.
- **Categoría**: elige una categoría; se resuelve a todos sus miembros al guardar y la tarea/junta queda marcada con esa categoría.
- **Club entero**: todos los miembros activos; la tarea/junta queda sin categoría (alcance club).

Al guardar siempre se persisten las personas resueltas (para notificaciones y "solo mías") además del alcance.

## 5. Detalles técnicos

- Migración única con las tablas, enum, función de alcance, permisos y reglas de acceso descritas.
- `src/hooks/useCoordinacion.ts`: añadir categoría y checklist a las consultas, filtrado por nivel con `useTeamAccess("coordinacion_interna")`, mutaciones de estado, checklist y asistencia, manteniendo el tiempo real ya existente.
- Nuevos componentes en `src/components/coordinacion/`: `TaskBoard` (grupos + kanban), `TaskRowCard`, `TaskChecklist`, `AssignmentPicker` (alcance compartido), `CoordFilters`; reescritura de `TaskFormDialog`, `TaskDetailSheet`, `MeetingFormDialog`, `MeetingDetailSheet` y de la página `m.coordinacion_interna.tsx`.
- Arrastrar y soltar con la API nativa de HTML5 (sin dependencias nuevas), solo en escritorio.
- Fechas siempre en `timestamptz` y formateadas con las utilidades de calendario del club (zona horaria y formato configurados).

## Nota

La prioridad "urgente" es nueva; las tareas existentes conservan la suya. El estado "En pausa" se conserva como matiz dentro del grupo "En progreso" para no perder datos ya capturados.

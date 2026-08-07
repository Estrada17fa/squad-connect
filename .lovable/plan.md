# Convocatoria automática: todo el equipo por defecto

Hoy el selector de asistentes empieza vacío y hay que pulsar "Todo el equipo". Se invierte: al elegir la categoría, todos quedan convocados; personalizar es la excepción.

## 1. AttendeePicker con dos modos

El selector compartido (`AttendeePicker`, usado por eventos y por sesiones de entrenamiento) pasa a tener dos estados:

- **Automático (por defecto)**: muestra una tarjeta compacta "Todo el equipo convocado (N)" con la categoría y el conteo de miembros, más un botón **"Personalizar convocatoria"**. No se ve la lista.
- **Personalizado**: aparece la lista con buscador y casillas como hoy, con acciones "Todo el equipo" y "Quitar todos", más un enlace **"Volver a todo el equipo"** que regresa al modo automático.

Mientras esté en modo automático, la selección se sincroniza sola con los miembros del equipo: en cuanto carga la lista de miembros, `value` pasa a ser el equipo completo. Así el guardado en `event_attendees` no cambia — sigue recibiendo la lista de ids.

Nuevas props: `mode` ("auto" | "custom") y `onModeChange`, controladas por cada formulario.

## 2. Cambio de equipo

Al cambiar la categoría en el formulario, la convocatoria se recalcula al equipo completo del nuevo equipo y el modo vuelve a automático. Si había una personalización, se avisa con un aviso discreto (toast: "Se recalculó la convocatoria al equipo completo").

## 3. Edición de un evento/sesión existente

Al abrir en edición se cargan los convocados guardados. Si coinciden exactamente con todos los miembros del equipo, se muestra en modo automático; si no, arranca en modo personalizado con la lista visible. No se altera la convocatoria ya guardada al abrir.

## 4. Cómo se ve en el detalle

En el detalle del evento y en el de la sesión, la convocatoria se muestra como:

- "Todo el equipo (N)" cuando los convocados son todos los miembros del equipo.
- "N convocados de M" con la lista de nombres cuando fue personalizada.

El evento hoy no muestra la convocatoria en su hoja de detalle; se añade ese bloque usando el hook existente `useEventAttendees` junto al conteo de miembros del equipo.

## Detalles técnicos

- Modificados: `src/components/calendar/AttendeePicker.tsx` (modos auto/custom, autoselección), `src/components/calendar/EventFormDialog.tsx` y `src/components/entrenamientos/SessionFormDialog.tsx` (estado del modo, reset al cambiar de equipo, detección auto/custom al editar), `src/components/calendar/EventDetailSheet.tsx` y `src/components/entrenamientos/SessionDetailSheet.tsx` (bloque de convocatoria).
- Sin cambios de base de datos: `saveCalendarEvent` y `syncEventAttendees` quedan igual.

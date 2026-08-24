# Crear entrenamientos sin mecánica técnica

Dos caminos, un mismo resultado: el entrenamiento vive en la Agenda y su plan vive en Entrenamientos. El entrenador nunca ve "evento", "ligar" ni "sesión sin evento".

## 1. Fuera el dropdown técnico

Del formulario de entrenamiento desaparecen el selector "Evento del calendario" (crear / ligar / sin evento) y la lista de eventos existentes. En su lugar, campos naturales siempre visibles:

- Equipo
- Título y objetivo
- Fecha y hora
- Lugar
- Convocados
- Plan por fases (opcional)

El sistema decide solo:
- Si el entrenador entró desde "Por planear" o desde un entrenamiento que ya está en la Agenda, se actualiza ese entrenamiento (misma fecha/hora/lugar editables) y el plan queda pegado a él.
- Si entró con el botón de crear, se crea el entrenamiento en la Agenda y su plan al mismo tiempo.

Guardar sin ejercicios es válido: queda como "por planear".

## 2. Sección "Por planear" en Entrenamientos

Arriba de la pestaña Sesiones, antes de "Próximas", una sección "Por planear" con los entrenamientos ya agendados en el calendario del equipo que todavía no tienen plan (ni sesión ligada, o sesión ligada con cero ejercicios). Solo entrenamientos futuros y solo de las categorías donde el usuario es editor.

Cada tarjeta, con el estándar visual del módulo y barra de acento: fecha y hora destacadas, título, categoría, lugar, e indicador "Sin plan". Al tocarla se abre el formulario ya cargado con esos datos para armar el plan; al guardar, la tarjeta sale de "Por planear" y aparece en "Próximas".

Si no hay nada pendiente, la sección no se muestra.

## 3. Lenguaje

- "Nueva sesión" pasa a "Nuevo entrenamiento"; la ficha habla de "entrenamiento" y "plan".
- Se quita el filtro técnico "ligados a evento" de la barra de filtros; se conserva el de con/sin plan.
- El icono de calendario en la tarjeta deja de significar "ligado" y no se usa como marca técnica.

## Detalles técnicos

- `SessionFormDialog.tsx`: se elimina el estado `eventMode` y el `select` de eventos. Nueva prop `calendarEvent` (evento ya agendado) para el camino "Por planear". Al guardar siempre se llama `saveCalendarEvent` con `eventId` cuando existe (actualiza fecha/hora/lugar/convocatoria) o sin él (crea), y el id resultante va a `training_sessions.event_id`. En edición se precargan lugar y convocados del evento ligado (hoy se pierden).
- Nueva query en `useTraining.ts` (o cálculo en la ruta con `useCalendarEvents` en modo club): eventos `event_type = "entrenamiento"` futuros sin sesión con plan, cruzando contra `training_sessions` + `useSessionSummaries`.
- Nuevo componente `PendingPlanCard` en `TrainingPieces.tsx`.
- `m.entrenamientos.tsx`: monta la sección "Por planear" filtrada por `useEditableTeams("entrenamientos")` y pasa el evento elegido al formulario.
- Sin cambios en base de datos, RLS ni permisos.

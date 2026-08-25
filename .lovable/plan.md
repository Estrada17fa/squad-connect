# Notificaciones: solo lo accionable o dirigido a la persona

Todo se hace sobre el sistema actual (`notifications`, `notify_users`, `notify_group`, campana in-app). No se crea push nuevo.

## 1. Auditoría: qué se envía HOY

Hoy solo quedan 6 avisos activos (el recorte anterior apagó de más):

| Avisa hoy | Va a | ¿Se queda? |
|---|---|---|
| Comunicado del club | Todo el club | Sí |
| Comunicado por categoría | Esa categoría | Sí |
| Convocatoria a partido | El convocado | Sí |
| Plan de entrenamiento publicado | Convocados de la sesión | Sí |
| Nuevo evento en agenda (cualquier tipo, club/categoría) | Todos | **No** (ambiental) |
| Cambio de horario de cualquier evento | Todos | Se acota solo a entrenamientos |

Nada de multimedia, resultados, inventario, compras, salud general, desarrollo ni tareas ajenas está activo hoy: esos ya no generan avisos y así se quedan.

## 2. Qué se quita

- Aviso genérico de "nuevo evento" para cualquier tipo de evento.
- Aviso de cambio de horario para eventos que no sean entrenamiento (partidos y juntas avisan por su propia vía: citación e invitación).

## 3. Qué se restaura / agrega (cada uno solo a quien le toca)

- **Partidos**: convocatoria al convocado (ya existe) + cambio de citación / punto de reunión → a los convocados de ese partido.
- **Juntas**: al invitar a alguien → a esa persona. Cambio de fecha/hora/lugar de la junta → a los invitados.
- **Citas médicas**: al agendar y al cambiar la fecha/hora → **solo al paciente**. Nunca a staff ni a terceros.
- **Tareas**: al asignar → al asignado. Al cambiar su fecha límite → a los asignados. Nada más de tareas (ni borrados, ni movimientos ajenos).
- **Solicitudes**: nueva solicitud → a los aprobadores de ese tipo. Aprobada / rechazada / requiere info → al solicitante.
- **Comunicados**: se mantienen tal cual (club y categoría).
- **Viajes**: al agregar a alguien como viajero → a esa persona. Al ponerla en un vuelo, en un transporte, o al subirle su pase de abordar → a esa persona. Cambio de citación del viaje → a los viajeros.
- **Entrenamientos**: al agendar el entrenamiento y al cambiar su horario → a la categoría convocada; se conserva el aviso de plan publicado, evitando duplicar con el de agenda.
- **Documentos**: al subir un documento con persona destinataria → solo a esa persona.

## 4. Confirmación explícita de lo que NO notifica

- **Multimedia**: no notifica fotos ni videos. Confirmado: sus dos avisos ya están eliminados y no se recrean.
- **Resultados de partido / torneo**: no existe ni existirá aviso al capturar resultado, goles ni tabla.
- Inventario, compras y facturas, gastos, lesiones/revisiones/recetas, desarrollo, tareas ajenas: sin avisos.

## 5. Regla transversal: no auto-notificarse

`notify_users` deja de crear la notificación para la persona que ejecuta la acción (se compara contra el usuario autenticado). Al ser el punto central, aplica a todos los avisos, incluidos los de difusión, y también al push nativo cuando se encienda.

## Detalle técnico

- Una sola migración: recrea los triggers/funciones `SECURITY DEFINER` que faltan (`notify_meeting_invited`, `notify_meeting_changed`, `notify_task_assigned`, `notify_task_due_changed`, `notify_request_created`, `notify_request_decided`, `notify_medical_appointment`, `notify_match_logistics_change`, `notify_trip_traveler`, `notify_flight_passenger`, `notify_transport_passenger`, `notify_boarding_pass`) reusando su lógica previa, más un `notify_document_related` nuevo sobre `documents` (solo si `related_user_id` no es nulo).
- `notify_calendar_event_created` / `notify_calendar_event_time_changed` se acotan a `event_type = 'entrenamiento'` y siguen ignorando eventos privados.
- Citas médicas: destinatario único `player_user_id`; nunca se usa `notify_group`.
- Todas las funciones nuevas siguen sin `EXECUTE` para `anon`/`authenticated` (igual que las actuales).
- Frontend: `src/lib/notificationTargets.ts` recupera los destinos de juntas, tareas, solicitudes, viajes, partidos y documentos para que cada aviso abra su ficha; sin cambios de permisos.

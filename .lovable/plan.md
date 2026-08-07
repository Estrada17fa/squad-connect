# Eventos: creación compartida, convocatoria masiva y catálogo de lugares

## 1. Crear el evento desde la sesión de entrenamiento

Hoy `SessionFormDialog` inserta el evento con su propio código: solo título, fecha y lugar, **sin asistentes**, y sin la validación que sí tiene el formulario de eventos. Además, la regla de acceso de `calendar_events` exige ser **editor del módulo Agenda en ese equipo**: un técnico que es editor de Entrenamientos pero no de Agenda recibe un error al insertar, y el guardado se corta sin crear nada. Primer paso: reproducir el guardado y confirmar cuál de los dos casos está fallando.

Corrección:

- Extraer la creación/edición de evento a un módulo compartido `src/lib/calendarEvents.ts` (o hook `useSaveCalendarEvent`) con una función `saveCalendarEvent({ clubId, teamId, eventType, title, startsAt, endsAt, location, locationId, description, attendeeIds, userId, eventId? })` que hace el insert/update del evento y la sincronización de `event_attendees`. Es exactamente la lógica que hoy vive dentro de `EventFormDialog`.
- `EventFormDialog` pasa a usar esa función (mismo comportamiento, sin duplicar).
- `SessionFormDialog` la usa también: con "Crear evento nuevo" crea el evento tipo `entrenamiento` con fecha, lugar y convocados, obtiene el `id` y liga la sesión a ese `event_id`. Con "Ligar a existente" usa el `event_id` elegido. Sin evento, queda solo el plan.
- Si el fallo es de permisos, se amplía la regla de escritura de `calendar_events` para aceptar también editor del módulo `entrenamientos` en ese equipo cuando el evento es de tipo entrenamiento.
- Verificación: crear una sesión con evento nuevo y comprobar que aparece en Agenda y en Mes.

## 2. Convocar a todo el equipo de un golpe

En el selector de asistentes (compartido entre eventos y sesiones):

- Cabecera con contador y dos acciones: **"Convocar a todo el equipo"** y **"Quitar todos"**.
- Al convocar a todos se marcan todos los miembros del equipo elegido; después se puede desmarcar a quien sea (p. ej. lesionados). La selección individual actual se mantiene igual.
- La lista respeta el buscador: si hay texto en el buscador, "seleccionar todos" aplica a los resultados visibles.
- Al cambiar de equipo, la selección se reinicia (como hoy).
- La convocatoria automática de miembros futuros no se incluye: añade complejidad y estado nuevo; se deja la selección masiva.

Este selector se extrae a `src/components/calendar/AttendeePicker.tsx` para usarlo igual en el formulario de evento y en el de sesión.

## 3. Catálogo de lugares del club

Tabla nueva `locations`: `club_id`, `name`, `address` (opcional), `notes` (opcional), `created_by`, fechas. Acceso: cualquier miembro del club puede verlos; solo editores del club los crean, editan o borran. Aislamiento por club.

- `calendar_events` gana `location_id` (opcional). Se sigue guardando el texto `location` para lugares escritos a mano, de modo que los eventos ya existentes no cambian.
- En el formulario de evento, la ubicación pasa a ser un **combo**: lista de lugares guardados + opción de escribir uno libre. Si se escribe uno nuevo, aparece un botón "Guardar en el catálogo" que lo agrega y lo deja seleccionado.
- Gestor de lugares en Admin (configuración del club): lista con crear, editar y eliminar, solo para editores. Un lugar en uso no se borra en duro; se avisa.
- El mismo selector se usa en la sesión de entrenamiento y en cualquier evento.

## Detalles técnicos

- Nuevos: `src/lib/calendarEvents.ts` (guardado compartido de evento + asistentes), `src/components/calendar/AttendeePicker.tsx`, `src/components/calendar/LocationField.tsx`, `src/hooks/useLocations.ts`, gestor de lugares en la página de Admin.
- Modificados: `EventFormDialog.tsx`, `SessionFormDialog.tsx`, tipos de `useCalendarEvents.ts`.
- Migración: tabla `locations` con sus permisos y `calendar_events.location_id`; ajuste de la regla de escritura de eventos de entrenamiento si la verificación lo confirma.

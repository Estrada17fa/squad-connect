# Notificaciones en Coordinación

Se reutiliza el sistema ya existente (tabla `notifications`, `notify_users`, `notify_group`, gancho de push). No se crea push nuevo ni tablas nuevas: solo se generan los avisos que hoy faltan.

## Qué ya funciona (verificado en la base de datos)

- Asignar una tarea a alguien ya avisa ("Se te asignó una tarea" + título), vía trigger en `task_assignees`.
- Convocar a alguien a una junta ya avisa ("Te invitaron a una junta" + título y fecha), vía trigger en `meeting_attendees`.
- Asignar por categoría o por club entero ya cae en estos avisos: la app resuelve el alcance a personas y las inserta una por una, así que cada persona recibe su notificación.
- Nunca se notifica a quien creó la tarea/junta si se autoasigna.

Estos dos avisos se dejan tal cual, solo se afinan los textos para que digan exactamente "Se te asignó la tarea: [título]" y "Fuiste convocado a la junta: [título]".

## Qué falta y se agrega

**1. Cambio de fecha**
- Tarea: si cambia la fecha límite, se avisa a todos los asignados: "Cambió la fecha de la tarea: [título]" con la nueva fecha (o "sin fecha límite" si se quitó).
- Junta: si cambia la fecha/hora de inicio, se avisa a todos los convocados: "Cambió la fecha de la junta: [título]" con la nueva fecha y hora.

**2. Cancelación**
- Junta: al pasar su estado a "Cancelada", se avisa a los convocados: "Se canceló la junta: [título]".
- Tarea: como las tareas no tienen estado "cancelada", el equivalente es eliminarla. Al eliminar una tarea se avisa a sus asignados: "Se eliminó la tarea: [título]". Este aviso no lleva enlace al detalle (el objeto ya no existe); el centro de notificaciones ya sabe manejar ese caso.

**3. Regla común**
- Nunca se notifica a la persona que hizo el cambio.
- Solo se notifica si el cambio es real (misma fecha guardada de nuevo no genera aviso).
- Todos los avisos apuntan a Coordinación con el id correspondiente, para que al tocarlos abran el detalle de la tarea o la junta.

## Notas técnicas

- Migración SQL únicamente; cero cambios de interfaz.
- Nuevos triggers `AFTER UPDATE` en `tasks` (cuando cambia `due_at`) y en `meetings` (cuando cambia `starts_at` o el estado pasa a `cancelada`), y un `BEFORE DELETE` en `tasks`.
- Los destinatarios salen de `task_assignees` / `meeting_attendees`, y el envío usa `notify_users`, así que el gancho de push (`notifications_push_hook`) se dispara solo cuando se active el push nativo.
- Funciones `SECURITY DEFINER` con `search_path` fijo, siguiendo el patrón de los triggers de notificación ya existentes.
- Se corrige un detalle interno de `notify_users`: reutiliza la misma variable para el destinatario y para el id de la notificación insertada; se separa en dos variables para evitar comportamiento frágil a futuro.
- Nuevos tipos de notificación: `tarea_fecha`, `tarea_eliminada`, `junta_fecha`, `junta_cancelada`.

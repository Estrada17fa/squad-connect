# Sistema de notificaciones (genérico)

Base reutilizable por todos los módulos: una sola tabla, triggers en el servidor y un centro de notificaciones en el header. Push nativo queda preparado pero apagado.

## Qué se crea en la base de datos

**Tablas nuevas (2)**

- `notifications`: `id`, `club_id`, `user_id` (destinatario), `type`, `title`, `body`, `related_module`, `related_id`, `read_at`, `created_at`.
- `push_subscriptions`: `id`, `user_id`, `platform` ('ios' | 'android' | 'web'), `token`, `created_at` (único por usuario+token). Sin uso todavía.

**Reglas de acceso**

- Cada usuario solo ve sus propias notificaciones y solo dentro de su club.
- Cada usuario solo puede marcar como leídas las suyas.
- Nadie puede crear notificaciones desde la app: se generan solo en el servidor mediante triggers.
- `push_subscriptions`: cada usuario administra únicamente sus propios dispositivos.

**Funciones y triggers nuevos**

- `notify_users(club, destinatarios[], tipo, título, cuerpo, módulo, id)`: función interna única que inserta las notificaciones y llama al gancho de push. Todo lo demás la usa.
- `notifications_push_hook()`: gancho documentado que hoy no hace nada (stub agnóstico de proveedor). Aquí se conectará Firebase/APNs más adelante sin tocar el resto.
- Trigger en `requests` (alta): avisa a la lista efectiva de aprobadores de ese tipo, reutilizando la función de aprobadores que ya existe (`request_type_approver_ids`). No duplica lógica.
- Trigger en `requests` (cambio de estatus): avisa al solicitante cuando su solicitud se aprueba o se rechaza.
- Trigger en `inventory_loans` (alta con solicitud ligada): avisa al solicitante que su material fue entregado.
- Trigger en `task_assignees`: avisa a cada asignado, excepto a quien creó la tarea si se auto-asignó.
- Trigger en `meeting_attendees`: avisa a cada invitado de la junta, excepto al creador.
- Realtime activado para `notifications`.

Los textos van en español y reutilizan el título/resumen ya guardado en cada registro (ej. "Tu solicitud de Balones ×5 fue aprobada", "Se te asignó la tarea: Preparar utilería").

**Préstamos por vencer**: requiere ejecución programada. Se deja lista una función `notify_due_loans()` (evita duplicados por préstamo y día) que puede correr diariamente; queda documentada y activable, sin depender de ella para el resto del sistema.

## Interfaz

- Campana en el header (junto al avatar) con badge de no leídas.
- Panel lateral estilo glass: más nuevas arriba, no leídas resaltadas, agrupadas por fecha relativa.
- Al tocar una notificación: se marca como leída y navega al objeto según módulo + id (solicitud, tarea, junta, préstamo), abriendo su detalle.
- Botón "Marcar todas como leídas".
- Realtime: llegan al instante y el badge se actualiza solo.

## Notas técnicas

- Nuevo hook `src/hooks/useNotifications.ts` (lista, conteo, marcar leídas, suscripción realtime con limpieza en unmount).
- Nuevos componentes `src/components/notificaciones/NotificationBell.tsx` y `NotificationPanel.tsx`, montados en el `Header` de `AppLayout.tsx`.
- Navegación por deep-link: se usa un parámetro de búsqueda (ej. `/m/solicitudes?open=<id>`) que las vistas existentes ya pueden leer para abrir el sheet correspondiente; se añade ese soporte en solicitudes, coordinación e inventario.
- Los triggers son `SECURITY DEFINER` con `search_path` fijo, y nunca notifican al propio actor.
- Sin edge functions: el gancho de push vive en la base de datos y, cuando se active, llamará a una ruta de servidor del propio proyecto.

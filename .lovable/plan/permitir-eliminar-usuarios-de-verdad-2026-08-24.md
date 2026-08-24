# Permitir eliminar usuarios de verdad

## Por qué no te deja hoy

La eliminación permanente está bloqueada a propósito: antes de borrar, el sistema revisa si la persona tiene registros en el club (solicitudes, préstamos, gastos, tareas, juntas, eventos, documentos, lesiones, revisiones médicas, feedback, objetivos, evaluaciones o viajes). Si encuentra cualquiera, responde "Este miembro tiene historial en el club. Usa 'Dar de baja'..." y no borra nada. Como casi todo miembro real ya tiene algún registro, en práctica nunca se puede eliminar.

## Qué haremos

1. **Eliminación forzada con confirmación clara.** Si la persona tiene historial, ya no se cancela: se abre un diálogo que muestra exactamente qué se va a borrar ("3 solicitudes, 2 préstamos, 5 eventos...") y pide escribir el nombre para confirmar. Al confirmar, se elimina la cuenta y su historial.
2. **Dos caminos visibles y distintos** en el menú de cada miembro:
   - *Dar de baja*: conserva todos sus registros (recomendado, sigue siendo el default).
   - *Eliminar permanentemente*: borra la cuenta y su historial personal.
3. **Protecciones que se mantienen**: no puedes eliminarte a ti mismo, no puedes eliminar al último administrador del club, y solo administradores del propio club pueden hacerlo.
4. **Limpieza en cascada en la base de datos** para que el borrado no falle a medias: los registros ligados a la persona se eliminan o se desvinculan según corresponda. Los registros del club que solo llevan su firma de "creado por" (gastos, tareas, documentos, publicaciones) se conservan y quedan sin autor, para no perder información contable ni operativa del club.

## Detalles técnicos

- Migración: revisar las llaves foráneas que apuntan a `profiles(id)` / `auth.users(id)` y ajustarlas:
  - `ON DELETE CASCADE` en datos personales del usuario: `player_profiles`, `team_memberships`, `user_permission_overrides`, `push_subscriptions`, `notifications`, `event_attendees`, `task_assignees`, `meeting_attendees`, `trip_travelers`, `trip_flight_passengers`, `trip_transport_passengers`, `trip_room_occupants`, `injuries`, `medical_*`, `player_medical_profile`, `development_*`, `nutrition_*`, `assessment_scores`, `routine_assignments`, `requests`, `inventory_loans`, `media_likes`, `media_comments`, `announcement_reads`.
  - `ON DELETE SET NULL` en columnas de autoría del club: `expenses.created_by`, `tasks.created_by`, `documents.uploaded_by`, `media_posts.author_id`, `announcements.author_id`, `request_status_history.actor_id`, y similares (haciendo la columna nullable donde haga falta).
- `src/lib/members.functions.ts`: `hardDeleteClubMember` acepta `force: boolean`. Sin `force` sigue devolviendo `{ ok: false, labels }` (para poder mostrar el resumen); con `force: true` procede al borrado tras las validaciones de admin/último-admin/uno-mismo.
- `checkMemberReferences` devolverá conteos por etiqueta, no solo etiquetas, para el resumen del diálogo.
- `src/components/usuarios/MembersTab.tsx`: reemplazar el `prompt()` nativo por un `AlertDialog` con el resumen de datos y campo de confirmación por nombre; invalidar las queries afectadas al terminar.

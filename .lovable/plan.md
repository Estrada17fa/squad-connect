# Limpieza de datos de prueba (script SQL para revisar y ejecutar tú)

No se ejecuta nada contra la base ahora. El resultado de este plan es **un archivo SQL** que puedes leer y correr tú mismo.

## Cuenta identificada

Tu admin: **e.estrada@loscabosunited.mx** (`0b9965c1-…`), super admin del club Los Cabos United. Es la única cuenta que sobrevive.

## Decisiones confirmadas

- Se borra `estradaemilio7@gmail.com` (y su fila de super admin).
- Torneos: se conservan los 2 torneos y sus 3 equipos participantes; se borran partidos, goles, ajustes de puntos y llaves de fase final (hoy 0 partidos, así que queda limpio e idempotente).
- Categorías: se conservan "Equipo Piloto" y "Liga Premier".
- Ubicaciones e inventario: se borran (incluye el duplicado "Estadio Don Koll" y el artículo "Balon").

## Qué se conserva

Club e identidad (nombre, escudo), categorías/equipos, roles y `role_permissions` (95 filas), configuración de tipos de solicitud, torneos + equipos participantes, tu cuenta admin con su membresía Admin y su fila en `super_admins`.

## Qué se vacía (agrupado por módulo en el script)

1. **Usuarios**: los otros 4 perfiles, sus `player_profiles`, `team_memberships`, `user_permission_overrides`, `request_type_user_overrides`, `role_request_approvals`, `push_subscriptions`, `membership_audit_log`, y sus filas en `auth.users`.
2. **Agenda y operación**: `calendar_events`, `event_attendees`, entrenamientos (`training_sessions`, `session_exercises`, `training_routines`, `routine_exercises`, `routine_assignments`, `exercises`), juntas (`meetings`, `meeting_attendees`).
3. **Partidos**: `match_callups`, `match_logistics`, y del torneo `tournament_matches`, `tournament_match_goals`, `tournament_playoff_ties`, `tournament_point_adjustments`.
4. **Viajes**: `trips` y toda su logística (transportes, vuelos, pasajeros, equipaje, hoteles, habitaciones, comidas, pases de abordar, viajeros).
5. **Coordinación**: `tasks`, `task_assignees`, `task_checklist_items`, solicitudes (`requests`, comentarios, historial), compras (`expenses`), inventario (`inventory_items`, `inventory_loans`), `suppliers`.
6. **Comunicación y archivos**: `announcements` + lecturas + audiencias, multimedia (posts, archivos, likes, comentarios), `documents`, `notifications`.
7. **Módulos personales**: salud (`injuries`, `injury_progress`, `medical_*`, `player_medical_profile`), desarrollo (`development_*`, `assessment_scores`), nutrición (planes, comidas, recetas, porciones, equivalencias, antropometría).
8. **Ubicaciones**: `locations`.

## Detalles técnicos

- Archivo nuevo: `supabase/cleanup/limpieza-datos-prueba.sql`. Solo `DELETE`, ningún `DROP`/`ALTER`/`TRUNCATE`; no toca estructura, RLS ni funciones.
- Encabezado con la protección: un `CREATE TEMP TABLE keep_users AS SELECT id FROM auth.users WHERE email = 'e.estrada@loscabosunited.mx'` más un guard que aborta con `RAISE EXCEPTION` si no encuentra exactamente 1 fila. Todos los borrados de usuario usan `WHERE id NOT IN (SELECT id FROM keep_users)`.
- Orden hijos → padres para no romper llaves foráneas; cada `DELETE` es idempotente (correrlo dos veces no falla ni borra de más).
- El borrado de `auth.users` va al final y solo funciona con rol privilegiado en el editor SQL; si tu sesión no lo permite, el script deja un comentario indicando que los perfiles quedan borrados y las cuentas se eliminan aparte.
- Los archivos ya subidos a Storage (fotos, PDFs, escudos) no se borran con SQL; el script incluye una nota de los buckets a vaciar manualmente si lo quieres.
- Al final del script, un bloque de comentarios con el resumen: tablas vaciadas vs. conservadas.

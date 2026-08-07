# Módulo DESARROLLO (ámbito equipo)

Seguimiento del progreso de cada jugador por el cuerpo técnico. Sin estadísticas de partido (eso será Torneo) y sin la parte mental/bienestar.

## Tablas nuevas

1. `development_feedback` — `club_id`, `team_id`, `player_user_id`, `feedback_date` (date), `context` (opcional), `content`, `created_by`, `created_at`, `updated_at`.
2. `development_goals` — `club_id`, `team_id`, `player_user_id`, `title`, `description`, `target_date`, `status` (`pendiente|en_progreso|cumplido|no_cumplido`, default `pendiente`), `completed_at`, `created_by`.
3. `development_assessments` — `club_id`, `team_id`, `player_user_id`, `assessment_date`, `notes`, `created_by`.
4. `assessment_scores` — `assessment_id`, `attribute` (texto: técnica, físico, táctica, actitud…), `score` (1-10, con `CHECK`). Único por (evaluación, atributo).
5. `training_routines` — `club_id`, `team_id`, `name`, `description`, `category`, `created_by`.
6. `routine_exercises` — `routine_id`, `name`, `sets`, `reps`, `instructions`, `order_index`.
7. `routine_assignments` — `routine_id`, `player_user_id`, `assigned_at`, `due_date`, `status` (`asignada|en_progreso|completada`), `notes`, `created_by`.

Enums nuevos: `development_goal_status`, `routine_assignment_status`. Índices en `club_id`, `team_id`, `player_user_id` y en las llaves foráneas de detalle (`assessment_id`, `routine_id`).

## Privacidad y RLS

Dos funciones `security definer`, mismo patrón que Salud:

- `public.development_level(_user_id, _team_id)` — resuelve el nivel efectivo del módulo `desarrollo` para ese equipo: rol por equipo, rol club-wide, y `user_permission_overrides` (el más específico gana). Super admin = `approver`. Aísla por `club_id` del equipo.
- `public.can_edit_development(_user_id, _team_id)` — verdadero con nivel `editor` o `approver`.

Reglas en todas las tablas:

- **Lectura**: `can_edit_development(auth.uid(), team_id)` **O** `player_user_id = auth.uid()`. Es decir: un lector (`read`) NO ve filas de otros jugadores; solo las suyas. Ver a todo el equipo exige editor.
- **Escritura** (crear/editar/borrar): solo `can_edit_development`. Única excepción: el jugador puede hacer `UPDATE` de `status` y `notes` de SUS propias filas de `routine_assignments` (marcar en progreso/completada).
- Tablas hijas (`assessment_scores`, `routine_exercises`) heredan el permiso vía `EXISTS` sobre la tabla padre. `routine_exercises` es legible además por cualquier jugador con una asignación de esa rutina (necesita ver sus ejercicios).
- `training_routines` es del equipo, no de un jugador: la lee quien es editor del equipo o quien tiene una asignación de esa rutina.
- Aislamiento por club y equipo en cada política, más `GRANT` a `authenticated` y `service_role`.

## Los tres niveles

- **read (Lector)**: ve únicamente SU propia información — su retro, sus objetivos, sus evaluaciones con gráfica, sus rutinas. Puede cambiar el estado de sus rutinas asignadas. Nada de otros jugadores, ni en UI ni en RLS.
- **editor (Editor)**: ve y gestiona el desarrollo de todo el equipo — registra retro, objetivos, evaluaciones, crea rutinas con ejercicios, asigna y actualiza estados. El cuerpo técnico.
- **approver (Aprobador)**: sin flujo de aprobación propio en este módulo; equivale a editor. Queda definido y asignable en Admin y documentado como sin uso propio, igual que en Viajes o Plantel.

## Interfaz

Sub-chips: **Resumen**, **Retroalimentación**, **Objetivos**, **Evaluaciones**, **Rutinas**, con `TeamFilter` como en Plantel y Salud. La UI se adapta al nivel: con `read` cada sub-vista muestra directamente lo propio, sin listado de jugadores ni botones de alta.

- **Resumen** — editor: tarjetas de jugadores del equipo (foto, dorsal, puesto) con último promedio de evaluación y objetivos activos; al abrir, un `EntitySheet` con su panorama: gráfica de evolución, objetivos activos, retro reciente y rutinas asignadas. Lector: ese mismo panorama, directo.
- **Retroalimentación** — historial cronológico; formulario con jugador, fecha, contexto opcional y contenido.
- **Objetivos** — alta por jugador con fecha meta; cambio de estado desde la tarjeta; aviso visual cuando la fecha meta está próxima o vencida.
- **Evaluaciones** — formulario con atributos y puntaje 1-10 (sliders); lo más visual: radar de la última evaluación y líneas de evolución por atributo (recharts, ya en el proyecto).
- **Rutinas** — crear rutina con lista ordenada de ejercicios (nombre, series, reps, instrucciones) y asignarla a uno o varios jugadores con fecha límite.

## Vista del jugador

En **Mi Perfil** una sección "Mi desarrollo" y en su ficha de Plantel el mismo panel: retro, objetivos, evaluaciones con gráfica y rutinas, en solo lectura, salvo el estado de sus propias rutinas.

## Notificaciones

Triggers con `notify_users` al insertar retroalimentación, objetivo o asignación de rutina, dirigidos al jugador, con enlace al módulo `desarrollo`.

## Detalles técnicos

- Migración: 7 tablas + 2 enums + funciones `development_level` / `can_edit_development` + políticas + grants + índices + triggers `set_updated_at` y de notificación.
- Frontend: `src/hooks/useDevelopment.ts`; ruta `src/routes/_authenticated/m.desarrollo.tsx`; componentes en `src/components/desarrollo/` (`PlayerDevelopmentSheet`, `FeedbackFormDialog`, `GoalFormDialog`, `AssessmentFormDialog`, `AssessmentChart`, `RoutineFormDialog`, `RoutineAssignDialog`); enganche en `mi-perfil.tsx` y `m.plantel.$playerId.tsx`.
- Permisos por equipo con `useTeamAccess("desarrollo")` y `useEditableTeams`; sin cambios en la matriz de Admin, que ya lista `desarrollo`.

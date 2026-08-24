-- =====================================================================
-- SQUAD — LIMPIEZA DE DATOS DE PRUEBA
-- =====================================================================
-- Solo DELETE de datos. NO toca estructura (tablas, RLS, funciones, triggers).
-- Idempotente: se puede correr varias veces sin fallar.
-- Orden: hijos antes que padres para no romper llaves foráneas.
--
-- CONSERVA: club e identidad, categorías/equipos, roles y role_permissions,
--           torneos + equipos participantes, y la cuenta admin de abajo.
-- BORRA:    el resto de datos operativos (usuarios de prueba, agenda,
--           entrenamientos, juntas, partidos, viajes, coordinación,
--           solicitudes, compras, inventario, comunicados, multimedia,
--           documentos, notificaciones, salud, desarrollo, nutrición,
--           ubicaciones).
--
-- EJECUTAR TODO DENTRO DE UNA TRANSACCIÓN. Revisa el resumen final y luego COMMIT.
-- =====================================================================

BEGIN;

-- ---------------------------------------------------------------------
-- 0) PROTECCIÓN: cuenta admin a conservar  (ÚNICO PARÁMETRO DEL SCRIPT)
-- ---------------------------------------------------------------------
CREATE TEMP TABLE keep_users AS
SELECT id
FROM auth.users
WHERE lower(email) = lower('e.estrada@loscabosunited.mx');

DO $$
DECLARE n int;
BEGIN
  SELECT count(*) INTO n FROM keep_users;
  IF n <> 1 THEN
    RAISE EXCEPTION
      'Abortado: se esperaba exactamente 1 cuenta admin a conservar, se encontraron %. Revisa el correo del paso 0.', n;
  END IF;
END $$;

-- ---------------------------------------------------------------------
-- 1) MÓDULOS PERSONALES: NUTRICIÓN
-- ---------------------------------------------------------------------
DELETE FROM public.nutrition_plan_meal_recipes;
DELETE FROM public.nutrition_plan_portions;
DELETE FROM public.nutrition_plan_meals;
DELETE FROM public.nutrition_meal_plans;
DELETE FROM public.nutrition_equivalence_items;
DELETE FROM public.nutrition_portion_equivalences;
DELETE FROM public.nutrition_recipes;
DELETE FROM public.nutrition_assessments;   -- antropometría (peso, ISAK)

-- ---------------------------------------------------------------------
-- 2) MÓDULOS PERSONALES: DESARROLLO
-- ---------------------------------------------------------------------
DELETE FROM public.assessment_scores;
DELETE FROM public.development_assessments;
DELETE FROM public.development_feedback;
DELETE FROM public.development_goals;
DELETE FROM public.development_measurements;

-- ---------------------------------------------------------------------
-- 3) MÓDULOS PERSONALES: SALUD
-- ---------------------------------------------------------------------
DELETE FROM public.injury_progress;
DELETE FROM public.injuries;
DELETE FROM public.medical_prescriptions;
DELETE FROM public.medical_appointments;
DELETE FROM public.medical_checkups;
DELETE FROM public.player_medical_profile;

-- ---------------------------------------------------------------------
-- 4) VIAJES Y SU LOGÍSTICA
-- ---------------------------------------------------------------------
DELETE FROM public.trip_boarding_passes;
DELETE FROM public.trip_flight_baggage_handlers;
DELETE FROM public.trip_flight_passengers;
DELETE FROM public.trip_luggage;
DELETE FROM public.trip_flights;
DELETE FROM public.trip_transport_passengers;
DELETE FROM public.trip_transports;
DELETE FROM public.trip_room_occupants;
DELETE FROM public.trip_rooms;
DELETE FROM public.trip_hotels;
DELETE FROM public.trip_meals;
DELETE FROM public.trip_travelers;
DELETE FROM public.trips;

-- ---------------------------------------------------------------------
-- 5) PARTIDOS (nuestros) Y RESULTADOS DE TORNEO
--    Se CONSERVAN: tournaments y tournament_teams (estructura).
-- ---------------------------------------------------------------------
DELETE FROM public.match_callups;
DELETE FROM public.match_logistics;
DELETE FROM public.tournament_match_goals;
DELETE FROM public.tournament_playoff_ties;
DELETE FROM public.tournament_point_adjustments;
DELETE FROM public.tournament_matches;
DELETE FROM public.player_competition_stats;

-- ---------------------------------------------------------------------
-- 6) ENTRENAMIENTOS
-- ---------------------------------------------------------------------
DELETE FROM public.session_exercises;
DELETE FROM public.training_sessions;
DELETE FROM public.routine_assignments;
DELETE FROM public.routine_exercises;
DELETE FROM public.training_routines;
DELETE FROM public.exercises;

-- ---------------------------------------------------------------------
-- 7) JUNTAS Y AGENDA
-- ---------------------------------------------------------------------
DELETE FROM public.meeting_attendees;
DELETE FROM public.meetings;
DELETE FROM public.event_attendees;
DELETE FROM public.calendar_events;

-- ---------------------------------------------------------------------
-- 8) COORDINACIÓN: TAREAS, SOLICITUDES, COMPRAS, INVENTARIO
-- ---------------------------------------------------------------------
DELETE FROM public.task_checklist_items;
DELETE FROM public.task_assignees;
DELETE FROM public.tasks;

DELETE FROM public.request_comments;
DELETE FROM public.request_status_history;
DELETE FROM public.requests;

DELETE FROM public.expenses;

DELETE FROM public.inventory_loans;
DELETE FROM public.inventory_items;
DELETE FROM public.suppliers;

-- ---------------------------------------------------------------------
-- 9) COMUNICACIÓN Y ARCHIVOS
-- ---------------------------------------------------------------------
DELETE FROM public.announcement_reads;
DELETE FROM public.announcement_teams;
DELETE FROM public.announcements;

DELETE FROM public.media_comments;
DELETE FROM public.media_likes;
DELETE FROM public.media_post_files;
DELETE FROM public.media_post_teams;
DELETE FROM public.media_posts;

DELETE FROM public.documents;
DELETE FROM public.notifications;

-- ---------------------------------------------------------------------
-- 10) UBICACIONES (catálogo de prueba, incluye el duplicado)
-- ---------------------------------------------------------------------
DELETE FROM public.locations;

-- ---------------------------------------------------------------------
-- 11) USUARIOS DE PRUEBA
--     Se conserva SOLO la cuenta de keep_users (paso 0) con su membresía
--     Admin y su fila en super_admins.
-- ---------------------------------------------------------------------
DELETE FROM public.push_subscriptions
 WHERE user_id NOT IN (SELECT id FROM keep_users);

DELETE FROM public.user_permission_overrides
 WHERE user_id NOT IN (SELECT id FROM keep_users);

DELETE FROM public.request_type_user_overrides
 WHERE user_id NOT IN (SELECT id FROM keep_users);

DELETE FROM public.role_request_approvals
 WHERE user_id NOT IN (SELECT id FROM keep_users);

DELETE FROM public.membership_audit_log
 WHERE user_id NOT IN (SELECT id FROM keep_users);

DELETE FROM public.club_invitations;                        -- invitaciones pendientes de prueba

DELETE FROM public.player_profiles
 WHERE user_id NOT IN (SELECT id FROM keep_users);

DELETE FROM public.team_memberships
 WHERE user_id NOT IN (SELECT id FROM keep_users);

DELETE FROM public.super_admins
 WHERE user_id NOT IN (SELECT id FROM keep_users);

DELETE FROM public.profiles
 WHERE id NOT IN (SELECT id FROM keep_users);

-- Cuentas de acceso (requiere rol privilegiado; en el editor SQL de Supabase funciona).
-- Si esta línea falla por permisos, los perfiles ya quedaron borrados y las cuentas
-- se pueden eliminar después desde la administración de usuarios.
DELETE FROM auth.users
 WHERE id NOT IN (SELECT id FROM keep_users);

-- ---------------------------------------------------------------------
-- 12) VERIFICACIÓN (revisa antes de COMMIT)
-- ---------------------------------------------------------------------
SELECT 'usuarios'      AS conserva, count(*) FROM public.profiles
UNION ALL SELECT 'clubes',        count(*) FROM public.clubs
UNION ALL SELECT 'categorias',    count(*) FROM public.teams
UNION ALL SELECT 'roles',         count(*) FROM public.roles
UNION ALL SELECT 'permisos_rol',  count(*) FROM public.role_permissions
UNION ALL SELECT 'torneos',       count(*) FROM public.tournaments
UNION ALL SELECT 'equipos_torneo',count(*) FROM public.tournament_teams
UNION ALL SELECT 'super_admins',  count(*) FROM public.super_admins;

COMMIT;
-- Si algo no cuadra en la verificación: ROLLBACK; en lugar de COMMIT.

-- =====================================================================
-- RESUMEN
-- =====================================================================
-- CONSERVADAS (sin cambios):
--   clubs, teams, roles, role_permissions, tournaments, tournament_teams,
--   profiles (solo e.estrada@loscabosunited.mx), team_memberships (su Admin),
--   super_admins (solo su fila), auth.users (solo su cuenta).
--
-- VACIADAS:
--   Nutrición: nutrition_meal_plans, nutrition_plan_meals, nutrition_plan_meal_recipes,
--     nutrition_plan_portions, nutrition_recipes, nutrition_portion_equivalences,
--     nutrition_equivalence_items, nutrition_assessments
--   Desarrollo: development_assessments, assessment_scores, development_feedback,
--     development_goals, development_measurements
--   Salud: injuries, injury_progress, medical_checkups, medical_appointments,
--     medical_prescriptions, player_medical_profile
--   Viajes: trips, trip_travelers, trip_transports, trip_transport_passengers,
--     trip_flights, trip_flight_passengers, trip_flight_baggage_handlers,
--     trip_luggage, trip_boarding_passes, trip_hotels, trip_rooms,
--     trip_room_occupants, trip_meals
--   Partidos: match_callups, match_logistics, tournament_matches,
--     tournament_match_goals, tournament_playoff_ties,
--     tournament_point_adjustments, player_competition_stats
--   Entrenamientos: training_sessions, session_exercises, training_routines,
--     routine_exercises, routine_assignments, exercises
--   Agenda/Juntas: calendar_events, event_attendees, meetings, meeting_attendees
--   Coordinación: tasks, task_assignees, task_checklist_items, requests,
--     request_comments, request_status_history, expenses, inventory_items,
--     inventory_loans, suppliers
--   Comunicación: announcements, announcement_teams, announcement_reads,
--     media_posts, media_post_files, media_post_teams, media_likes,
--     media_comments, documents, notifications
--   Config de prueba: locations, club_invitations
--   Usuarios: profiles, player_profiles, team_memberships,
--     user_permission_overrides, request_type_user_overrides,
--     role_request_approvals, push_subscriptions, membership_audit_log,
--     super_admins, auth.users  (todos EXCEPTO la cuenta admin conservada)
--
-- NOTA STORAGE: los archivos ya subidos (avatares, PDFs, fotos, facturas)
-- no se borran con SQL. Si quieres vaciarlos, hay que limpiar los buckets
-- aparte; el escudo del club está en el bucket de identidad — no lo borres.
-- =====================================================================

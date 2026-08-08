# Parte 2B-1 — RLS de los módulos personales (salud, desarrollo, nutrición)

Migra la seguridad de base de datos de las tablas de Salud y Desarrollo a la escala de 6 niveles. Solo estos módulos; el resto sigue con lo viejo. Nutrición todavía no tiene tablas (verificado en el esquema): el patrón queda documentado y se aplicará cuando se construya.

## Dos correcciones previas a las funciones nuevas (necesarias antes de tocar RLS)

Al revisar `effective_permission` encontré dos huecos reales que hoy no importan porque nada de la RLS la usa, pero que sí importarían al pasar la seguridad médica a estas funciones:

1. **Fuga entre clubes.** Una membresía "todo el club" (`team_id IS NULL`) hoy hace match con CUALQUIER `_team_id`, incluido un equipo de otro club. Corrección: la resolución por equipo exige que el equipo pertenezca a un club al que el usuario tiene acceso (`has_club_access`); si no, `sin_acceso`.
2. **Los niveles globales no alcanzan equipos ajenos.** `lector_global` / `editor_global` obtenidos en una categoría no aplican hoy a un equipo no asignado, que es justo lo que "global" significa. Corrección: si el usuario tiene un nivel global en el módulo en cualquier parte, ese nivel aplica a cualquier equipo de su club.

Sin esto, "editor_global" y el aislamiento por club no se cumplirían en la base. Las funciones `can_view_module`, `can_edit_module` y `can_view_own_row` no cambian de firma.

Además se añade la regla del dueño donde falta: `can_view_own_row` hoy devuelve `false` con `sin_acceso`. Se ajusta para que el dueño (`_owner_id = _user_id`) siempre vea lo suyo, sea cual sea el nivel.

## Políticas por tabla

Módulo `salud` para las cinco primeras, `desarrollo` para las de desarrollo.

Tablas con `player_user_id` y `team_id` propios — `injuries`, `medical_checkups`, `medical_prescriptions`, `player_medical_profile`, `development_feedback`, `development_goals`, `development_assessments`:

- **Ver**: `can_view_own_row(auth.uid(), '<modulo>', player_user_id, team_id)`. Con eso: dueño siempre; `vista_jugador` solo lo suyo; `lector_categoria`+ toda su categoría; global, todas las categorías del club; `sin_acceso`, nada ajeno.
- **Crear / editar / borrar**: `can_edit_module(auth.uid(), '<modulo>', team_id)`, más `has_club_access(auth.uid(), club_id)` al insertar, como hoy.

Tablas hijas — heredan por `EXISTS` contra el padre, con la misma pareja de reglas:

- `injury_progress` → `injuries` (ver: `can_view_own_row` con el `player_user_id`/`team_id` de la lesión; escribir: `can_edit_module` sobre el equipo de la lesión).
- `medical_prescriptions` tiene sus propias columnas, así que se trata como tabla principal; se mantiene además la coherencia con su `checkup_id`.
- `assessment_scores` → `development_assessments`, mismo esquema.

Rutinas (son del equipo, no de un jugador):

- `training_routines` — ver: `can_view_module(auth.uid(),'desarrollo',team_id)` con nivel de lectura de categoría o superior, **o** tener una asignación de esa rutina (`has_routine_assignment`), que es lo que permite al jugador ver su rutina. Escribir: `can_edit_module`.
- `routine_assignments` — ver: dueño (`player_user_id = auth.uid()`) o `can_view_own_row` sobre el equipo de la rutina. Escribir: `can_edit_module`; **excepción**: el jugador puede hacer UPDATE de SUS asignaciones (estado y notas), como hoy.
- `routine_exercises` — ver: quien puede ver la rutina padre (incluido el jugador asignado). Escribir: `can_edit_module` sobre el equipo de la rutina.

Las funciones viejas (`can_access_health`, `can_edit_health`, `health_level`, `can_edit_development`, `development_level`) **no se borran**: quedan intactas para lo que aún dependa de ellas; estas tablas dejan de referenciarlas. La limpieza se hará al cerrar toda la 2B.

## Verificación antes de cerrar

Consultas ejecutadas suplantando el nivel de cada perfil real del club (`effective_permission` por usuario/equipo) y prueba directa de las políticas con `set local role authenticated` + `request.jwt.claims` para cada caso:

1. **Jugador**: `select * from injuries` devuelve solo filas con su `player_user_id`; un `select` apuntando al id de la lesión de otro jugador devuelve cero filas. Mismo test en evaluaciones, recetas y retroalimentación.
2. **Técnico** (`sin_acceso` en salud): cero filas en las cinco tablas de salud, incluso consultando por id concreto. Se comprueba que sí sigue leyendo `player_profiles.availability_status` desde Plantel.
3. **Médico** (`editor_categoria` en salud de su categoría): ve y puede actualizar filas de su equipo; un `update`/`select` sobre una lesión de otra categoría devuelve cero filas / cero filas afectadas.
4. **Otro club**: usuario de club B no obtiene ninguna fila de las tablas de club A, incluyendo el caso de membresía "todo el club".
5. **Rutinas**: el jugador ve su asignación y sus ejercicios, puede cambiar el estado de su asignación y no puede cambiar el de otro.
6. Recorrido en el navegador con sesión real sobre Salud, Desarrollo y Mi Perfil para confirmar que no aparecen errores ni listas vacías indebidas.

Te entrego los resultados de esas seis pruebas al terminar; si alguna no pasa, no cierro la parte.

## Detalles técnicos

- Una sola migración: `CREATE OR REPLACE` de `effective_permission` y `can_view_own_row`, `DROP POLICY` + `CREATE POLICY` de las 12 tablas, sin cambios de esquema ni de datos.
- Sin cambios de frontend: los hooks ya leen la escala nueva desde la 2A.

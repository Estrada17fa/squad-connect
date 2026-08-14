# Torneo — Parte 1: estructura, equipos y sistema de puntos (Admin)

Módulo nuevo de tipo categoría (`module_key = 'torneo'`). Esta parte cubre solo la **gestión en Admin**: crear torneos, registrar equipos participantes y configurar el sistema de puntos. Partidos/resultados/tabla/goleo son Parte 2; la vista de lectura en Mi Club, Parte 3.

## Qué se podrá hacer al terminar

- Crear varios torneos por categoría (una categoría puede tener liga y copa a la vez), con temporada, tipo y estado.
- Registrar los equipos que compiten en cada torneo, con escudo opcional, marcando cuál es el nuestro.
- Definir el sistema de puntos del torneo desde un preset ("Liga Premier México" o "Estándar") y ajustarlo: puntos base, bonus de visita, penales en empate y el orden de los criterios de desempate.

## Base de datos

Tres tablas nuevas, todas con `club_id`, `created_at`/`updated_at` en timestamptz y trigger de actualización.

**tournaments**
- `club_id`, `team_id` (categoría del club dueña del torneo, obligatoria), `name`, `season` (texto, p. ej. "2026" o "Apertura 2026"), `type` (enum `tournament_type`: liga, copa, otro), `status` (enum `tournament_status`: en_curso, finalizado), `format` (texto opcional: "12 equipos, ida y vuelta"), `notes`.
- Campos del sistema de puntos, en la misma fila (un torneo = un sistema):
  - `points_win` (3), `points_draw` (1), `points_loss` (0).
  - `away_bonus_enabled` (false), `away_bonus_points` (1), `away_bonus_min_diff` (2).
  - `shootout_enabled` (false), `shootout_min_goals` (2), `shootout_winner_points` (1).
  - `tiebreakers` (jsonb: arreglo ordenado de claves, p. ej. `["diferencia_goles","goles_favor","directos","goles_visita_directos","promedio_goles","sorteo"]`).
  - `external_source` / `external_id` (nullable) — reservados como gancho de una API futura; no se usan ahora.

**tournament_teams**
- `tournament_id`, `club_id`, `name`, `short_name` (opcional), `crest_path` (ruta en storage, opcional), `is_our_team` (boolean), `notes`.
- Índice único parcial para que solo haya un equipo marcado como nuestro por torneo, y único por (torneo, nombre).

**Preparación para la Parte 2** (se crea ahora la tabla vacía para no volver a tocar el modelo):
`tournament_matches` con `tournament_id`, `club_id`, `matchday` (jornada), `kickoff_at` (timestamptz), `home_team_id`/`away_team_id` (→ tournament_teams), `home_goals`/`away_goals` (nullable), `status` (programado/jugado/suspendido), `shootout_winner_team_id` (nullable — ganador de la tanda de penales), `location_id` (nullable → locations), `calendar_event_id` (nullable, para el enlace con Agenda en Parte 3), `notes`. Sin interfaz en esta parte.

Storage: bucket privado `tournament-crests`, con acceso limitado a miembros del club (misma pauta que los adjuntos de comunicados).

## Seguridad (RLS)

Patrón de módulos de categoría, igual que Viajes/Entrenamientos:

- `tournaments`: ver → `can_view_module(auth.uid(), 'torneo', team_id)`; crear/editar/borrar → `can_edit_module(auth.uid(), 'torneo', team_id)` más pertenencia al club.
- `tournament_teams` y `tournament_matches`: heredan del torneo padre mediante un helper `tournament_team_id(_tournament_id)` (security definer), con `can_view_module` / `can_edit_module` sobre esa categoría.
- GRANT a `authenticated` y `service_role` en las tres tablas; sin acceso anónimo.

Resultado práctico: Editor de Categoría gestiona los torneos de sus categorías; Editor Global, los de todo el club; Sin Acceso no ve nada. Lector ve pero no edita (su vista bonita llega en la Parte 3).

## Presets del sistema de puntos

Definidos en el frontend (`src/lib/torneo.ts`), no en la base, para poder añadir más sin migraciones:

- **Estándar**: 3 / 1 / 0, sin bonus, sin penales; desempates: diferencia de goles, goles a favor, directos, sorteo.
- **Liga Premier México**: 3 / 1 / 0, bonus de visita +1 al ganar fuera por ≥2 goles, penales cuando el empate es de ≥2 goles con +1 al ganador de la tanda; desempates en el orden oficial: diferencia de goles, goles a favor, resultado entre ellos, goles de visita en directos, promedio de goles, sorteo.

Al crear un torneo se elige preset y luego se puede ajustar cada valor. El mismo archivo expondrá la función de cálculo de puntos de un partido (usada en la Parte 2) para que la lógica viva en un solo lugar.

## Interfaz (Admin)

Nueva ruta `/admin/torneo`, con las pestañas de módulo del hub Admin, siguiendo el estándar visual de Usuarios/Configuración.

- **Lista de torneos**: tarjetas `StandardCard` con nombre, categoría, temporada, tipo y `StatusBadge` de estado. Filtros limpios arriba: buscador, categoría, temporada, estado. Botón "Nuevo torneo" solo para editores.
- **Formulario de torneo** (diálogo, dos pasos): datos generales (nombre, categoría, temporada, tipo, estado, formato) y sistema de puntos (selector de preset + campos de puntos base, interruptores de bonus de visita y penales con sus valores, y lista ordenable de criterios de desempate con flechas arriba/abajo).
- **Ficha del torneo** (`DetailSheet` estándar, abre en lectura, botón Editar): resumen del torneo, resumen legible del sistema de puntos ("Victoria 3 · Empate 1 · Bonus visita +1 por ≥2 goles…"), y la sección de equipos participantes: lista con escudo (o iniciales), nombre, y distintivo "Nuestro equipo". Los editores pueden agregar, editar y eliminar equipos con confirmación.
- **Equipo participante** (diálogo): nombre, nombre corto, subida de escudo con vista previa, casilla "Es nuestro equipo".
- Sin emojis; iconos de lucide (Trophy, Shield, Users, Settings).

Ajuste menor: el módulo `torneo` pasa de ámbito "club" a ámbito por categoría en la definición de módulos, para que el selector de equipo activo y los permisos por categoría funcionen igual que en el resto de módulos de categoría.

## Notas para la Parte 2 (no se construye ahora)

El formulario de resultado capturará marcador local/visitante, jornada y fecha; cuando el empate alcance el mínimo configurado y la regla de penales esté activa, pedirá además quién ganó la tanda (`shootout_winner_team_id`, ya en el modelo). Con esos datos, la tabla de posiciones y el goleo se calculan con las reglas del torneo, y las estadísticas alimentarán `player_competition_stats` con `source = 'torneo'`.

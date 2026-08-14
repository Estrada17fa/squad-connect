# Torneo — mejoras: grupos, fase final, escudos y filtros

Todo es opcional y por torneo: un torneo sin grupos y sin fase final sigue funcionando exactamente igual que hoy (una tabla, partidos por jornada, goleo, sincronización con Agenda y Desarrollo intacta).

## 1. Formato: grupos configurables

En el formulario del torneo se agrega el formato de fase regular:
- **Sin grupos** (valor por defecto, comportamiento actual).
- **Con grupos**: se indica cuántos grupos (A, B, C…). Al registrar cada equipo participante aparece el selector de grupo; el equipo marcado como "nuestro" muestra su grupo en la cabecera.

Posiciones:
- Admin y Mi Club calculan una tabla por grupo con las mismas reglas de puntos y desempates ya configuradas; se muestran como secciones/pestañas Grupo A / Grupo B, abriendo por defecto la de nuestro grupo.
- Sin grupos: una sola tabla, igual que hoy.
- Los partidos no cambian: siguen siendo por jornada; cada partido aporta a la tabla del grupo de sus equipos.

## 2. Fase final (bracket) configurable

Por torneo se activa o no la fase final. Al activarla se elige la ronda inicial: octavos (16), cuartos (8), semifinales (4) o final (2), y si las llaves son a partido único o ida y vuelta (ajustable también llave por llave).

- El editor **arma los cruces manualmente** en la primera ronda eligiendo equipos de la lista de participantes. El sistema no decide quién clasifica.
- Al capturar el resultado de una llave (o el global de ida y vuelta, con penales si el sistema de puntos lo requiere), el ganador **avanza automáticamente** al cruce correspondiente de la siguiente ronda.
- El cuadro se dibuja con un motor único que se adapta al tamaño (octavos → cuartos → semis → final), con escudos y nuestro equipo resaltado.
- Mi Club: pestaña "Fase final" solo lectura, únicamente cuando el torneo la tiene activada.
- Los partidos de fase final también se espejan en la Agenda, igual que los de fase regular.

## 3. Escudos bien mostrados

- Se quita el recuadro y el fondo del componente de escudo: fondo transparente, sin marco ni anillo, ajuste "contain" con caja cuadrada fija, centrado. Nunca se corta ni se deforma, sea el escudo alto o ancho.
- Al subir el escudo de un equipo se ofrece el recorte/encuadre con el mismo diálogo de imagen que ya usa la foto de perfil, con opción de dejarlo tal cual (siempre "contain").

## 4. Escudos en la tabla de posiciones

Escudo pequeño (20–24 px) junto al nombre en cada fila de la tabla de posiciones, en Admin y en Mi Club, y también en la tabla de goleo junto al equipo.

## 5. Filtro por equipo

En partidos y goleo, el filtro actual se reemplaza por un selector con: Todos los equipos · Nuestro equipo · y cada uno de los participantes del torneo (con su escudo). Así se pueden ver todos los partidos de un rival concreto.

## 6. Logo del torneo

Subida de un logo por torneo (mismo bucket privado de escudos, con URL firmada), mostrado en la cabecera del torneo en Admin y en Mi Club junto al nombre, tipo, temporada y estado.

## Detalles técnicos

- Migración: `tournaments.format` ('sin_grupos' | 'grupos'), `groups_count`, `logo_path`, `has_playoffs`, `playoff_start_round`, `playoff_two_legs`; `tournament_teams.group_label`; nueva tabla `tournament_playoff_ties` (ronda, orden, equipos, partidos ida/vuelta, ganador) con GRANTs y RLS con las mismas funciones `can_view_module` / `can_edit_module`; `tournament_matches` gana `tie_id` y `leg` para ligar partidos de bracket. Trigger que propaga el ganador a la llave siguiente.
- `src/lib/torneo.ts`: `buildStandings` acepta filtro de grupo (sin cambiar su comportamiento actual), y nuevas utilidades de bracket (estructura de rondas, resolución de ganador con global e ida y vuelta).
- Nuevos componentes: `BracketView` (compartido lectura/edición), `PlayoffTieDialog`, `GroupStandings`, `TeamFilterSelect`; cambios en `TeamCrest`, `StandingsTable`, `ScorersTable`, `MatchList`, `TournamentFormDialog`, `TournamentTeamFormDialog`, `TournamentDetailSheet` y `/m/torneo`.
- Permisos sin cambios: gestión solo en Admin para editores; Mi Club solo lectura. Fechas timestamptz, sheets estándar, iconos sin emojis.

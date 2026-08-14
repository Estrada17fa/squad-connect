# Torneo — Parte 3: vista en Mi Club y conexiones

## 1. Vista Torneo en Mi Club (solo lectura)

Nueva ruta `/m/torneo` (hoy cae en el placeholder genérico `m.$module`), con `PageHeader` + `ModuleTabs`, igual que Plantel/Desarrollo.

- **Selector de torneo**: si el usuario ve varias categorías (lector/editor global), primero un filtro limpio Categoría → Torneo, con el estilo de filtros ya usado en Usuarios/Plantel. Con una sola opción, se selecciona sola sin mostrar ruido.
- **Cabecera del torneo**: nombre, tipo (liga/copa), categoría, estado (en curso / finalizado) con `StatusBadge`, y resumen de nuestro equipo (posición, puntos, PJ).
- **Pestañas** (mismas secciones que Admin, sin ninguna acción de edición):
  - **Partidos**: bloque "Próximos" destacado arriba (tarjetas grandes con escudos, fecha/hora, sede) y luego el calendario agrupado por jornada. Nuestro equipo resaltado con acento verde; marcador y penales cuando ya se jugó.
  - **Posiciones**: tabla completa (PJ, PG, PE, PP, GF, GC, Dif, Pts), fila de nuestro equipo resaltada, escudos y numeración de posición. Se reutiliza `buildStandings` de la Parte 2.
  - **Goleo**: lista ordenada con foto/avatar, dorsal y equipo.
- Se reutilizan los componentes de presentación de la Parte 2 (`MatchCard`, tabla de posiciones, goleo) extrayendo la parte visual a componentes compartidos en `src/components/torneo/`, con `canEdit=false`. Admin queda igual.
- Para editores, un botón discreto "Gestionar en Admin" que lleva a `/admin/torneo`.

### Permisos (module_key `torneo`, ámbito categoría)
Se usan las funciones ya migradas (`can_view_module`, `can_edit_module`, `has_team_scope`) y el hook `useTeamAccess`; el RLS ya filtra las filas:
- Sin acceso: el módulo no aparece.
- Vista jugador y lector categoría: solo el/los torneos de su categoría, lectura.
- Lector global: torneos de todas las categorías, lectura.
- Editor categoría/global: misma vista de lectura + acceso a Admin.

## 2. Conexión con Desarrollo — recomendación

**Recomendación (1): no duplicar filas.** En vez de escribir filas `source = 'torneo'` con triggers (que se desincronizan al corregir un marcador o borrar un gol), se crea una **vista derivada en la base de datos** que agrega los goles ya capturados por jugador y torneo. Siempre refleja lo capturado, sin trabajo de mantenimiento y sin riesgo de duplicados.

En la ficha de Desarrollo del jugador, dos bloques claramente separados:
- **Competencia oficial (automático)** — datos del torneo, no editables, con el nombre del torneo y su temporada.
- **Histórico manual** — las filas que ya existen en `player_competition_stats` (source `manual`), marcadas como respaldo/histórico. Se siguen pudiendo capturar para temporadas anteriores o competencias que no se llevan en Squad.

Así nunca hay dos cifras compitiendo por el mismo torneo: lo que está en Squad es automático, lo que no está es manual.

**Recomendación (2): alcance.** Sin alineaciones no existe "partidos jugados" real; contar solo los partidos en los que anotó daría un dato falso. Propuesta:
- **Ahora**: goles por torneo + partidos en los que anotó (etiquetado tal cual, sin fingir "PJ") + desglose por partido.
- **Después (opcional, no en esta parte)**: tabla de alineaciones por partido (titular/suplente + minutos) para obtener PJ, titularidades y minutos reales. Es una captura extra por partido y conviene decidirla aparte.

## 3. Conexión con Agenda (partidos en el calendario)

- Migración: columna `match_id` en `calendar_events` + trigger `sync_match_to_calendar` (mismo patrón que juntas y citas médicas): al crear/editar/borrar un partido se crea, actualiza o elimina su evento espejo tipo `partido`, en la categoría del torneo, con hora en timestamptz, sede (`location_id` o texto) y, si ya se jugó, el marcador en el título/descripción.
- El detalle de evento ya existente muestra el partido con los dos equipos, sede con mapa, hora y marcador; queda ligado al torneo.
- **Convocatoria**: se aprovecha `event_attendees` del evento espejo — desde el partido en Admin se marcan convocados y quedan visibles en la Agenda del equipo. Es barato porque no requiere tabla nueva.

## Detalles técnicos

- Migración: `calendar_events.match_id` (FK a `tournament_matches`, on delete cascade), trigger de sincronización, y vista `player_tournament_stats` (goles y partidos con gol por jugador/torneo) con sus GRANTs y filtro por las funciones de permiso existentes.
- Nuevos: `src/routes/_authenticated/m.torneo.tsx`, `src/components/torneo/*` (tarjeta de partido, tabla de posiciones y goleo compartidos), `src/hooks/usePlayerTournamentStats.ts`.
- Editados: `TournamentDetailSheet` / `MatchResultSheet` (reutilizar componentes compartidos y convocatoria), ficha de Desarrollo del jugador (bloque automático + histórico manual), y la lógica de partidos para que la sincronización quede cubierta.
- Sin emojis, sheets estándar, fechas timestamptz, 6 niveles de permiso respetados.

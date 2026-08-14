# Torneo — Parte 2: partidos, resultados, tabla y goleo (captura en Admin)

Todo vive dentro de la ficha del torneo en `/admin/torneo` (la que ya existe de la Parte 1), organizada en pestañas: **Equipos** (ya hecha), **Partidos**, **Posiciones**, **Goleo**. Solo editores del módulo `torneo` (Editor Categoría en su categoría, Editor Global en todas) capturan; la vista de Mi Club es la Parte 3.

## 1. Calendario de partidos

La tabla `tournament_matches` ya existe de la Parte 1 (jornada, local, visitante, fecha/hora en timestamptz, ubicación, marcador, estado, ganador de penales). Esta parte la usa por primera vez.

- Lista agrupada por jornada, ordenada por jornada y fecha. Cada partido es una tarjeta escaneable: escudos y nombres de los dos equipos, marcador cuando está jugado, fecha/hora, sede y estado (programado / jugado / suspendido).
- Alta partido por partido, y alta de **jornada completa**: se elige el número de jornada y se arman varios enfrentamientos en un mismo formulario (filas local vs visitante, con fecha/hora y sede opcionales por fila) antes de guardar todo junto.
- Equipos local y visitante se eligen entre los participantes registrados del torneo; no se puede enfrentar a un equipo consigo mismo.
- Sede opcional con el mismo `LocationPicker` con mapa que usan Agenda y Viajes.
- Editar y eliminar partido desde su ficha, con confirmación.
- Fechas siempre timestamptz; se muestran en la zona local.

## 2. Resultados con captura inteligente

En la ficha del partido, "Registrar resultado":

- Marcador local y visitante; al guardar el partido pasa a estado "jugado".
- Si el torneo tiene activa la regla de penales **y** el marcador es empate con goles suficientes (empate de M o más goles, según el torneo), aparece automáticamente el campo **ganador de la tanda de penales** (local / visitante) y es obligatorio. Si la regla no aplica al marcador, el campo ni se pide y se limpia si existía.
- El cálculo de puntos aplica **todas** las reglas activas del torneo, en este orden:
  1. Puntos base: victoria / empate / derrota.
  2. Bonus de visita: si el visitante gana por una diferencia mayor o igual a la configurada, suma los puntos extra.
  3. Penales: en el empate que dispara la tanda, el ganador suma los puntos extra configurados.
- El partido muestra el desglose en texto, por ejemplo "Visitante 4 pts (3 por victoria + 1 por bonus de visita)" y "Local 0 pts", o "Local 2 pts (1 por empate + 1 por penales) · Visitante 1 pt".
- El cálculo es una función pura reutilizable, así la Parte 3 muestra exactamente lo mismo sin duplicar reglas.

## 3. Tabla de posiciones

- Se calcula al vuelo desde los partidos jugados: JJ, G, E, P, GF, GC, DIF y puntos con las reglas del torneo (base + bonus + penales).
- El orden respeta los criterios de desempate configurados en la Parte 1, en su orden exacto: primero puntos, luego la lista (diferencia, goles a favor, goles en contra, enfrentamientos directos, partidos ganados, goles de visitante, sorteo). Los enfrentamientos directos se resuelven comparando solo los partidos entre los equipos empatados.
- **Ajuste manual**: por equipo se puede sumar o restar puntos con una nota de motivo (por ejemplo sanción de -3). El ajuste se aplica sobre el cálculo automático y la fila marca visualmente que tiene ajuste, con el motivo consultable.
- Nuestro equipo aparece resaltado en la tabla.
- Tabla escaneable, con scroll horizontal en móvil y las columnas clave siempre visibles.

## 4. Goleo

- Al capturar un resultado se registran los goleadores del partido:
  - Para **nuestro equipo**: se elige al jugador con el `PlayerPicker` (categoría + buscador) del plantel de esa categoría y el número de goles.
  - Para equipos rivales: nombre del goleador en texto libre (opcional) o solo el total, sin obligar a detallar.
- Los goles se guardan ligados a partido, equipo del torneo y, cuando es nuestro, al jugador — que es justo lo que la Parte 3 necesita para derivar goles/partidos por jugador hacia Desarrollo.
- Tabla de goleo del torneo: foto del jugador, nombre, equipo y goles totales, de mayor a menor. Aviso cuando la suma de goleadores no cuadra con el marcador capturado, sin bloquear el guardado.

## Permisos

- Todo lo anterior (crear partidos, capturar resultados, goleo, ajustes) requiere ser editor de `torneo` en la categoría del torneo. Editor Global en cualquier categoría del club. Aislamiento por club en todas las reglas de acceso.
- Los lectores no ven botones de captura; la lectura pública del torneo llega en la Parte 3.

## Detalles técnicos

- **Base de datos** (una sola migración, con GRANT y RLS por `can_view_module` / `can_edit_module` sobre la categoría del torneo, igual que la Parte 1):
  - `tournament_match_goals`: partido, torneo, club, equipo del torneo, `player_user_id` (nulo para rivales), `player_name` (texto libre para rivales), `goals` (por defecto 1), notas, timestamps.
  - `tournament_point_adjustments`: torneo, equipo del torneo, club, `points` (entero, puede ser negativo), `reason`, autor y timestamps.
  - Realtime en partidos, goles y ajustes.
  - `tournament_matches` no cambia de estructura; se usan las columnas ya creadas.
- **Lógica pura** en `src/lib/torneo.ts`: `matchPoints(config, match)` con el desglose por equipo, `needsShootout(config, home, away)` para la captura inteligente, y `buildStandings(config, teams, matches, adjustments)` que arma la tabla y la ordena por los criterios configurados (incluye el desempate por enfrentamientos directos).
- **Hooks** en `src/hooks/useTournamentMatches.ts`: partidos por torneo (con equipos y sede), alta individual y por jornada, guardado de resultado + goleadores en una sola operación, ajustes y goleo agregado.
- **Interfaz**: la ficha del torneo pasa a tener pestañas; nuevos componentes `MatchList` / `MatchCard`, `MatchFormDialog`, `MatchdayFormDialog`, `MatchResultSheet` (marcador + penales condicionales + goleadores), `StandingsTable` con `PointAdjustmentDialog`, y `ScorersTable`. Sheets estándar (abrir = ver, editar = acción deliberada), iconos, sin emojis, filtros limpios por jornada y estado.
- El módulo sigue siendo de ámbito categoría (`torneo`), sin tocar Agenda ni Desarrollo todavía: la sincronización de partidos con el calendario y las estadísticas a Desarrollo son de la Parte 3 (por eso `calendar_event_id` queda sin usar en esta parte).

## Verificación antes de cerrar

1. Liga Premier: visitante gana 3-1 → visitante 4 pts, local 0. Empate 2-2 con penales → ganador 2, perdedor 1. Empate 1-1 → 1 y 1, sin pedir penales.
2. Preset Estándar: mismos marcadores sin bonus ni penales → 3/0 y 1/1.
3. Tabla ordenada correctamente con dos equipos empatados en puntos, comprobando diferencia, goles a favor y enfrentamientos directos.
4. Ajuste de -3 puntos: la fila baja de lugar y muestra la marca de ajuste con su motivo.
5. Goleo: goles de nuestro jugador se acumulan entre partidos y la tabla ordena de mayor a menor.
6. Un editor de la categoría A no puede capturar en un torneo de la categoría B.

# Gestión de Partidos (en Coordinación)

Nueva pestaña "Partidos" dentro de Coordinación: el cuerpo técnico convoca, organiza la logística y escribe notas de NUESTROS partidos, sin entrar a Admin/Torneo.

## Confirmaciones

- **Lee del torneo, no duplica.** No se crea ninguna tabla de partidos. La lista sale de los partidos ya capturados en Admin/Torneo (`tournament_matches`) donde participa un equipo marcado como "nuestro equipo". Rival, escudo, sede, fecha/hora, jornada, torneo, estado y resultado se leen de ahí; aquí no se editan.
- **Una sola convocatoria.** La convocatoria se guarda ligada al mismo partido del torneo, y es exactamente la que se muestra (solo lectura) en Torneo / Mi Club. No hay dos listas.
- **module_key nuevo `partidos`**, tipo categoría, con las 6 vistas descritas. Torneo conserva su propio permiso.

## Qué se ve

**Lista de nuestros partidos** (ordenada por fecha):
- Próximo partido destacado arriba, con "en X días" / "hoy" / "mañana".
- Secciones: Próximos y Jugados.
- Tarjeta escaneable: escudo y nombre del rival, indicador Local/Visitante, fecha y hora, sede, jornada y torneo, badge de estado (Programado / Jugado con marcador / Suspendido) y número de convocados.
- Filtros limpios: categoría (equipo), torneo y estado.

**Ficha del partido** (sheet estándar, secciones):
1. *Información del partido* — solo lectura, leída del torneo (rival, local/visitante, torneo y jornada, fecha/hora, sede con mapa si tiene ubicación, resultado si ya se jugó).
2. *Convocatoria* — cuántos y quiénes, con avatares. Botón "Convocar" para el editor: por defecto todo el plantel de esa categoría, con opción de personalizar (mismo patrón y selector de jugadores ya usado en eventos y viajes).
3. *Logística* — hora de citación, punto de reunión (selector de ubicación con mapa, el mismo componente), uniforme (opcional) y notas de logística.
4. *Notas post-partido* — disponibles cuando el partido ya se jugó; el resultado sigue viniendo del torneo.

Botón Editar/gestionar solo visible si el usuario es editor de esa categoría. Sin emojis, solo iconos; fechas consistentes con el resto de la app.

## Permisos (`partidos`, por categoría)

- Sin acceso: no ve la pestaña.
- Vista jugador: ve solo los partidos de su categoría donde ÉL está convocado, con citación, punto de reunión y uniforme. Solo lectura.
- Lector de categoría: ve partidos, convocatoria y logística de sus categorías; no gestiona.
- Lector global: igual, en todas las categorías.
- Editor de categoría: convoca, edita logística y escribe notas en su categoría.
- Editor global: lo mismo en todas las categorías.

## Notificaciones

Reutiliza el sistema existente (sin push nuevo):
- Al convocar: "Fuiste convocado al partido vs [rival]" con la fecha, a cada convocado nuevo.
- Si cambia la hora de citación o el punto de reunión: aviso a los convocados actuales.
- Nunca se notifica a quien hizo el cambio; al tocar la notificación se abre la ficha del partido.

## En Torneo / Mi Club

En el detalle de uno de nuestros partidos se añade el bloque "Convocados" en solo lectura, con la misma lista. Si quien mira es jugador y está convocado, se resalta. Ahí nadie edita.

## Agenda (queda ligado, no se construye ahora)

Los partidos ya se espejan a la Agenda. La convocatoria y la logística quedan ligadas al mismo partido, de modo que la futura vista de Agenda/Inicio pueda mostrarle al jugador su convocatoria y la info operativa sin cambios de datos.

## Notas técnicas

- Migración con tres piezas nuevas, todas con `match_id` → `tournament_matches(id)` on delete cascade y `club_id`:
  - `match_logistics` (1 por partido): `call_time_at timestamptz`, `meeting_location_id`, `meeting_point text`, `kit text`, `logistics_notes text`, `post_match_notes text`, timestamps + trigger `set_updated_at`.
  - `match_callups`: `match_id`, `user_id`, `player_profile_id` opcional, único por partido+usuario.
  - Tipo de notificación: `partido_convocatoria`, `partido_logistica`.
- GRANTs a `authenticated` (select/insert/update/delete) y `service_role`, luego RLS.
- RLS por categoría: se resuelve el `team_id` del partido vía `tournaments.team_id` con una función `SECURITY DEFINER` `match_team_id(uuid)`; lectura con `can_view_module(auth.uid(),'partidos', match_team_id(match_id))` más la restricción de vista jugador (`effective_permission = 'vista_jugador'` ⇒ solo filas de partidos donde el usuario está en `match_callups`), escritura con `can_edit_module(...)`.
- Lectura desde Torneo/Mi Club: los convocados se leen con el permiso de `partidos` o de `torneo` sobre esa categoría (política de solo lectura adicional), para que quien ve el partido vea la convocatoria.
- Triggers `AFTER INSERT` en `match_callups` y `AFTER UPDATE` en `match_logistics` (cuando cambia `call_time_at`, `meeting_location_id` o `meeting_point`) que llaman a `notify_users`, `SECURITY DEFINER` con `search_path` fijo, excluyendo al actor.
- Frontend: `src/hooks/useMatchManagement.ts` (lista de nuestros partidos, convocatoria, logística, realtime) y `src/components/partidos/` (`MatchCard.tsx`, `MatchManageSheet.tsx`, `CallupDialog.tsx`, `MatchLogisticsForm.tsx`, `PartidosFilters.tsx`), montados como pestaña en `src/routes/_authenticated/m.coordinacion_interna.tsx`.
- `src/lib/modules.ts`: nueva clave `partidos` (scope `team`, `playerView: "mine"`), disponible en la matriz de permisos de Admin/Usuarios.
- Reutiliza `TeamCrest`, `PlayerPicker`/patrón de convocatoria, `EntitySheet`/`DetailSheet`, `StatusBadge` y el selector de ubicación existente.

# Tres correcciones: agenda de partidos, filtros de Torneo y convocatoria

## 1. Agenda muestra partidos ajenos — diagnóstico

Confirmado en la base de datos. El trigger `trg_sync_match_to_calendar` sobre `tournament_matches` se dispara para **todos** los partidos del torneo y crea un evento de calendario sin comprobar si alguno de los dos equipos está marcado como "nuestro equipo". Hoy hay 4 partidos con evento de calendario y **3 de ellos son partidos ajenos** (rival vs rival).

Corrección:

- Reescribir la función del trigger para que, antes de crear o actualizar el evento, verifique que `home_team_id` o `away_team_id` pertenece a un equipo con `is_our_team = true`.
- Si el partido deja de ser nuestro (por ejemplo al cambiar un equipo) y ya tenía evento, el evento se elimina y `calendar_event_id` queda vacío.
- Limpieza única: borrar los eventos de calendario de partidos ajenos ya creados y limpiar su `calendar_event_id`.
- Lo demás no cambia: nuestros partidos siguen espejándose con su título, sede, horario, convocatoria y logística intactos.

## 2. Filtros de Torneo — diagnóstico

Revisado `TournamentMatchesView`. Tres fallos reales:

1. **Partidos duplicados**: el bloque "Próximos partidos" toma sus 3 partidos de la misma lista que después se pinta por jornadas, así que cada próximo partido aparece dos veces en pantalla (arriba y dentro de su "Jornada N").
2. **"Próximos partidos" no respeta el filtro de jornada**: al elegir una jornada concreta sigue mostrándose el bloque destacado, lo que hace parecer que hay partidos de otras jornadas.
3. **Jornadas fantasma**: el desplegable de jornadas se calcula sobre todos los partidos, ignorando el filtro de equipo. Al filtrar por un equipo se pueden elegir jornadas en las que ese equipo no juega y la vista queda vacía.

Además, el torneo por grupos no ofrece filtro de grupo en esta vista, por lo que se mezclan partidos de todos los grupos.

Corrección:

- "Próximos partidos" solo se muestra cuando no hay filtro de jornada activo, y sus partidos se excluyen de los grupos de jornada para que no se dupliquen.
- Las jornadas del desplegable se recalculan según el filtro de equipo (y de grupo) activo; si la jornada seleccionada deja de existir, se vuelve a "Todas".
- Se añade filtro de grupo cuando el torneo es por grupos, filtrando por el `group_label` de los equipos del partido.
- Se ocultan las secciones vacías y se muestra un estado vacío amable cuando la combinación de filtros no da resultados.

## 3. Convocatoria: vacía por defecto

Confirmado el cambio: por defecto **nadie seleccionado**, con botones "Seleccionar todos" y "Quitar todos".

- `CallupPicker` (partidos) y `AttendeePicker` (eventos, entrenamientos, viajes) dejan de arrancar en modo automático "todo el equipo". Se elimina el modo `auto` con autoselección y se muestra siempre la lista con buscador y casillas, arrancando vacía en creación.
- Se conservan las acciones "Todos" (respeta la búsqueda activa) y "Quitar".
- Al editar, se cargan los convocados guardados tal cual; nunca se autocompleta.
- Al cambiar de categoría se limpia la selección (los miembros del equipo anterior ya no aplican).
- Permisos: no se toca la lógica existente. El selector de convocatoria del partido sigue apareciendo solo donde ya se comprueba permiso de edición de Partidos de esa categoría, y las notificaciones de convocatoria siguen igual (solo a los convocados, nunca a quien convoca).

Recomendación: entrenamientos es el único caso donde suele ir el equipo completo; aun así se deja vacío por defecto como pediste, y basta un toque en "Todos". Si prefieres que entrenamientos siga automático, dímelo y lo dejo como excepción.

## Detalles técnicos

- Migración: reemplazo de `public.sync_match_to_calendar()` con la condición `is_our_team`, borrado de eventos huérfanos de partidos ajenos y limpieza de `calendar_event_id`.
- Frontend: `src/components/torneo/TournamentMatchesView.tsx` (filtros, deduplicación, filtro de grupo), `src/components/partidos/CallupPicker.tsx` y `src/components/calendar/AttendeePicker.tsx` (sin modo automático), y ajuste en los formularios que les pasan `mode`: `MatchOpsSheet.tsx`, `EventFormDialog.tsx`, `SessionFormDialog.tsx`, `TripFormDialog.tsx`.

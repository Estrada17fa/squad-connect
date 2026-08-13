# Rehacer módulo DESARROLLO (Mi Club)

Módulo personal, gestionado por el cuerpo técnico, hermano de Salud: misma estructura de dos entradas (Mi Desarrollo para el jugador, Panel de categoría para el cuerpo técnico) y las mismas sheets estándar de Usuarios/Salud.

## Base de datos

Lo que ya existe y se reutiliza tal cual: `development_assessments` + `assessment_scores`, `development_goals`, `development_feedback`, y las rutinas de Entrenamientos (`training_routines`, `routine_exercises`, `routine_assignments`). No se duplica nada de rutinas.

Cambios nuevos:

1. **Notas internas** — `development_feedback` gana `visible_to_player boolean not null default true`. Las notas existentes quedan visibles (no cambia lo ya capturado).
2. **Métricas físicas** — nueva tabla `development_measurements`: club, categoría, jugador, fecha, tipo de medición (peso, estatura, % grasa, u otra escrita por el club), valor, unidad, notas. Simple y opcional, con historial para graficar.
3. **Estadísticas de competencia** — tabla propia `player_competition_stats`, separada de las evaluaciones y pensada para que el futuro módulo Torneo la alimente sin rehacerla: club, categoría, jugador, nombre de temporada/torneo, fechas del periodo, partidos jugados, titularidades, minutos, goles, asistencias, tarjetas amarillas y rojas, más `source` (`manual` | `torneo`) y un `tournament_id` nullable sin llave foránea todavía. Único por jugador + temporada + origen. Hoy sólo se escribe a mano desde Desarrollo; mañana Torneo inserta con `source='torneo'` y la UI las muestra igual.

Todas con GRANT a `authenticated` y `service_role`, índices por club/categoría/jugador y trigger `set_updated_at`.

## Privacidad de las notas internas (RLS)

Hoy la lectura de las tres tablas usa `can_view_own_row(uid, 'desarrollo', player_user_id, team_id)`, que devuelve verdadero tanto para el cuerpo técnico como para el jugador dueño. Eso no distingue notas internas.

Se añade una función `security definer` `public.development_sees_all(_user_id, _team_id)`: verdadera sólo cuando el nivel efectivo de `desarrollo` en esa categoría es lector o superior (es decir, NO `vista_jugador`). Con ella se reescribe la política de lectura de `development_feedback`:

```
development_sees_all(auth.uid(), team_id)
OR (player_user_id = auth.uid() AND visible_to_player)
```

Resultado: un usuario en Vista Jugador nunca recibe de la base una nota marcada como interna, ni siquiera siendo el dueño. El filtro vive en Postgres, no en el frontend. Las demás tablas (evaluaciones, objetivos, mediciones, estadísticas) conservan `can_view_own_row`, y las nuevas la adoptan; la escritura sigue siendo sólo `can_edit_module(uid,'desarrollo',team_id)`.

## Niveles

- Sin acceso: no ve el módulo (el médico entra aquí).
- Vista Jugador: sólo su desarrollo, sólo lectura, sin notas internas. Única excepción de escritura: marcar el avance de sus propias rutinas asignadas.
- Lector Categoría / Global: ve el desarrollo de su categoría / de todo el club, sin editar, con todas las notas.
- Editor Categoría / Global: gestiona todo lo de su alcance.

En frontend se resuelve con `useTeamAccess("desarrollo")` (`canReadTeam`, `canEditTeam`, `onlyOwnRows`), igual que Salud.

## Vistas

**Mi Desarrollo (jugador).** Entra directo a su ficha, sin lista: gráfica de evolución por habilidad, sus objetivos con estado, la retroalimentación visible para él, su rutina asignada con avance marcable, sus mediciones y sus estadísticas de competencia en tarjetas de números destacados.

**Panel (cuerpo técnico).** Lista de jugadores de las categorías que puede ver, con foto, dorsal, puesto, último promedio de evaluación, objetivos activos y una barra/indicador de progreso. Filtros limpios estilo Usuarios/Plantel (categoría, búsqueda, estado de objetivos). Al tocar un jugador se abre su ficha.

**Ficha individual (sheet estándar).** Cabecera con avatar grande, nombre, categoría y badges (promedio actual, objetivos activos). Secciones con encabezado en mayúsculas + icono y mini-tarjetas: Evaluaciones (radar de la última + líneas de evolución), Objetivos, Retroalimentación (las internas con badge "Interna" y color distinto, sólo para el cuerpo técnico), Rutina, Mediciones, Estadísticas. Abre siempre en lectura; el botón Editar/registrar aparece sólo con permiso de edición. Sin emojis, fechas con el formato del proyecto.

Los formularios (evaluación, objetivo, nota, asignar rutina, medición, estadísticas) usan el `PlayerPicker` reutilizable (categoría → buscador → jugador). El formulario de nota lleva el interruptor "Visible para el jugador", activado por defecto, con texto que explica la consecuencia.

## Detalles técnicos

- Migración: columna `visible_to_player`, tablas `development_measurements` y `player_competition_stats` con grants/RLS/índices, función `development_sees_all` y reemplazo de la política de lectura de `development_feedback`.
- `src/hooks/useDevelopment.ts`: nuevos queries y mutaciones para mediciones y estadísticas, y soporte de `visible_to_player`.
- `src/lib/desarrollo.ts` (nuevo, espejo de `src/lib/salud.ts`): etiquetas de estados de objetivo, atributos de evaluación por defecto, tipos de medición y campos de estadísticas.
- `src/components/desarrollo/`: `DevelopmentPieces.tsx` (cabecera, mini-tarjeta, vacío, al estilo de `HealthPieces.tsx`), `PlayerDevelopmentSheet.tsx` reescrita con el estándar de Salud, `DesarrolloFilters.tsx`, `MeasurementFormDialog.tsx`, `StatsFormDialog.tsx`, y ajustes a los diálogos existentes.
- `src/routes/_authenticated/m.desarrollo.tsx`: reestructurada en las dos entradas y con el flujo lectura-primero.
- Enganche del panel del jugador en `mi-perfil.tsx` y en su ficha de Plantel, en solo lectura.

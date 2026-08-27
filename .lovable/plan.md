# Orden manual de categorías y categoría principal

## Paso 1 — Diagnóstico: dónde se listan/ordenan las categorías hoy

Fuente central: `useAccess.ts` construye `teamOptions` (lo que consume casi toda la app vía `useApp()`).

| Lugar | Cómo se ordena hoy |
| --- | --- |
| `src/hooks/useAccess.ts` (teamOptions del usuario) | Consulta a `teams` con `.order("name")` y después `sort(a.name.localeCompare(b.name))` — alfabético |
| `src/components/squad/TeamFilter.tsx` (chips en Agenda, Mes, Viajes, Agenda-Viajes, Partidos) | Orden de `teamOptions` (alfabético). Default siempre "Todos" |
| `src/components/squad/TeamSelectField.tsx` / `useEditableTeams.ts` (formularios: Viajes, Eventos, Sesiones, Ejercicios, Comunicados, Documentos, Tareas, Juntas, Solicitudes, Multimedia, Rutinas) | Orden heredado de `teamOptions` (alfabético) |
| `m.plantel.tsx` | Reordena por su cuenta: `a.name.localeCompare(b.name)` y "Todo el club" al final |
| Filtros por categoría: `ComunicadosFilters`, `DocumentsFilters`, `CoordFilters`, `DesarrolloFilters`, `EntrenamientosFilters`, `SaludFilters`, `NutricionFilters`, `RequestFilters` | Reciben la lista ya ordenada alfabéticamente desde cada ruta |
| `useHealth.ts`, `useDevelopment.ts`, `useNutrition.ts`, `useInventory.ts` (consultas propias a `teams`) | `.order("name")` |
| `src/components/usuarios/MembersTab.tsx` (asignar membresías) | `.order("name")` |
| `src/components/admin/CategoriesTab.tsx` (Admin/Configuración) | `.order("name")` |
| `src/routes/_authenticated/admin.clubs.tsx` | `.order("name")` |
| `useRoster.ts` | Sin orden explícito (orden de la base) |
| Torneo (`m.torneo.tsx`, `useTournaments.ts`) | Los "equipos" ahí son equipos del torneo (`tournament_teams`), no categorías del club; el selector inicial de torneo es `null`. No aplica orden de categorías, salvo el filtro de categoría del club donde lo haya |

Defaults hoy: ningún selector arranca en una categoría concreta — `TeamFilter` empieza en "Todos" y los formularios sin selección.

## Paso 2 — Qué se construye

### Base de datos
- Migración sobre `teams`: `display_order` (entero) y `is_primary` (booleano), con índice único parcial para que solo exista UNA principal por club.
- Relleno inicial: se numera el orden actual (alfabético) por club y se marca como principal la primera de cada club que aún no tenga una.
- Sin cambios de permisos ni RLS.

### Admin / Configuración > Categorías
- Modo "Ordenar": lista arrastrable (drag-and-drop) que guarda el nuevo orden; mismo diseño de tarjetas actual.
- Acción para marcar una categoría como principal (se desmarca la anterior automáticamente); insignia "Principal" en su tarjeta.
- La principal se muestra siempre arriba del listado.

### Aplicación del orden en toda la app
- El orden explícito se resuelve una sola vez en `useAccess.ts` (principal primero, luego `display_order`, luego nombre como desempate) y se propaga a todos los lugares que consumen `teamOptions`: chips de categoría, formularios y filtros.
- Se sustituye el `.order("name")` por el orden explícito en las consultas propias de `useHealth`, `useDevelopment`, `useNutrition`, `useInventory`, `MembersTab`, `CategoriesTab`, `admin.clubs` y `useRoster`.
- Se quita el sort alfabético propio de `m.plantel.tsx` para que respete el orden del club ("Todo el club" sigue al final).

### Default = categoría principal
- Los chips de categoría (`TeamFilter`) y los selectores de formulario arrancan en la categoría principal cuando el usuario tiene acceso a ella; si no, en la primera de su orden. La opción "Todos" sigue disponible, solo deja de ser el valor inicial.
- Si un club no tiene principal marcada, se usa la primera del orden.

## Detalles técnicos
- Migración: `ALTER TABLE public.teams ADD COLUMN display_order integer NOT NULL DEFAULT 0, ADD COLUMN is_primary boolean NOT NULL DEFAULT false` + `CREATE UNIQUE INDEX ... ON public.teams (club_id) WHERE is_primary` + backfill por `row_number()` alfabético.
- Guardado del orden: actualización por lote de `display_order` desde `CategoriesTab`; marcar principal = limpiar la anterior del club y marcar la nueva.
- Drag-and-drop con `@dnd-kit/core` + `@dnd-kit/sortable` (instalación nueva) manteniendo el look actual de tarjetas.
- Comparador compartido en `src/lib/permissions.ts` o util nueva `sortTeams()` reutilizada por hooks y rutas.
- `TeamOption` gana `displayOrder` e `isPrimary`; `useApp()` expone `primaryTeamId` para que las páginas inicialicen su filtro sin duplicar lógica.

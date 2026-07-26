## Objetivo
Eliminar el toggle Grid/Lista de toda la app y dejar siempre la vista de cuadrícula (comportamiento actual por defecto).

## Cambios

1. **`src/routes/_authenticated/m.plantel.tsx`**
   - Quitar imports de `ViewToggle` y `useViewMode`.
   - Eliminar `viewMode`/`setViewMode` y la prop `action` con `<ViewToggle />` en `PageHeader`.
   - Reemplazar el render condicional grid/list por solo el layout grid actual (tarjetas `glass`), removiendo la rama de lista.
   - `CardGridSkeleton` sin `variant` (grid por defecto).

2. **`src/routes/_authenticated/m.coordinacion_interna.tsx`**
   - Quitar imports de `ViewToggle` y `useViewMode`.
   - Eliminar `viewMode` del estado, del `PageHeader`, y de las props de `TasksTab`, `MeetingsTab` y `Section`.
   - Dejar el layout grid fijo (`grid grid-cols-1 gap-3 sm:grid-cols-2`) en ambos tabs.
   - `CardGridSkeleton` sin `variant`.

3. **Borrar archivos ya no usados**
   - `src/components/squad/ViewToggle.tsx`
   - `src/hooks/useViewMode.ts`

## Fuera de alcance
- No se toca `CardGridSkeleton` (mantiene su prop `variant` opcional por si se reusa; simplemente ya no se pasa).
- No se cambian estilos de tarjetas ni filtros.

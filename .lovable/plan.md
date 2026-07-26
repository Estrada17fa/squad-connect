## Objetivo
Todos los botones de crear/subir en los módulos siguen el patrón del botón "Nuevo rol" de Usuarios (ancho completo, ubicado debajo del pill/tabs), pero en verde neón (primary) como "Agregar tarea" — no gris (`variant="secondary"`).

## Patrón unificado
```tsx
<Button onClick={...} className="w-full glow-primary">
  <Plus className="mr-2 h-4 w-4" /> {label}
</Button>
```
- Sin `variant="secondary"` (queda en el default = verde primary).
- `w-full` para ancho completo.
- `glow-primary` para el glow verde consistente.
- Se coloca **debajo** de `ModuleTabs` / `TabsList` (pill), no en el `action` del `PageHeader`.

## Cambios por archivo

1. **`src/routes/_authenticated/m.coordinacion_interna.tsx`**
   - Quitar la prop `action` del `PageHeader` (el que dispara "Nueva tarea/Nueva junta").
   - Dentro de cada `TabsContent` (tareas y juntas), justo después de abrir el contenido y antes de `FilterChips`, agregar el botón full-width verde:
     - Tab tareas: "Nueva tarea".
     - Tab juntas: "Nueva junta".
   - Los botones internos que ya existen en `EmptyState` se mantienen como están (son CTA de vacío, no el principal).

2. **`src/routes/_authenticated/m.calendario.tsx`**
   - Sacar el `<Button>` "Nuevo evento" del `action` del `PageHeader`.
   - Colocarlo debajo de `TabsList` como botón `w-full glow-primary`.
   - Mantener el `<select>` de categoría junto al botón: fila con `select` a la izquierda y botón que ocupa el resto (`flex gap-2` + `flex-1` en el botón) para conservar la selección de equipo cuando `viewsAllClub`.

3. **`src/routes/_authenticated/m.documentos.tsx`**
   - Quitar el botón "Subir documento" de la fila del buscador.
   - Reubicarlo debajo de los chips de categoría (que son el "pill" de este módulo) como `w-full glow-primary`.
   - El input de búsqueda queda solo en su fila (ancho completo natural).
   - El botón dentro del `EmptyState` se mantiene.

4. **`src/components/usuarios/CategoriesTab.tsx`**
   - Cambiar el botón "Nueva categoría": quitar `variant="secondary"` y el wrapper `flex justify-end`; dejarlo `w-full glow-primary` arriba del grid de categorías.

5. **`src/routes/_authenticated/m.usuarios.tsx`** (tab Roles)
   - Ajustar "Nuevo rol": quitar `variant="secondary"` y añadir `glow-primary` (ya es `w-full`), para que quede verde como el resto.

## Fuera de alcance
- No se toca la lógica de permisos ni los formularios/sheets.
- No se cambian los CTAs internos de los `EmptyState`.
- Home / FAB no se modifican.

# Configuración del club: pestañas solo horizontales y sin título

## Qué cambia

1. **Menú de secciones (Identidad, Ubicaciones, Categorías, Torneo/Liga, Preferencias)**
   - Solo se desliza a los lados; se bloquea cualquier desplazamiento vertical.
   - Se oculta la barra de scroll visible.

2. **Encabezado**
   - Se quita el título "Configuración del club" y el subtítulo "Ajustes y catálogos…". La navegación ya indica dónde estás.

## Detalle técnico

- `src/routes/_authenticated/admin.configuracion.tsx`
  - Quitar el `<PageHeader ... />` (y su import si queda sin uso).
  - En el `TabsList`: reemplazar `overflow-x-auto` por el patrón ya usado en `ModuleTabs`:
    `overflow-x-auto overflow-y-hidden touch-pan-x overscroll-x-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden`,
    con `w-full` y `shrink-0` en cada `TabsTrigger` para que no se compriman.

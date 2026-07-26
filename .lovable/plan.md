
## Objetivo

Cuatro ajustes transversales de UI/UX, sin tocar datos ni lógica de permisos.

---

### 1. Pestañas de módulos: bloquear scroll vertical

**Archivo:** `src/components/squad/ModuleTabs.tsx`

El contenedor `overflow-x-auto` permite un rebote vertical en móvil. Cambiar a `overflow-x-auto overflow-y-hidden` y añadir `touch-action: pan-x` (`touch-pan-x`) para que el gesto vertical propague al scroll de la página en lugar de "mecerse" dentro de la barra. Aplicar el mismo tratamiento al selector de contexto/equipo en el header si comparte patrón (no requerido si no hay reporte).

---

### 2. Navbar: highlight verde más marcado en la página activa

**Archivo:** `src/components/squad/AppLayout.tsx` (`BottomNav` y `DesktopNav`)

Estado actual: activo = `text-primary` + drop-shadow suave en el icono (móvil) / `bg-primary/10 text-primary` (desktop). Se percibe débil.

Cambios:
- **BottomNav (móvil):** ítem activo con "pill" verde: fondo `bg-primary/15`, texto `text-primary`, icono con glow más fuerte, y una barra superior de 2px verde neón (`bg-primary`) sobre el ítem activo, similar a la línea inferior de `ModuleTabs`.
- **DesktopNav:** ítem activo con `bg-primary/15 text-primary` + `ring-1 ring-primary/40` y opcional `shadow-[var(--glow-primary)]` para el efecto neón. Inactivos sin cambio.

Mantener contraste accesible y respetar tokens semánticos (nada de colores hardcoded).

---

### 3. Quitar el título de página

Como la navbar ya indica dónde estamos, retirar el `<PageHeader title="…" />` de las páginas de módulo/hub. Se conserva el `action` (botones tipo "Agregar jugador") y opcionalmente el `subtitle` cuando aporta contexto dinámico (nombre del equipo activo, etc.), colocándolo con un componente ligero (o extendiendo `PageHeader` con una prop `hideTitle`).

**Alcance (páginas afectadas):**
- `src/routes/_authenticated/m.plantel.tsx`
- `src/routes/_authenticated/m.coordinacion_interna.tsx`
- `src/routes/_authenticated/m.usuarios.tsx`
- `src/routes/_authenticated/m.calendario.tsx`
- `src/routes/_authenticated/m.$module.tsx` (placeholder)
- `src/routes/_authenticated/agenda.tsx`
- `src/routes/_authenticated/mi-perfil.tsx`
- `src/routes/_authenticated/admin.clubs.tsx`
- `src/routes/_authenticated/m.plantel.$playerId.tsx` (mantener nombre del jugador, ese sí es contenido, no título de sección)

Enfoque: extender `PageHeader` con `hideTitle?: boolean` para preservar la fila de acciones sin refactor invasivo, o sustituir por un `ActionBar` cuando no queda nada más que un botón a la derecha.

---

### 4. Toggle Lista / Cuadrícula en listados con cards

Nuevo componente `src/components/squad/ViewToggle.tsx`: dos botones (icono `LayoutGrid` / `List`) con estado controlado, estilizados con tokens (`bg-primary/15` cuando activos). Se coloca en la fila de acciones de cada página o justo encima del listado.

Hook auxiliar `src/hooks/useViewMode.ts`:
- Estado `"grid" | "list"`.
- Persistencia por clave en `localStorage` (ej. `squad.view.plantel`) para recordar la preferencia del usuario por listado.
- Default: `grid` (comportamiento actual).

Adaptar cada listado para renderizar dos variantes:
- **Grid:** el layout actual de cards (`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3`).
- **List:** una fila compacta por elemento (`flex items-center gap-3 p-3` con divisores sutiles), mismo contenido esencial (avatar/icono, título, meta, badge, acción).

**Alcance (listados afectados):**
- Plantel: `src/routes/_authenticated/m.plantel.tsx` (miembros).
- Coordinación Interna: `src/routes/_authenticated/m.coordinacion_interna.tsx` (tareas y juntas — un toggle por pestaña interna o compartido).
- Usuarios: `src/components/usuarios/MembersTab.tsx` y `CategoriesTab.tsx` cuando aplique.
- Solicitudes del Jugador: si existe vista de cards en el hub de solicitudes.
- (Calendario/Agenda quedan fuera: ya tienen sus propias vistas Mes/Agenda.)

---

### Detalles técnicos

- Sin cambios en Supabase, RLS, `useAccess`, `rolePages` ni permisos.
- Sin renombrar rutas ni tocar `routeTree.gen.ts`.
- Todo el color pasa por tokens (`--primary`, `--glow-primary`, `bg-primary/15`, `ring-primary/40`). Nada de `bg-green-*` ni hex hardcodeado.
- Verificar con `tsgo` que las páginas siguen compilando después de quitar `title` de `PageHeader`.
- Probar en el viewport 393×852 (móvil actual del usuario) que:
  - Las pestañas ya no se mecen verticalmente.
  - El highlight verde se percibe claramente en la barra inferior.
  - El toggle grid/list persiste tras navegar y volver.

---

### Fuera de alcance

- No se cambian nombres de páginas ni orden de navegación.
- No se toca la lógica de FAB, permisos, ni el header (salvo el ajuste vertical del selector si se detecta el mismo bug).
- No se rediseñan los cards en sí, solo se añade la variante lista.

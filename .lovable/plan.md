## Objetivo
En lugar de una lista plana de módulos, agrupar los permisos por **página fija** (Inicio, Agenda, Mi Club, Coordinación, Admin) tanto en el editor de permisos de un rol como en los overrides por miembro. Cada página tiene un toggle activar/desactivar y solo se muestran los módulos autorizados para la página + base_role.

## Cómo se agrupan
Usar `ROLE_PAGES` de `src/lib/rolePages.ts` (ya existe). El `base_role` del rol seleccionado determina qué módulos aparecen en cada página. Módulos fuera del mapa del base_role se agrupan en una sección "Otros" al final (edge case).

Ejemplo (base_role = admin):
- **Mi Club**: plantel, salud, desarrollo, tácticas, torneo, comunicados, multimedia
- **Coordinación**: coordinacion_interna, solicitudes, inventario, viajes
- **Admin**: usuarios, documentos
- Inicio y Agenda no tienen módulos configurables (Agenda = calendario, se muestra si el rol tiene acceso a `calendario`).

## Comportamiento del toggle de página
- **Activo (derivado)**: la página está activa si ≥1 módulo tiene nivel > `none`.
- **Apagar página**: pone todos sus módulos en `none`.
- **Prender página** (cuando todos estaban en `none`): pone todos sus módulos en `read` por defecto.
- Cada módulo dentro sigue teniendo su Select de nivel (`none/read/editor/approver`). Cambiar un módulo a >none activa la página automáticamente; poner el último en `none` la desactiva.
- Solo se listan los módulos autorizados para esa página según el base_role. Si un módulo está en `none`, sigue visible dentro de la página (para poder subirlo) mientras la página esté activa; con la página apagada se colapsa la sección (solo se ve el toggle y el conteo).

## Cambios por archivo

### 1. `src/routes/_authenticated/m.usuarios.tsx` — `PermissionsMatrix`
- Recibir además `baseRole` del rol seleccionado (leer `roles.base_role`; añadir el campo a la query `rolesQ`).
- Construir `pageGroups` desde `ROLE_PAGES[baseRole]` filtrando módulos que existen en `MODULE_MAP`.
- Renderizar una sección por página con:
  - Header: icono + label de la página + `Switch` (shadcn) + contador "N activos".
  - Cuerpo colapsable: filas por módulo (icono, nombre, Select de nivel) — solo visible si la página está activa.
- Añadir sección "Otros" con módulos accesibles que no encajen en ninguna página del base_role (mantiene UX plana para ese subset).
- Lógica de toggle sobre el estado `draft` (nada cambia en la firma de guardado).

### 2. `src/components/usuarios/MembersTab.tsx` — `OverridesDialog`
- Leer `base_role` del rol de la membresía (añadir a `rolePermsQ` un fetch de `roles.base_role` o incluirlo en `ctx`).
- Reutilizar la misma lógica de agrupación por página.
- Toggle de página aplica setOverride en batch sobre todos los módulos de la página:
  - Apagar → `setOverride(m, 'none')` para todos.
  - Prender → para los que estén en `none` (efectivo), `setOverride(m, 'read')`.
- Botón "Restablecer" por módulo se conserva; añadir "Restablecer página" en el header (borra overrides de todos los módulos de la página).

### 3. `src/lib/rolePages.ts`
- Exportar helper `groupModulesByPage(baseRole, moduleKeys)` que devuelva `Array<{ page: PageDef, modules: ModuleKey[] }>` reutilizable por ambos componentes.

## Componente
- Usar `@/components/ui/switch` (shadcn) para el toggle de página.
- Estilo: header de sección con `glass` sutil, chevron opcional para colapsar cuando esté apagada.

## Fuera de alcance
- No se cambia el esquema de BD.
- No se toca el cálculo efectivo de permisos en `useAccess`.
- Home/Agenda siguen sin ser páginas "configurables" (Agenda depende solo del módulo `calendario`).

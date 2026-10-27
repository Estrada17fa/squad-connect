# Corrección de 5 errores de permisos y navegación

No se toca: escala de 6 niveles, `get_my_access`, `effective_permission`, políticas RLS, filas existentes de `role_permissions` / `user_permission_overrides` (incluidas `tacticas` y `mes`).

## 1) Viajes — Staff ve Coordinación › Viajes
- `src/lib/permissions.ts`: `canManageTripsModule` devuelve true para lector_categoria, lector_global, editor_categoria, editor_global (fuera: sin_acceso, vista_jugador). Comentario actualizado.
- `src/components/squad/AppLayout.tsx`: comentario de la regla de viajes actualizado.
- `src/routes/_authenticated/m.viajes.tsx`: verificar que el filtro de categorías salga de `useTeamAccess("viajes")` (solo categorías legibles); edición sigue con `canEditTeam`.
- `/agenda-viajes` sin cambios.

## 2) Compras y Facturas — pantalla = base de datos
- `m.compras_facturas.tsx`: `canAccess` = superadmin o nivel en lector_categoria/lector_global/editor_categoria/editor_global; `canEdit` = superadmin o editor_categoria/editor_global.
- Nueva función `canAccessExpensesModule(level)` en `permissions.ts`, usada tanto por la pantalla como por `AppLayout` (`isModuleAccessible`), para que la pestaña nunca aparezca con "Sin acceso" (hoy `vista_jugador` podría mostrar la pestaña).
- `rolePages.ts`: hoy Staff NO tiene `compras_facturas` en su página Coordinación; se agrega (necesario para la prueba 3).

## 3) Documentos — pasa a Coordinación
- `rolePages.ts`: `DEFAULT_PAGE_FOR_MODULE.documentos = "coordinacion"`; quitar de `admin.admin`; agregar a `coordinacion` en admin, tecnico, medico y staff; en `COORDINACION_ORDER` tras `compras_facturas`.
- Admin queda con `["usuarios"]` (no vacío); su visibilidad sigue dependiendo de `canSeeUsers`.
- Descripción del head de `admin.index.tsx` sin "documentos".
- La matriz agrupa por página, así que Documentos aparece bajo Coordinación.

## 4) Tácticas — fuera de navegación y matrices
- Quitar de `MODULES` (`modules.ts`), `ROLE_PAGES`, `CLUB_ORDER`, `DEFAULT_PAGE_FOR_MODULE` (si el tipo lo exige, se marca como Partial/omite), `DEFAULT_ROLE_LEVELS` y la lista de `admin.clubs.tsx`.
- Se conserva en el tipo `ModuleKey` si quitarlo rompe tipos.

## 5) Mes — alias de Agenda
- `modules.ts`: mover `mes` de `MODULES` a `NAV_ALIAS_MODULES`; `NAV_ALIAS_PERMISSION.mes = "agenda"`; descripción de agenda: "Lista y vista mensual de eventos".
- `permissions.ts`: quitar `mes` de `DEFAULT_ROLE_LEVELS`.
- `m.mes.tsx`: `useEditableTeams` / `useTeamAccess` con `permissionKeyFor("mes")`.
- `agenda.tsx` e `index.tsx` (Home): visibilidad y pestaña por defecto dependen de `agenda`; Mes se muestra cuando hay acceso a agenda.
- Verificar que `getModuleAccess`/`canViewModule` resuelvan alias vía `permissionKeyFor` (como multimedia_gestion); si no, ajustar ahí.
- `admin.clubs.tsx`: quitar `mes` de la lista de módulos.
- Revisión previa: los 4 ajustes avanzados de `mes` existentes coinciden con su ajuste de `agenda`, y ningún rol tiene Mes distinto de Agenda; nadie cambia de permiso con el alias.

## Verificación
- Revisión de tipos/compilación limpia.
- Con Playwright y sesiones de prueba (o "Ver como"), recorrer las 8 pruebas del documento: Staff Viajes/Compras, Jugador sin Coordinación › Viajes, Técnico Documentos y sin Compras, sin Tácticas, Mes/Agenda coherentes, matrices sin "Mes"/"Tácticas" y con Documentos en Coordinación.
- Resumen final con archivos modificados y resultado de cada prueba.

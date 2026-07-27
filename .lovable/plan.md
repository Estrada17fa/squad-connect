## Objetivo
Eliminar el módulo `calendario` y dividir su contenido en dos módulos independientes — `agenda` y `mes` — para que aparezcan como chips en el `ModuleTabs` scrolleable (igual que el resto de páginas) y respondan al sistema de activar/desactivar módulos y páginas.

## 1. Renombrar y dividir el módulo

**`src/lib/modules.ts`**
- Quitar `"calendario"` del tipo `ModuleKey` y del array `MODULES`.
- Añadir dos entradas nuevas:
  - `{ key: "agenda", label: "Agenda", icon: List, description: "Próximos eventos en lista", scope: "mixed" }`
  - `{ key: "mes", label: "Mes", icon: Calendar, description: "Vista mensual de eventos", scope: "mixed" }`

**`src/lib/rolePages.ts`**
- En todos los roles del mapa `ROLE_PAGES`, cambiar `agenda: ["calendario"]` → `agenda: ["agenda", "mes"]`.
- En `DEFAULT_PAGE_FOR_MODULE`: reemplazar `calendario: "agenda"` por `agenda: "agenda"` y `mes: "agenda"`.
- En `resolvePagesForUser`, quitar el caso especial de la página `agenda` que fuerza `["calendario"]`; que se comporte como cualquier otra página (usa `perPage.agenda` filtrado por `isAccessible`), de modo que los chips se recorren si uno de los dos módulos está desactivado.

## 2. Rutas

- Renombrar `src/routes/_authenticated/m.calendario.tsx` → `m.agenda.tsx`; cambiar `createFileRoute("/_authenticated/m/agenda")`, dejar solo la vista de lista (contenido actual de `<TabsContent value="agenda">`) y el botón "Nuevo evento". Cambiar los checks de permiso de `getModuleAccess("calendario")` → `getModuleAccess("agenda")`.
- Crear `src/routes/_authenticated/m.mes.tsx` con la vista mensual (contenido actual de `<TabsContent value="mes">`, incluyendo navegación de meses y grid). Usa los mismos hooks (`useCalendarEvents`) y `getModuleAccess("mes")` para el botón.
- Eliminar el `<Tabs>` interno Agenda/Mes en ambos archivos — la separación ya la hace `ModuleTabs`.
- Actualizar `src/routes/_authenticated/agenda.tsx`: redirigir al primer módulo accesible de la página Agenda (`agenda` si está, si no `mes`, si no `EmptyState`).
- Actualizar `src/routes/_authenticated/index.tsx`: en el filtro y en `hasCal`/navegación de la card de próximo evento, reemplazar `"calendario"` por `"agenda"` (destino `/m/agenda`).
- Actualizar `src/lib/prefetch.ts`: cambiar `case "calendario"` a `case "agenda"` y `case "mes"` (mismo prefetch de eventos).
- Borrar el archivo viejo `m.calendario.tsx` una vez copiado el contenido.

## 3. Migración de base de datos

Nueva migración SQL:
- `UPDATE public.role_permissions SET module_key = 'agenda' WHERE module_key = 'calendario';`
- `INSERT INTO public.role_permissions (role_id, module_key, access_level) SELECT role_id, 'mes', access_level FROM public.role_permissions WHERE module_key = 'agenda' ON CONFLICT DO NOTHING;`
- Mismo tratamiento para `user_permission_overrides` (rename `calendario`→`agenda`, duplicar como `mes`).
- Reemplazar en las policies de `calendar_events` / `event_attendees` (migración `20260724031449_...`) todas las referencias literales `'calendario'` por `'agenda'` mediante `DROP POLICY` + `CREATE POLICY` (los helpers `has_module_editor` reciben la clave como parámetro; solo cambia el literal).
- Actualizar el bloque `seed` de clubes en `admin.clubs.tsx` (línea 261) y cualquier semilla que use `'calendario'` a `'agenda','mes'`.

## 4. Verificación

1. `bun run build` limpio; no quedan referencias a `"calendario"` (`rg calendario src/ supabase/` vacío salvo migraciones históricas).
2. En `/agenda` la barra de chips muestra "Agenda" y "Mes"; al desactivar uno en Permisos, el otro sigue y los chips se recorren; al desactivar ambos, la página Agenda desaparece de la navbar.
3. Los diálogos de "Roles y permisos" y "Overrides" agrupan ambos módulos bajo la página **Agenda** sin categoría "Otros".
4. Crear/editar eventos sigue funcionando desde `/m/agenda` (lista) y `/m/mes` (calendario mensual).

## Notas técnicas
- No se toca el esquema de `calendar_events`; solo cambian los `module_key` en tablas de permisos y las cadenas dentro de las policies.
- `mes` y `agenda` comparten datos (`useCalendarEvents`); son solo dos vistas registradas como módulos independientes para poder activarse/desactivarse por separado.

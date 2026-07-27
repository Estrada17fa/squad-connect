## Problema

En el diálogo de permisos/membresías, los módulos aparecen agrupados por página, pero `Calendario` y `Nutrición` caen en un grupo residual llamado **"Otros"** en lugar de aparecer bajo su página real:

- `Calendario` debe vivir bajo la página **Agenda**.
- `Nutrición` debe vivir bajo la página **Mi Club**.

Causa: `groupModulesByPage` (en `src/lib/rolePages.ts`) solo mira `ROLE_PAGES[role]`, donde `agenda` está vacío y `nutricion` no está listada en ningún rol. Todo lo que no encuentre hogar ahí termina en "Otros".

Además en `src/lib/modules.ts` la unión de tipos `ModuleKey` tiene `"nutricion" | "nutricion"` duplicado (el módulo en el array `MODULES` sí es único).

## Cambios

### 1. `src/lib/modules.ts`
- Quitar el `"nutricion"` duplicado del tipo `ModuleKey`.

### 2. `src/lib/rolePages.ts`
- En `groupModulesByPage`, cuando un módulo no esté en el mapa del rol, colocarlo en su página por defecto usando `DEFAULT_PAGE_FOR_MODULE` (p. ej. `calendario → agenda`, `nutricion → club`), en vez de mandarlo a un grupo "Otros".
- Eliminar por completo el grupo "Otros": ningún módulo debe caer ahí. Si por alguna razón un módulo no tiene página por defecto, simplemente no se muestra (equivale a "no asignable").
- Añadir `nutricion` al mapa `ROLE_PAGES` en la sección `club` de los roles que corresponda (admin, técnico, médico, staff, jugador) para que aparezca de forma natural en Mi Club, no solo por el fallback.

### 3. Página Agenda en el agrupador de permisos
- Confirmar que `calendario` aparece bajo la sección **Agenda** en `PermissionsMatrix` (roles) y `OverridesDialog` (miembros), con su switch maestro de página.

## Verificación
- Abrir `/m/usuarios` → Roles → editar cualquier rol: ya no aparece "Otros"; `Calendario` está bajo Agenda y `Nutrición` bajo Mi Club.
- Abrir overrides de un miembro: misma estructura.
- La navbar y los chips siguen recorriéndose sin huecos (comportamiento actual, no se toca).

## Nota
No se tocan permisos existentes en BD ni el navbar; es solo cómo se agrupan los módulos en los diálogos de permisos y limpieza del tipo duplicado.
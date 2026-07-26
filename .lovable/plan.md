# Pestañas de módulos dentro de los hubs

Convertir los hubs (`Mi Club`, `Coordinación`, `Admin`) de una grilla de tarjetas que "abre otra página" a una **barra de pestañas horizontal sticky** que cambia el contenido del módulo activo sin salir del hub. Cada módulo conserva su URL propia.

## Alcance

Afecta solo capa visual / navegación interna de los hubs. No toca datos, permisos, RLS, ni la navbar inferior.

Hubs a modificar:
- `/mi-club` → pestañas de los módulos del rol (plantel, salud, tácticas, torneo, comunicados, multimedia, desarrollo…)
- `/coordinacion` → pestañas (coordinación interna, solicitudes, inventario, viajes…)
- `/admin` → pestañas (usuarios, documentos, y "Administrar clubes" si es super admin)
- `/agenda` se queda igual (un solo módulo)

## Comportamiento UX

- Al entrar al hub, se abre el **primer módulo permitido** por defecto (redirect suave, no pantalla intermedia de grid).
- Barra de pestañas **sticky** debajo del `PageHeader`, con scroll horizontal en móvil (snap + fade en los bordes), ícono + label, indicador verde neón para la pestaña activa y contador opcional (ej: tareas pendientes).
- Cada pestaña navega a su ruta real (`/m/<module>`) usando `<Link>` de TanStack Router, así se preservan URL, back button, deep-links, preload y accesibilidad.
- El contenido del módulo se renderiza **dentro del layout del hub** (mismo `PageHeader` + tabs arriba), no como página aislada. Rutas de detalle (ej. `/m/plantel/$playerId`) siguen abriendo pantalla completa como hoy.
- Desktop/tablet: la misma barra horizontal (no barra lateral en esta iteración — se puede añadir después).
- Caso "Mis Solicitudes" (jugador en `/coordinacion`): igual, pestañas si hay más de un módulo; si hay uno solo, se oculta la barra.

## Estructura técnica

Layout compartido de hub:

```text
src/routes/_authenticated/
  _hub.tsx                 (pathless layout: PageHeader + ModuleTabs + <Outlet/>)
  _hub/
    mi-club.tsx            (redirige al primer módulo del hub)
    coordinacion.tsx       (idem)
    admin.tsx              (idem)
    m.$module.tsx          (mueve el actual m.$module bajo el layout de hub)
    m.plantel.tsx          (idem)
    m.calendario.tsx       (queda fuera — lo usa /agenda)
    ...
```

Alternativa más quirúrgica (preferida, menos churn de rutas): NO mover archivos. En su lugar:

1. Crear `src/components/squad/ModuleTabs.tsx` — barra sticky reutilizable que recibe `modules: ModuleKey[]` y `activeKey`.
2. Cada ruta de módulo (`m.plantel.tsx`, `m.coordinacion_interna.tsx`, etc.) determina a qué hub pertenece vía `DEFAULT_PAGE_FOR_MODULE` (ya existe en `src/lib/rolePages.ts`), obtiene los módulos hermanos accesibles desde `useApp()`, y renderiza `<ModuleTabs>` arriba de su contenido actual.
3. `mi-club.tsx`, `coordinacion.tsx`, `admin.tsx` dejan de mostrar la grilla de tarjetas y hacen `<Navigate replace>` al primer módulo permitido. Si no hay ninguno, muestran `EmptyState` como hoy.
4. `m.$module.tsx` (placeholder de módulos sin construir) también renderiza `ModuleTabs` para que la pestaña activa se vea aunque el contenido diga "próximamente".

Voy con la alternativa quirúrgica.

## Componente `ModuleTabs`

- Contenedor: `sticky top-0 z-10 -mx-4 px-4 bg-background/80 backdrop-blur border-b border-border`.
- Lista con `overflow-x-auto snap-x snap-mandatory`, cada tab `snap-start`.
- Tab: `<Link to="/m/$module" params={{module: key}}>` con ícono (16-18px) + label, `data-status="active"` estilizado con barra inferior verde neón (`bg-primary`) y texto `text-foreground`; inactivo `text-muted-foreground hover:text-foreground`.
- En desktop, si caben todas sin scroll, centrar o alinear a la izquierda; si no, permitir scroll horizontal con `mask-image` fade en los bordes.
- Accesibilidad: `role="tablist"`, cada link `role="tab"` y `aria-current="page"` cuando activo.

## Ediciones concretas

1. **Nuevo**: `src/components/squad/ModuleTabs.tsx`.
2. **Editar** `src/routes/_authenticated/mi-club.tsx`: reemplazar grid por `<Navigate>` al primer módulo del hub (o `EmptyState` si no hay).
3. **Editar** `src/routes/_authenticated/coordinacion.tsx`: idem.
4. **Editar** `src/routes/_authenticated/admin.tsx`: idem, considerando la tarjeta especial "Administrar clubes" del super admin como una pestaña más al final.
5. **Editar** cada `m.<module>.tsx` real (`m.plantel.tsx`, `m.coordinacion_interna.tsx`, `m.usuarios.tsx`, `m.$module.tsx`, `m.plantel.$playerId.tsx` NO — es detalle): insertar `<ModuleTabs>` justo debajo del `PageHeader`. Para saber qué pestañas mostrar: buscar la `ResolvedPage` cuyo `modules` incluye el módulo actual y usar esa lista.
6. Pequeño helper en `src/lib/rolePages.ts`: `findHubForModule(visiblePages, moduleKey)` que devuelva `{ page, modules }` — evita duplicar la lógica en cada ruta.

## Notas de diseño (tokens existentes)

- Reutiliza `--primary` (verde neón) para el indicador activo y `--border` / `--muted-foreground` para el resto. Sin colores nuevos ni hardcodes.
- Sticky respeta el `PageHeader`: el header queda arriba, tabs justo abajo, contenido scrollea.
- En móvil (393px) la barra ocupa el ancho completo con padding lateral consistente con el resto de la app.

## Fuera de alcance

- Cambios en permisos, RLS, datos o navbar inferior.
- Barra lateral vertical de módulos en desktop (se puede añadir en un segundo paso si lo pides).
- Animaciones de transición entre módulos (fade/slide) — se puede añadir después con Motion for React.

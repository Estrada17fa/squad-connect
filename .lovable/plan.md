## Objetivo
Eliminar los subtítulos descriptivos que aparecen al inicio de cada página (ej. "Ámbito club · staff sin importar equipo") para que el contenido empiece directo desde las pestañas/acciones.

## Cambios

### 1. `src/components/squad/PageHeader.tsx`
- Cuando `hideTitle` está activo y no hay `action`, no renderizar nada (colapsar el bloque).
- Cuando `hideTitle` está activo y hay `action`, renderizar solo la fila de acciones (sin el subtítulo).
- Efecto: se ignora `subtitle` en modo `hideTitle`, sin tocar cada página individualmente.

### 2. Rutas de módulos
Quitar la prop `subtitle` de los `<PageHeader hideTitle ... />` en:
- `src/routes/_authenticated/m.coordinacion_interna.tsx`
- `src/routes/_authenticated/m.plantel.tsx`
- `src/routes/_authenticated/m.calendario.tsx`
- `src/routes/_authenticated/m.usuarios.tsx`
- `src/routes/_authenticated/m.plantel.$playerId.tsx`
- `src/routes/_authenticated/admin.clubs.tsx`
- Cualquier otra ruta bajo `_authenticated/` que use `PageHeader` con subtítulo descriptivo (mi-perfil, admin, mi-club, agenda, coordinacion — a confirmar al leer).

### 3. Resultado visual
- Las páginas que solo tenían `PageHeader` con subtítulo → ya no ocupan ese espacio; empiezan directo con `ModuleTabs` o el contenido.
- Las páginas con acciones (ej. botón "Nueva tarea" + `ViewToggle`) → mantienen esa fila de acciones alineada a la derecha, sin texto descriptivo a la izquierda.

## No se toca
- La navbar (ya indica sección activa en verde).
- Los títulos de cards, secciones internas ni los `<h3>` de agrupación ("Pendiente", "Próximas", etc.).
- La lógica de datos ni permisos.

# Coordinación con jerarquía (solo diseño, datos de ejemplo)

Se ajustan los componentes existentes de Coordinación; no se tocan base de datos, permisos, rutas, Mi Club, Agenda, Inicio, Admin ni /m/<módulo>.

## Cambios visibles
1. **Encabezado ligero:** "Coordinación" a 21 px, debajo "Primer Equipo ▾" en gris pequeño (solo visual). A la derecha un botón "+" sin fondo que abre un menú flotante con las acciones del área (General: Tarea, Comunicado; Técnica: Convocatoria, Entrenamiento; Médica: Lesión, Cita). Cada opción muestra "Próximamente". Se quita la fila de acciones rápidas.
2. **Pestañas de área sin marco:** ícono + nombre, línea inferior de 2 px del color del área que se desliza; inactivas en gris; divisoria sutil.
3. **Tarjeta "Lo próximo":** una sola tarjeta grande, fondo tenue del área, sin borde, esquinas 16 px, con etiqueta, título 20 px, línea de apoyo y botón del color del área (textos exactos del documento).
4. **Pendientes como lista:** 2–3 filas con ícono en cuadro tenue, texto completo, número/hora en negrita, separadores finos, flecha y efecto al tocar.
5. **Módulos como íconos de app:** cuadrícula de 3 columnas en celular, 6 en escritorio; cuadro de 52 px sin borde, ícono de 24 px del color del área, nombre corto debajo ("Entrenos"), globo con número del color del área, "Próximamente" atenuado con candado.
6. **Menos bordes:** separación por espacio y fondo. La página de un módulo también: encabezado sin marco, datos como números grandes en línea, sin texto cortado.
7. **Escritorio:** tarjeta y pendientes lado a lado, módulos debajo en una fila, ancho máximo centrado.

## Técnico
- Editar `AreaSwitcher.tsx`, `ModuleTile.tsx`, `ModulePageShell.tsx`, la portada `coordinacion.$area.index.tsx`; quitar el uso de `QuickActions`/`StatChip` en la portada (borrar los archivos si quedan sin uso).
- Nuevos: `coord/CoordHeader.tsx` (con Popover de shadcn + toast "Próximamente"), `coord/HeroCard.tsx`, `coord/PendingList.tsx`.
- `coordMockData.ts`: agregar hero, pendientes, acciones rápidas y globos por área; `coordAreas.ts`: nombres cortos de módulos.
- Colores siempre con los tokens de área ya existentes (sólido y suave).
- Entrega: capturas a 375 px y escritorio de las 3 áreas, del menú "+" abierto y de una página de módulo.

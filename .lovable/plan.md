# Coordinación más limpia en móvil (solo diseño)

No cambian rutas, permisos ni lógica. Solo encabezado de Coordinación y la barra de búsqueda de Plantel.

## 1. Título = selector de área (`CoordHeader`)
- Se elimina la fila de pastillas de áreas.
- Título: en móvil solo "Técnica"; en escritorio "Coordinación · Técnica". Si hay más de un área, el título es un botón con chevron.
- Al tocarlo se abre el `Drawer` existente (hoja inferior) con las áreas visibles del usuario: icono, nombre y subtítulo; la activa resaltada en verde (`primary`). Elegir una navega a su primera opción (`/coordinacion/<área>/...` vía COORD_AREAS, igual que hoy) y cierra la hoja.
- Con una sola área: texto plano, sin chevron ni hoja.
- Subtítulo: `hidden md:block`.

## 2. Encabezado fijo y compacto
- Título-selector + pestañas de módulos (fila única con scroll horizontal) dentro de un mismo bloque `sticky` con fondo `background/85` + blur, poco margen vertical y sin hueco entre ambos.
- Hueco opcional a la derecha del título (`slot`) para que la pantalla ponga la lupa.

## 3. Buscador de Plantel
- Móvil: el buscador se oculta; aparece un icono de lupa a la derecha del título (vía un pequeño contexto que `CoordShell` expone para que la pantalla registre su acción). Al tocarla se despliega debajo del título el campo de búsqueda + el filtro de categoría; tocar de nuevo lo cierra (conserva el texto del filtro igual que hoy).
- Escritorio (md+): `PlantelFilters` queda como hoy.
- Contador "61 personas": texto pequeño gris, alineado a la derecha en la línea del primer encabezado de sección (se quita de la barra de filtros en móvil).
- Fuera de Coordinación (`/m/plantel`) Plantel se ve igual que hoy.

## 4. Espaciados
- Móvil: menos margen superior de la página en Coordinación y `space-y-3` en vez de `space-y-6` entre encabezado y contenido. Solo clases y tokens existentes.

## Archivos
- `src/components/squad/CoordShell.tsx` (selector, hoja, encabezado fijo, slot de acción)
- `src/components/pages/PlantelPage.tsx` y `PlantelFilters` (lupa, contador, espaciado)
- Posible ajuste menor en `src/routes/_authenticated/coordinacion.tsx` (margen superior)

## Pruebas (Playwright, con sesión de admin)
1. 375 px, Técnica › Plantel: el primer jugador aparece en la mitad superior.
2. Tocar el título abre la hoja y cambia de área.
3. Una sola área: sin chevron (comprobado forzando el caso, o con "Ver como" un rol de una sola área).
4. Lupa abre/cierra y filtra igual.
5. Escritorio igual que hoy salvo el selector.
- Capturas antes/después en 375 px y en escritorio.

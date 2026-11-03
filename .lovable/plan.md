# Nuevo look de Coordinación (solo diseño)

Todo con datos de ejemplo, sin base de datos, permisos ni lógica. Las rutas /m/<módulo>, Mi Club, Agenda, Inicio y Admin no se tocan.

## Estructura
- `src/lib/coordAreas.ts`: 3 áreas (General, Técnica, Médica) con sus módulos, íconos, color y enlace a la versión actual /m/<módulo>. Eventos marcado "Próximamente".
- `src/lib/coordMockData.ts`: números y textos de ejemplo (resúmenes, dato corto por módulo, globos de pendientes, pestañas internas, textos del estado vacío).

## Rutas
- `/coordinacion` (reemplaza la página actual del hub): redirige a la última área usada (guardada en el navegador) o a General.
- `/coordinacion/$area`: portada del área. Área inválida → General.
- `/coordinacion/$area/$module`: plantilla de módulo. Módulo inválido → portada del área.
- La pestaña Coordinación de la barra inferior sigue apuntando a /coordinacion y se marca activa en todas estas rutas.

## Tema (src/styles.css)
- Tokens nuevos: `--area-general` (verde actual), `--area-tecnica` (azul), `--area-medica` (rojo coral), cada uno con su versión tenue (`-soft`), registrados para usarse como clases.
- Utilidades: tarjeta coord (radio 16 px, borde sutil, sin sombra pesada), efecto toque (escala 0.97) y elevación leve al pasar el mouse en escritorio, transición corta de página.

## Componentes nuevos (src/components/coord/)
- AreaSwitcher: control segmentado de 3 áreas con indicador deslizante en el color del área (también se reusa para pestañas internas).
- AreaSummary + StatChip: fila de 2–3 datos con número grande (24–32 px) y etiqueta pequeña.
- QuickActions: pastillas "+ Acción" que muestran aviso "Próximamente".
- ModuleTile: ícono grande en cuadro tenue, nombre, dato corto, globo de pendientes, estado atenuado "Próximamente".
- ModulePageShell: encabezado fijo compacto (‹ Área, ruta pequeña, título con ícono), StatChips, pestañas opcionales, lupa/filtro desplegables, contenido, botón flotante "+" en celular, enlace discreto "Ver versión actual".
- EmptyState: ícono grande, una línea y botón principal "+ Agregar".

## Portada del área
Encabezado "Coordinación" + pastilla de categoría visual ("Primer Equipo ▾") → AreaSwitcher → AreaSummary → QuickActions → cuadrícula de módulos (2 columnas en celular, 3–4 en escritorio). Pensado primero para 375 px.

## Entrega
- Capturas a 375 px y escritorio de las 3 portadas y de la página de Plantel.
- Lista de componentes y tokens agregados.
- Confirmación de que no se tocó la base de datos, permisos ni rutas /m/.

## Detalles técnicos
- Archivos de ruta: `coordinacion.tsx` pasa a ser layout con `<Outlet />`; nuevos `coordinacion.index.tsx`, `coordinacion.$area.tsx` (layout) / `coordinacion.$area.index.tsx`, `coordinacion.$area.$module.tsx`, cada uno con su head().
- La página actual de Coordinación (hub con enlaces a módulos) se reemplaza; ninguna ruta /m/ se modifica.

# Ajuste de ligereza: Coordinación (solo diseño)

Objetivo: en un celular de 375 × 667 se ven sin scroll la tarjeta principal, los pendientes y la primera fila de módulos. No se tocan la base de datos, los permisos ni las rutas.

## Portada del área
- **Encabezado** (CoordHeader): "Coordinación" a 20 px con el "+" a la derecha en la misma línea. Debajo, pegada al título, la categoría "Primer Equipo ▾" a 12 px en gris. El margen superior y el espacio hasta las pestañas se reducen a la mitad.
- **Pestañas** (AreaSwitcher): de ~40 px de alto. El contorno de foco solo aparece al usar el teclado, no al tocar.
- **Tarjeta principal** (HeroCard): relleno de 14 px, título a 18 px y texto de apoyo a 13 px. El botón se cambia por un enlace con flecha en el color del área ("Ver viaje ›"), en la misma línea que el texto de apoyo.
- **Pendientes** (PendingList): filas de 44 px, ícono de 18 px sin cuadro de fondo, texto a 14 px y número a la derecha. Se muestran 3 filas como máximo; si hay más, se añade al final "Ver todos ›".
- **Módulos** (ModuleTile y la portada del área): se mantienen las 3 columnas, con menos espacio entre filas. Los títulos de sección van a 12 px con menos margen.
- Los espacios verticales de toda la página siguen una sola escala: 8, 12, 16 y 24 px.

## Página del módulo (ModulePageShell)
- Se quita el texto pequeño "Coordinación · Técnica".
- Encabezado en una sola fila: "‹ Técnica" a la izquierda, lupa y filtro a la derecha. Debajo van el ícono y el título del módulo.
- **Estado vacío** (EmptyState): sin caja. Solo el ícono sin cuadro, una frase de 14 px en gris y como mucho un botón. Mientras se ve ese estado con botón, el "+" flotante se oculta; solo aparece cuando la lista tiene contenido.
- "Ver versión actual" pasa al final de la página, en texto de 12 px y lejos del "+".
- Cada módulo tiene su propia frase y su propio botón, como dato de ejemplo en coordMockData. Por ejemplo, Torneo: "Aquí verás la tabla y los resultados", sin botón. Plantel: "Agrega a tu primer jugador" con el botón "Agregar jugador".

## Entrega
Capturas en celular de 375 × 667 de las 3 áreas y de las páginas de Torneo y Plantel. En las de las áreas debe verse la primera fila de módulos sin hacer scroll.

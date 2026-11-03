# Pendientes con presencia y botón compacto (solo diseño)

Solo componentes de Coordinación y datos de ejemplo. Sin base de datos, permisos ni rutas.

## 1. Sin recuadro al tocar pestañas
- Pestañas de área: quitar outline/ring/borde al tocar o hacer clic (incluido el estilo por defecto del botón y el resaltado de toque del móvil).
- Solo con teclado (`:focus-visible`): la línea inferior se vuelve más gruesa, sin recuadro.

## 2. Botón compacto en la tarjeta grande
- Se quita "Ver viaje ›".
- Pastilla de 32 px de alto, texto 13 px, fondo del color del área y texto oscuro, abajo a la derecha junto a la línea de apoyo.

## 3. Pendientes agrupados
- Encabezado: "Pendientes" (12 px, gris) a la izquierda y "Ver todos" (12 px, color del área) a la derecha.
- Una sola tarjeta con fondo de superficie, sin borde, esquinas de 14 px y separadores finos.
- Cada fila: ícono de 15 px en un círculo de 28 px con fondo tenue del área; título 14 px con una línea de contexto 11 px gris; número en una pastilla a la derecha.
- Tres colores de urgencia nuevos en el tema: rojo (vence hoy/atrasado), ámbar (esperando), gris (normal). Filas ordenadas de más a menos urgente.
- Datos:
  - General: Tareas · "1 vence hoy" · 4 rojo; Solicitudes · "La más antigua: hace 2 días" · 2 ámbar; Comunicados · "Sin leer por 5 personas" · 1 gris.
  - Técnica: Evaluaciones · "2 atrasadas" · 3 rojo; Entrenamiento · "Hoy · Cancha principal" · 7:00 am gris.
  - Médica: Citas · "Hoy 5:00 pm" · 1 rojo; Lesionados · "1 regresa esta semana" · 2 ámbar.

## 4. Punto rojo en pestañas
- Punto de 6 px junto al nombre del área si tiene algún pendiente en rojo (también en la activa). Con los datos: las tres áreas.

## Entrega
Capturas en 375×667 de las 3 áreas y una tocando una pestaña.

## Detalles técnicos
- `src/styles.css`: tokens `--urgent`, `--waiting`, `--normal` (+ variantes suaves) y `-webkit-tap-highlight-color: transparent` en pestañas.
- `coordMockData.ts`: `MockPending` gana `context` y `urgency: "red" | "amber" | "gray"`; helper `areaHasUrgent(area)`.
- `PendingList.tsx`, `HeroCard.tsx`, `AreaSwitcher.tsx` reescritos según lo anterior.

# Rediseño de tarjetas — estilo "scoreboard" deportivo

Solo cambia la apariencia. Misma información, mismos botones, mismo funcionamiento. Se mantiene la barra lateral de color.

## Nuevo lenguaje visual
```text
|▌ ┌──────┐  TÍTULO EN NEGRITA           [ESTADO]
|▌ │ 12   │  Subtítulo en gris
|▌ │ OCT  │  ⏱ 18:00   📍 Estadio   👥 Sub-15
|▌ └──────┘  ─────────────────────────────────
|▌            pie: acciones / montos / extras
```
- **Bloque "marcador" a la izquierda**: el dato clave grande (fecha día/mes, hora, monto, dorsal, cantidad, o el ícono si no hay dato), fondo sutil con tinte del color de la barra.
- **Título** más grande y pesado (Quicksand bold), **subtítulo** en gris.
- **Fila de metadatos** con íconos pequeños en vez de texto corrido (hora, lugar, categoría, responsable, etc.).
- **Etiquetas pequeñas en mayúsculas** sobre valores numéricos (ej. "MONTO", "STOCK").
- Estado como chip compacto arriba a la derecha.
- Pie separado por línea fina para acciones y datos secundarios.
- Hover: borde y brillo verde sutil; esquinas un poco más redondeadas; sombra suave.

## Alcance
1. Tarjeta base compartida (usada en Desarrollo, Mi perfil, Viajes, Inventario, Compras, Agenda, Usuarios, Admin, Comunicados).
2. Tarjetas propias de cada módulo: Solicitudes, Documentos, Compras (gastos), Plantel (personas), Partidos, Multimedia, Inicio (próximo partido, comunicados, torneo), Calendario/Agenda, Entrenamientos, Nutrición, Salud, Coordinación, Logística de viajes (vuelos, hoteles, comidas, equipaje, transportes), Notificaciones, Admin (categorías, ubicaciones).
3. No se tocan formularios ni ventanas de diálogo (solo sus tarjetas de listado si existen).

## Detalles técnicos
- `StandardCard` gana props opcionales: `lead` (contenido del bloque marcador, ej. `{ top: "12", bottom: "OCT" }` o nodo), `meta` (lista `{icon, label}`), `footer`. Si no se pasan, se ve el nuevo estilo igual (ícono en bloque marcador).
- Nuevos componentes pequeños en `src/components/squad/`: `CardLead`, `CardMeta`, `CardStat` (etiqueta mayúscula + valor), reutilizables en tarjetas propias.
- Tokens nuevos en `src/styles.css`: `--card-surface`, `--card-border-hover`, `--shadow-card`, utilidad `card-scoreboard`; sin colores fijos en componentes.
- Cada tarjeta de módulo se reescribe solo en su marcado/estilo; queries, permisos y handlers sin cambios.
- Verificación con capturas en escritorio y móvil de los módulos principales.

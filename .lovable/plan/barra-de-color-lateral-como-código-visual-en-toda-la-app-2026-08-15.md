# Barra de color lateral como código visual en toda la app

Solo presentación. No cambia lógica, permisos, datos ni qué ve cada quien.

## 1. El componente: `StandardCard` con barra (`accent`)

En vez de crear una tarjeta nueva y duplicar estilos, se extiende `StandardCard`
(ya usada en Solicitudes, Compras, Inventario, Documentos, Viajes, Desarrollo…)
con dos props opcionales:

- `accent`: color de la barra (token CSS, ej. `var(--event-partido)` o `var(--status-rejected-foreground)`).
- `accentLabel`: texto accesible del significado (para `aria-label`/`title`).

La barra es una franja **sólida** de 4px, pegada al borde izquierdo, de alto
completo, con las esquinas de la tarjeta respetadas (`overflow-hidden`).
Sin degradados. Misma medida y posición en todos los módulos.

`EventCard` (Agenda) pasa a usar esa misma barra para que sea literalmente el
mismo pixel en toda la app, conservando su layout de hora + icono.

Se añade un helper `src/lib/accents.ts` con los colores semánticos como
constantes (nada de hex sueltos en componentes), apoyado en los tokens que ya
existen en `styles.css` (`--event-*`, `--status-*`) más tres tokens nuevos de
semáforo: `--level-low` (verde), `--level-mid` (ámbar), `--level-high` (rojo).

## 2. Mapa color → significado

Regla global: verde = ok/bajo, ámbar = medio/pendiente, rojo = alto/alerta,
azul = informativo, gris = neutro/sin dato. Los tipos de evento mantienen su
paleta propia (ya centralizada en `eventTypes.ts`).

| Módulo | La barra significa | Colores |
| --- | --- | --- |
| Agenda / Mes | Tipo de evento | los de `eventTypes.ts` (partido morado, entrenamiento azul, viaje naranja, junta gris, especial rosa, médico rojo) |
| Tareas (Coordinación) | Prioridad | baja verde, media ámbar, alta rojo, urgente rojo intenso |
| Comunicados | Prioridad | normal gris, importante ámbar, urgente rojo |
| Solicitudes | Estado | pendiente ámbar, requiere info azul, aprobada verde, rechazada rojo |
| Compras y facturas | Estado fiscal | sin factura rojo, pendiente ámbar, facturado verde |
| Inventario / catálogo | Disponibilidad | disponible verde, stock bajo ámbar, agotado rojo |
| Partidos (Coordinación) | Estado del partido | programado azul, jugado verde, suspendido/cancelado rojo |
| Plantel | Estado físico | apto verde, en duda ámbar, en recuperación azul, lesionado / baja médica rojo |
| Resto (Documentos, Viajes, Desarrollo…) | Sin distinción natural | verde de marca (neutro de acento) para mantener la consistencia |

## 3. Módulos que además necesitan jerarquía (referencia: Salud/Desarrollo/Nutrición)

Para los que se ven planos, junto con la barra:

- **Plantel**: dorsal más contundente, foto mayor, badge de estado físico con color, posición como línea secundaria discreta.
- **Comunicados**: título grande, badge de prioridad y categoría, autor + fecha en un renglón de metadatos, indicador de leído/no leído.
- **Tareas**: prioridad como barra (se elimina el punto redundante), estado como badge, responsables como avatares, vencimiento con color cuando está vencido.
- **Inventario**: cantidad disponible como número destacado, badge de estado, categoría con su icono.
- **Compras**: monto como dato dominante, badges de pago y fiscal, proveedor y fecha como metadatos.
- **Partidos**: escudos/rival como línea principal, jornada y sede como contexto, badge de estado, contador de convocados.
- **Agenda**: se pule espaciado y contraste del renglón de contexto; el patrón se mantiene.

## 4. Detalles técnicos

- Archivos nuevos: `src/lib/accents.ts` (mapa color→significado por dominio).
- Editados: `StandardCard.tsx`, `EventCard.tsx`, `styles.css` (3 tokens de
  semáforo), y las tarjetas de Plantel (`PersonCards`), Comunicados
  (`ComunicadosPieces`), Tareas (`TaskBoard`), Inventario (`m.inventario`),
  Compras (`ExpenseCard`), Solicitudes (`RequestCard`), Partidos (`MatchOpsCard`).
- Sin cambios en hooks, migraciones, RLS ni rutas.
- Verificación: typecheck + revisión visual en móvil (393px) de Agenda, Plantel,
  Coordinación, Comunicados, Inventario, Compras y Partidos.

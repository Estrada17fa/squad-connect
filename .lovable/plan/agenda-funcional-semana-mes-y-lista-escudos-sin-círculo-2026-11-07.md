# Agenda funcional: Semana, Mes y Lista + escudos sin círculo

Se conserva toda la lógica actual (categorías, filtros por tipo, viajes en Borrador ocultos, respuestas a juntas, "+" temporal) y las tarjetas por tipo. Sin cambios en la base de datos.

## 1. Estado en la dirección
`/m/agenda?vista=semana|mes|lista&fecha=AAAA-MM-DD` (por defecto semana y hoy). Cada cambio de semana/mes/vista crea una entrada nueva, así Atrás regresa y recargar mantiene la vista. El día elegido dentro de la semana también va en la dirección (`dia=`).

## 2. Encabezado y pestañas
- Pestañas "Agenda" (calendario) y "Mis viajes" (avión), con el subrayado actual.
- Se quita el ícono de calendario del encabezado: queda título, categoría, filtro y "+".
- Debajo, control pequeño Semana · Mes · Lista con íconos.

## 3. Semana
- ‹ rango "2 – 8 nov 2026" › sin límite; deslizar la tira hace lo mismo; "Hoy" si no es la semana actual.
- Tira Lun–Dom con hasta 3 puntos (verde partido, gris resto), hoy en verde, seleccionado con fondo claro.
- Por defecto "Toda la semana" agrupada por día; tocar un día muestra solo ese día o "Sin eventos este día"; tocarlo de nuevo o "Toda la semana" regresa; cambiar de semana reinicia la selección.
- Semana vacía: "Semana libre" + "Próximo: Dom 8 nov ›" que salta a esa semana.

## 4. Mes (nuevo)
- ‹ "Noviembre 2026" ›, "Hoy", deslizar cambia de mes.
- Cuadrícula Lun–Dom, otros meses atenuados, mismos puntos, hoy en verde, seleccionado con fondo claro; máximo ~45% de la altura.
- Selección inicial: hoy (o día 1 en otro mes); debajo, tarjetas del día o "Sin eventos este día".
- `/m/mes` redirige a `/m/agenda?vista=mes`.

## 5. Lista
- Desde hoy en adelante, agrupado por mes y día, mismas tarjetas.
- Al llegar al final se carga el mes siguiente automáticamente.
- Interruptor "Incluir pasados": sección "Anteriores", de más reciente a más antiguo.
- Filtros de tipo y categoría aplican igual.

## 6. Escudos (en toda la app)
Con imagen: escudo completo, sin fondo, borde ni recorte, centrado en caja cuadrada (24/36/56 px). Sin imagen: círculo con iniciales. Se revisa Agenda, Coordinación (General y Técnica) y Viajes.

## 7. Consultas por rango
Hoy la Agenda descarga todos los eventos del club de una vez, sin límite de fechas. Cada vista pedirá solo lo que muestra:
- Semana: la semana visible, precargando la anterior y la siguiente.
- Mes: todo el rango de la cuadrícula, incluidos los días de meses vecinos.
- Lista: al llegar al final se pide el siguiente mes a la base; con "Incluir pasados", meses hacia atrás uno por uno.
- Los puntos de la tira y la cuadrícula salen del mismo rango consultado.
- Mismas reglas de visibilidad y actualizaciones en vivo.

## 8. Pruebas (tocando en 375 × 667)
Las 7 del documento una por una, más: ir 3 meses adelante en Mes y ver eventos ahí (temporal si no hay) y, en Lista, bajar hasta eventos de dentro de 2 meses. Datos temporales sin avisos a nadie real, borrados al final. Las 5 capturas pedidas. Sin errores de TypeScript.

## Detalles técnicos
- `validateSearch` con `fallback()` en `m.agenda.tsx`; clamp de fecha en el componente.
- Funciones puras en `src/lib/agenda.ts`: `weekRange`, `monthGrid`, `dotsForDay`, `groupByMonthDay`, con pruebas.
- Nuevos `WeekView`, `MonthView`, `ListView`, `ViewSwitch` en `src/components/agenda/`; `WeekStrip` con flechas y gesto.
- Nuevo `useCalendarRange({clubId, from, to})` (`gte/lt starts_at`, clave por rango, mismo filtro `visible`/`isAgendaVisible`, invalidación en vivo); `prefetchQuery` para ±1 semana.
- Lista: `useInfiniteQuery` por mes hacia adelante + IntersectionObserver; otra hacia atrás para "Anteriores".
- "Próximo: …" con consulta `limit 1` posterior a la semana.
- `useCalendarEvents` queda intacto para las demás pantallas. La tarea se añade a roadmap.md al construir.
- Los dos `TeamCrest` (match y torneo) con `object-contain` sin aro.

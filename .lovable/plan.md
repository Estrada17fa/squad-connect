# Agenda funcional: Semana, Mes y Lista + escudos sin círculo

Se conserva toda la lógica actual (categorías, filtros por tipo, viajes en Borrador ocultos, respuestas a juntas, "+" temporal) y las tarjetas por tipo. Sin cambios en la base de datos.

## 1. Estado en la dirección
`/m/agenda?vista=semana|mes|lista&fecha=AAAA-MM-DD` (por defecto semana y hoy). Cada cambio de semana/mes/vista crea una entrada nueva, así Atrás regresa y recargar mantiene la vista. El día elegido dentro de la semana también va en la dirección (`dia=`), para que Atrás lo respete.

## 2. Encabezado y pestañas
- Pestañas "Agenda" (calendario) y "Mis viajes" (avión), con el subrayado actual.
- Se quita el ícono de calendario del encabezado: queda título, categoría, filtro y "+".
- Debajo, control pequeño Semana · Mes · Lista con íconos.

## 3. Semana
- ‹ rango "2 – 8 nov 2026" › sin límite, deslizar la tira hace lo mismo, "Hoy" si no es la semana actual.
- Tira Lun–Dom con hasta 3 puntos (verde partido, gris resto), hoy en verde, seleccionado con fondo claro.
- Por defecto "Toda la semana" agrupada por día; tocar un día muestra solo ese día con su nombre o "Sin eventos este día"; tocarlo de nuevo o "Toda la semana" regresa; cambiar de semana reinicia la selección.
- Semana vacía: "Semana libre" + "Próximo: Dom 8 nov ›" que salta a esa semana.

## 4. Mes (nuevo)
- ‹ "Noviembre 2026" ›, "Hoy", deslizar cambia de mes.
- Cuadrícula Lun–Dom, otros meses atenuados, puntos iguales, hoy en verde, seleccionado con fondo claro; máximo ~45% de la altura.
- Selección inicial: hoy (o día 1 en otro mes); debajo, tarjetas del día o "Sin eventos este día".
- `/m/mes` redirige a `/m/agenda?vista=mes`.

## 5. Lista
- Desde hoy en adelante, agrupado por mes y día, mismas tarjetas.
- Carga mes a mes automáticamente al llegar al final.
- Interruptor "Incluir pasados": sección "Anteriores", de más reciente a más antiguo.
- Filtros de tipo y categoría aplican igual.

## 6. Escudos (en toda la app)
Con imagen: escudo completo, sin fondo, sin borde ni recorte, centrado en caja cuadrada (24/36/56 px). Sin imagen: círculo con iniciales. Se unifican los dos componentes de escudo y se revisa Agenda, Coordinación (General y Técnica) y Viajes.

## 7. Pruebas (tocando en 375 × 667)
Las 7 del documento, una por una, con datos temporales solo cuando haga falta (sin avisos a nadie real, borrados al final), y las 5 capturas pedidas. Sin errores de TypeScript; pruebas de las funciones de fechas.

## Detalles técnicos
- `validateSearch` con `fallback()` en `m.agenda.tsx`; validación/clamp de la fecha dentro del componente.
- Funciones puras nuevas en `src/lib/agenda.ts`: `weekRange`, `monthGrid`, `dotsForDay`, `nextEventAfter`, `groupByMonthDay`, con pruebas.
- Nuevos `WeekView`, `MonthView`, `ListView`, `ViewSwitch` en `src/components/agenda/`; `WeekStrip` se reescribe con flechas y gesto.
- Lista: paginación local por meses con IntersectionObserver sobre los eventos que ya devuelve `useCalendarEvents` (mismo filtro `isAgendaVisible`).
- `src/components/match/TeamCrest.tsx` y `src/components/torneo/TeamCrest.tsx`: misma presentación (`object-contain`, sin aro).
- `m.mes.tsx` pasa a ser una redirección conservando parámetros.

# Entrenamientos: biblioteca visual y sesión como plan profesional

El módulo ya funciona (biblioteca + sesiones ligadas a eventos). El trabajo es de presentación y de detalle del plan, con el mismo estándar visual de Usuarios / Salud / Desarrollo. La RLS de los 6 niveles no se toca.

## 1. Series y repeticiones (único cambio de datos)

Hoy cada ejercicio dentro de una sesión solo guarda notas y una duración alternativa. Para que la tarjeta muestre "3 series x 12 reps · 8 min" se añaden a la relación sesión-ejercicio dos campos opcionales: series y repeticiones. También se añaden a la biblioteca como valores sugeridos del ejercicio (series y reps por defecto), que se copian al agregarlo a una sesión y se pueden ajustar ahí.

Nada más cambia en la base: sin tocar políticas de acceso ni funciones ya migradas.

## 2. Biblioteca de ejercicios

- Tarjetas visuales en rejilla: miniatura de la imagen del ejercicio (o icono por tipo cuando no hay media), nombre, chip de tipo, duración y series/reps si existen, y el objetivo en una línea recortada. Chip "Club" o el nombre de la categoría para dejar claro el alcance.
- Filtros estándar como en Salud: buscador + botón "Filtrar" con contador, que agrupa tipo de ejercicio, alcance (Club / mi categoría) y "con material" / "con imagen". Se eliminan los chips sueltos actuales.
- Sheet de detalle en lectura con secciones e iconos: media arriba a tamaño completo, Objetivo, Descripción, Material necesario, Duración/series/reps, Alcance y quién lo creó. Botón "Editar" solo si el usuario es editor de ese alcance.

Alcance de la biblioteca: se mantiene mixta tal como está hoy. Los ejercicios sin categoría son del club y los ve cualquiera con acceso al módulo; los ejercicios con categoría solo los ven quienes leen esa categoría. Editar un ejercicio de club exige editor global; editar uno de categoría, editor de esa categoría.

## 3. La sesión como plan de entrenamiento

- Cabecera de la sesión al estilo de las fichas: título, fecha, categoría, chip de "ligada al calendario" y totales del plan (número de ejercicios y minutos sumados).
- El plan se muestra por fases en secuencia — Calentamiento, Parte principal, Vuelta a la calma — cada fase con su icono, su duración total y numeración continua.
- Cada ejercicio es una tarjeta con miniatura, nombre, tipo, y una fila de chips con duración, series y reps; debajo objetivo, descripción, material y el ajuste específico de esa sesión resaltado. La media pasa a abrirse al tocar, no ocupa la tarjeta entera.
- Si la sesión no tiene ejercicios, estado vacío con acción "Agregar ejercicios" para editores.
- En el formulario de sesión, cada ejercicio agregado gana campos de series y reps junto a la duración, y se conserva el orden y el movimiento arriba/abajo actuales.

## 4. Lista de sesiones

Tarjetas más informativas: fecha grande, título, categoría, objetivo recortado, y un resumen del plan (ejercicios y minutos) más los chips de fases que contiene. Se mantiene la separación Próximas / Pasadas, y el buscador + "Filtrar" (categoría, con plan / sin plan, ligadas a calendario) sustituye al buscador suelto.

## 5. Calendario

El detalle del evento de tipo entrenamiento ya consulta la sesión ligada y renderiza el plan compartido; al mejorar el componente del plan, el evento hereda automáticamente las tarjetas con fases, series y reps. Se mantiene el botón de crear/editar plan según permisos. Las fechas siguen guardándose y comparándose en timestamptz: la sesión toma la hora del evento ligado.

## 6. Permisos en la interfaz

- Vista Jugador y Lector: sin botones de crear/editar, sin FAB; ven sesiones de su categoría y la biblioteca en consulta.
- Editor de categoría: crea y edita sesiones y ejercicios de sus categorías.
- Editor global: todo el club, incluida la biblioteca de club.

Todo se resuelve con los ayudantes de permisos ya existentes por equipo; no se agregan reglas nuevas.

## Detalles técnicos

- Migración: `session_exercises.sets`, `session_exercises.reps` (integer, nulos) y `exercises.default_sets`, `exercises.default_reps`. Sin cambios de RLS ni de grants.
- Nuevos: `src/components/entrenamientos/TrainingPieces.tsx` (tarjeta de ejercicio, chip de fase, miniatura con media firmada, resumen del plan) y `EntrenamientosFilters.tsx` (patrón de `SaludFilters`).
- Modificados: `SessionPlanContent.tsx` (fases con totales y tarjetas nuevas), `ExerciseDetailSheet.tsx`, `SessionDetailSheet.tsx`, `SessionFormDialog.tsx` (series/reps), `m.entrenamientos.tsx` (tarjetas y filtros), `useTraining.ts` (tipos y campos nuevos).
- `EventDetailSheet.tsx` no requiere cambios: reutiliza `SessionPlanContent`.

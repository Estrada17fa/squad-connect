# El plan de entrenamiento dentro del detalle del evento

Abrir un entrenamiento en la Agenda mostrará en un solo lugar: cuándo, dónde, quién va y el plan con los ejercicios explicados.

## 1. Extraer el bloque del plan

Se crea `SessionPlanContent`, que recibe la sesión y muestra exactamente lo que hoy se ve en la sheet de sesión: objetivo, ejercicios agrupados por fase (calentamiento / principal / vuelta a la calma) con su duración, materiales, ajustes, explicación y media, más las notas.

`SessionDetailSheet` pasa a renderizar ese componente en lugar de su código actual, así que su aspecto no cambia. La convocatoria y la cabecera con "Editar sesión" se quedan en la sheet, no dentro del contenido del plan (el evento ya muestra su propia convocatoria).

## 2. Detalle del evento

Cuando el evento es de tipo `entrenamiento`, el detalle consulta la sesión ligada por `event_id` con el hook que ya existe para eso, y debajo de la convocatoria muestra:

- Con sesión: el plan completo mediante `SessionPlanContent`. Si el usuario puede editar entrenamientos en ese equipo, aparece un botón "Editar plan" que abre el formulario de sesión en edición; al guardar se vuelve al detalle del evento con el plan ya actualizado.
- Sin sesión y con permiso de editor: botón "Agregar plan de entrenamiento", que abre el formulario de sesión nueva con la fecha, el equipo y el evento ya ligados. Al crearla, el plan aparece dentro del mismo detalle.
- Sin sesión y sin permiso: texto discreto "Sin plan de entrenamiento aún".

Todo ocurre dentro de la misma sheet del evento: no se abre otra encima.

## 3. Agenda, Mes y Día

Se elimina el botón "Ver plan del entrenamiento" que hoy aparece bajo las tarjetas de Agenda y del día, junto con el componente que abría la sesión como sheet separada. El acceso al plan es abrir el evento.

## 4. Módulo Entrenamientos

Se mantiene `SessionDetailSheet` como está (misma entrada desde la lista de sesiones), pero ya usando `SessionPlanContent`, de modo que la vista del plan es idéntica en ambos lados y no hay código duplicado.

## Detalles técnicos

- Nuevo: `src/components/entrenamientos/SessionPlanContent.tsx` — mueve `PHASES`/`PlanItem`/`ExerciseMedia` y el uso de `useSessionPlan`, con prop `readOnly` reservada para acciones futuras.
- Modificados: `SessionDetailSheet.tsx` (usa el nuevo componente), `EventDetailSheet.tsx` (usa `useSessionByEvent` + `useTeamAccess("entrenamientos")` y monta `SessionFormDialog` para crear/editar), `m.agenda.tsx` y `DaySheet.tsx` (quitan el botón).
- Eliminado: `src/components/entrenamientos/TrainingPlanButton.tsx`.
- Sin cambios en la base de datos.

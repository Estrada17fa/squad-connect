# Viajes: tramo fijo por pestaña y auditoría de botones

## 1. El tramo ya no se elige a mano

Al agregar un vuelo o un transporte desde la pestaña **Ida**, el registro se crea como Ida; desde **Regreso**, como Regreso. Se quita el selector "Tramo" del formulario de alta y en su lugar se muestra el tramo como dato fijo (etiqueta de solo lectura, p. ej. "Tramo: Ida").

Al **editar** un vuelo o transporte existente, el tramo también se muestra fijo con el valor que ya tiene: si se quiere mover al otro tramo, se elimina y se vuelve a crear en la pestaña correcta. Esto evita que un elemento desaparezca de la pestaña desde donde se está editando.

## 2. Agregar vuelo no guarda

Aún no está confirmada la causa: la tabla de vuelos está vacía (0 registros), los permisos de base de datos para crear vuelos están correctamente definidos, y el formulario, a nivel de código, envía los datos que la tabla espera. El fallo puede estar en la validación del formulario, en un error silencioso al guardar o en el sheet anidado dentro del detalle del viaje.

Por eso el primer paso es **reproducirlo**: abrir un viaje en el preview, intentar agregar un vuelo y observar el error real (consola / respuesta del servidor). Con la causa a la vista se aplica el arreglo puntual, y además se refuerza el formulario para que nunca falle en silencio:

- Mensaje de error visible siempre que el guardado falle (no solo un toast que puede pasar desapercibido).
- Botón "Agregar vuelo" con estado "Guardando…" mientras se procesa.
- Cerrar el formulario solo cuando el guardado realmente se confirmó.

## 3. Auditoría de todos los botones del módulo Viajes

Recorrido botón por botón, verificando que cada acción guarde de verdad y que se muestre solo a quien tiene permiso (editores del viaje gestionan; Lector Global solo ve; Vista Jugador / Lector Categoría no entran al módulo):

- Pestañas Ida / Regreso: agregar y editar transporte, agregar y editar vuelo, asignar pasajeros, responsables de documentar maletas, pases de abordar (carga manual, auto-reparto, ver/descargar, eliminar).
- Pestaña General: hoteles, habitaciones y ocupantes, comidas, equipaje por persona, material del club (préstamo y devolución), documentos del viaje.
- Detalle del viaje: editar viaje, convocatoria (agregar/quitar convocados), eliminar.

Para cada botón que resulte roto se corrige la causa concreta y se deja el mismo comportamiento: confirmación al guardar, error visible al fallar, y ocultarse cuando el usuario no puede editar.

## Notas técnicas

- `FlightFormDialog.tsx` y `TransportFormDialog.tsx`: se elimina el `Select` de tramo; el valor viene de la prop `defaultLeg` (alta) o del registro (edición).
- Sin cambios de esquema ni de RLS.
- La auditoría se hace ejecutando el flujo real en el preview, no solo por lectura de código.

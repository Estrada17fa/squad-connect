# Abrir = ver, editar = acción deliberada

## Respuesta a tu pregunta

Sí hay una base compartida, pero **solo resuelve el contenedor visual**: `EntitySheet` (cabecera / cuerpo / pie, bottom-sheet en móvil, panel lateral en escritorio). No sabe nada de modos ni de permisos, así que el cambio no se hereda solo. La solución es:

1. Añadir el comportamiento (modo lectura por defecto + botón "Editar" + volver a lectura al guardar/cancelar) **una sola vez** en un componente nuevo sobre `EntitySheet`.
2. Recorrer módulo por módulo y conectar cada detalle a ese componente, creando la vista de lectura donde hoy no existe.

Hoy la app está mitad y mitad: unos módulos ya tienen ficha de lectura (tareas, juntas, solicitudes, viajes, gastos, préstamos, lesiones, sesiones) y otros abren el formulario directo al hacer clic en la tarjeta (desarrollo, inventario, revisiones médicas, documentos, eventos, casi toda la logística de viajes).

## Base compartida nueva

- `DetailSheet` sobre `EntitySheet`: mantiene el modo (`ver` / `editar`), muestra el botón "Editar" arriba solo si `canEdit`, y expone `onDone()` para que el formulario vuelva a lectura tras guardar. "Cancelar" siempre regresa a lectura sin cambios.
- Primitivas de lectura: `DetailSection`, `DetailField` (etiqueta + valor), `DetailList`, `DetailEmpty`. Ficha legible con secciones, nunca inputs deshabilitados.
- Regla de acciones: eliminar, aprobar/rechazar, cambiar estado, devolver, marcar disponibilidad, etc. se quedan en el modo lectura según permiso. Solo la edición de campos pasa por el botón.

## Sheets que voy a ajustar

**Ya tienen lectura — se les mueve el formulario dentro del sheet y se unifica el botón "Editar"**
- Coordinación: tareas, juntas
- Solicitudes: detalle de solicitud
- Compras: gasto (y proveedor, que hoy abre en formulario)
- Inventario: préstamo
- Salud: lesión
- Entrenamientos: sesión
- Viajes: viaje
- Plantel: ficha de jugador (página, ya tiene botón; se homogeniza)

**Hoy abren directamente en formulario — se les crea la ficha de lectura**
- Desarrollo: feedback, objetivo, evaluación, rutina, asignación de rutina
- Inventario: artículo del catálogo
- Salud: revisión médica, perfil médico
- Documentos: documento
- Calendario: evento (desde vista Mes y desde el día)
- Entrenamientos: ejercicio de la biblioteca
- Viajes / logística: vuelo, hotel, habitación, transporte, comida, equipaje de material, pase de abordar, documentación de maletas, documentos del viaje

**Sin cambios (no son detalle de un elemento)**
- Creación nueva desde el botón "+" (entra directo en formulario, es lo correcto)
- Diálogos de asignación puntual (pasajeros, ocupantes, devolución parcial), selectores y previsualización de documento
- Alta de miembros en Usuarios

## Notas técnicas

- El permiso de edición se sigue resolviendo con lo que ya existe: `useTeamAccess` / `useEditableTeams` para módulos de ámbito equipo y el nivel de módulo (`editor` / `approver`) para los de club; el detalle solo consume el booleano, no cambia ninguna regla ni RLS.
- Los `*FormDialog` actuales se reutilizan como cuerpo del modo edición; se les añade `onSaved` para devolver el sheet a lectura en lugar de cerrarlo. Se conserva su validación y mutaciones tal cual.
- En las listas, el clic en la tarjeta abre siempre el detalle; los lápices que hoy abren el formulario directo se retiran o pasan a abrir el detalle.
- Sin cambios de base de datos.

# Agregar junta en ventana desde abajo (como Nueva tarea)

Solo cambia cómo se abre el formulario para **agregar** una junta. Nada más.

## Qué cambia
- En la pestaña Juntas, el "+" abre el formulario en una ventana que sube desde abajo, igual que "Nueva tarea", sin salir de la lista.
- Mismos campos que hoy: título, fecha, inicio y fin, lugar, categoría, invitados y orden del día. El botón "Crear junta" va al final del formulario, como en tareas.
- Al crear, se cierra la ventana y se abre la ficha de la junta nueva (como ahora).
- La dirección vieja de "nueva junta" sigue funcionando: abre la lista de Juntas con la ventana ya abierta.

## Qué no cambia
- Editar junta, la ficha, el modo junta, avisos, permisos y la base de datos se quedan igual.

## Detalles técnicos
- MeetingForm recibe un modo "en ventana" (botón al final, sin barra fija) y un aviso al terminar.
- Nuevo MeetingFormSheet con el mismo Sheet que TaskFormSheet; la lista lo abre con el "+".
- La ruta /coordinacion/general/juntas/nueva redirige a /coordinacion/general/tareas?tab=juntas&nueva=1, que abre la ventana.

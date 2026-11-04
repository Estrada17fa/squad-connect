# Alta de miembro en 4 pasos con datos obligatorios

Solo cambia la presentación y la validación en la pantalla. Las funciones del servidor y la base de datos se quedan igual, y no se agregan columnas.

## Campos obligatorios
- Obligatorios: nombre, apellido paterno, correo, teléfono, fecha de nacimiento, lugar de nacimiento, nacionalidad, nombre y teléfono del contacto de emergencia, y categoría con rol.
- Opcionales: apellido materno y foto. Su etiqueta dirá "(opcional)" y se quitan todos los asteriscos.
- En Editar se aplican las mismas reglas, pero un miembro existente con datos vacíos muestra "Falta completar" en ese campo. Eso no impide guardar otros cambios. Solo se marca error si alguien borra un campo que ya tenía dato.

## Los 4 pasos (cada uno cabe en 375 × 667 sin scroll)
1. **Persona:** foto en círculo de 72 px con cámara y el texto "Agregar foto (opcional)" a la derecha. Luego nombre, los dos apellidos en dos columnas, fecha de nacimiento con el selector de la app, lugar de nacimiento y nacionalidad en una lista con búsqueda ("Mexicana" por defecto).
2. **Contacto:** correo con teclado de correo y teléfono con lada +52 editable y formato automático. Abajo, un título pequeño "Contacto de emergencia" con nombre y teléfono.
3. **Categorías:** igual que ahora (interruptor "Todas las categorías" o categorías con rol y puesto).
4. **Acceso:** igual que ahora (contraseña temporal) y la pantalla "Listo".

## Diseño
- Encabezado fijo y compacto con "‹ Usuarios" y "Nuevo miembro", y debajo una barra de progreso delgada con "Paso X de 4 · Nombre del paso". Se quita la fila de círculos numerados.
- Campos rellenos con el color de superficie, sin borde, de unos 44 px y con la etiqueta pequeña arriba. No hay tarjeta grande que envuelva todo.
- El botón "Siguiente" queda fijo abajo a todo lo ancho, deshabilitado hasta completar el paso. Desde el paso 2, "Atrás" aparece como texto a su izquierda.
- Los errores son cortos, van debajo de cada campo y aparecen solo al salir del campo o al intentar avanzar.
- La tecla "siguiente" del teclado pasa al próximo campo, y el teclado cambia según el tipo de dato (correo, teléfono, texto).

## Entrega
Capturas a 375 × 667 de los 4 pasos y de un paso con un error visible, sin crear ningún miembro real.

## Detalles técnicos
- `PersonFields.tsx`: se divide en las secciones `persona` y `contacto`, con estado de campos visitados (touched), `enterKeyHint`/`inputMode`/`autoComplete`, un selector de nacionalidad con búsqueda (Popover + Command) y formato de teléfono (se guarda como "+52 …" en el mismo campo `phone`).
- `personErrors(data, {mode: "create" | "edit", initial})` se divide por paso. En el modo edit solo da error si el campo tenía valor al inicio. `personPayload` no cambia.
- `administracion.usuarios.nuevo.tsx`: 4 pasos, nuevo componente `StepProgress` en `ui.tsx` y "Siguiente" deshabilitado según `stepErrors`.
- `administracion.usuarios.$userId.editar.tsx`: usa el modo edit y la etiqueta "Falta completar".
- El formato del teléfono no rompe el enlace de WhatsApp: el helper ya quita lo que no es dígito, y se va a revisar que no duplique el 52.

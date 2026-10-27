# Verificar los 5 arreglos de permisos y navegación

Los 5 puntos del documento ya están aplicados en el código (Viajes, Compras, Documentos en Coordinación, Tácticas fuera, Mes como alias de Agenda). Este plan solo comprueba que funcionan y corrige lo que falle. No cambia el modelo de permisos.

## Pasos
1. Revisar los archivos uno por uno contra el documento y hacer los ajustes pequeños que falten. Por ejemplo, la descripción de Agenda debe decir "Lista y vista mensual de eventos" y la de Mes en el encabezado de admin.index.tsx debe ser la correcta.
2. Correr las 8 pruebas en el navegador con usuarios reales de cada rol (Staff, Jugador, Técnico, Admin), de dos formas: con "Ver como" e iniciando sesión con esos usuarios.
   1. Staff ve Coordinación › Viajes con solo su categoría y puede editar.
   2. Jugador no ve Coordinación › Viajes, pero sí su viaje en Agenda.
   3. Staff abre Compras y puede crear un gasto. Técnico no ve la pestaña.
   4. Técnico ve Coordinación › Documentos. Admin sigue viendo Usuarios.
   5. Tácticas no aparece en ningún lado.
   6. Técnico crea y edita eventos desde Agenda y desde Mes. Jugador solo puede verlos.
   7. Las matrices no muestran Mes ni Tácticas, y muestran Documentos bajo Coordinación.
   8. No hay errores y ninguna pestaña lleva a "Sin acceso".
3. Entregar el resultado de cada prueba con capturas, junto con la lista de archivos que se tocaron.

## No se toca
La escala de 6 niveles, get_my_access, effective_permission, las reglas de la base de datos y los permisos guardados.

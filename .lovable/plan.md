# Verificación antes de publicar

## 1. Arreglo de Viajes
`canManageTripsModule` pasará a permitir Ver (lector_categoria) y Editar (editor_categoria) y los niveles globales; seguirá bloqueando Sin acceso y vista_jugador. Solo cambia esa línea.

## 2. Tareas y Juntas
Revisar el registro de errores de compilación y los archivos de Tareas/Juntas; terminar o revertir cualquier cambio a medias. Sin cambios a la base de datos.

## 3. Prueba con sesión real (celular)
Crear usuarios temporales (Admin no super admin, Staff, Jugador) con membresías por categoría, más un viaje con convocatoria de prueba si hace falta:
- Admin: Inicio, Agenda, Mi Club, Coordinación, Administración; abrir Viajes y editar un viaje.
- Staff: abrir Viajes y editar.
- Jugador: Inicio, Agenda › Viajes (su viaje y pase), Mi Club, Partidos (convocatoria).
- Cerrar sesión y volver a entrar: no aparece "No tienes categorías asignadas".
Al final borrar usuarios, viajes y datos de prueba.

## 4. Revisión de TypeScript
Confirmar sin errores. Responder "listo para publicar" o qué falló. No publico.

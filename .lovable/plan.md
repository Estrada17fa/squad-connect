# Corregir la opción Viajes en permisos de Usuarios

## Objetivo
Hacer que **Viajes** aparezca y pueda configurarse exactamente igual que los demás módulos, tanto en los permisos base de un rol como en los permisos personalizados de un miembro.

## Estado verificado
- `viajes` sí forma parte del catálogo general de módulos.
- La base de datos sí tiene una fila `viajes` para los cinco roles del club.
- El componente de permisos por rol y el de ajustes individuales recorren el catálogo general, no solo las filas recibidas de la base.
- En la vista activa del navegador, la fila **Viajes** se está renderizando dentro del grupo **Coordinación**. Por tanto, no corresponde volver a sembrar la fila ni cambiar el `module_key`; hay una discrepancia de presentación/flujo que debe reproducirse en la ruta exacta usada por el usuario.

## Cambios
1. Unificar ambas matrices —rol y miembro individual— sobre una única lista de grupos y módulos, garantizando que `viajes` nunca pueda quedar excluido por rol base, página apagada, datos todavía cargando o ausencia temporal de una fila.
2. Mantener **Viajes** visible dentro de **Coordinación**, con su selector de los seis niveles, aun cuando Coordinación esté desactivada.
3. En la ficha individual, mostrarlo dentro de **Ajustes avanzados → Excepciones de permisos** para cada membresía, con el mismo selector y opción de restablecer al rol.
4. Corregir la invalidación/caché después de guardar para que el valor de Viajes aparezca inmediatamente y no requiera recargar o cambiar de rol/miembro.
5. Añadir una comprobación automatizada del catálogo completo para evitar que Viajes u otro módulo vuelva a desaparecer de cualquiera de las dos matrices.

## Verificación
- Probar en móvil la ruta `Usuarios → Roles` con Admin, Técnico, Médico, Staff y Jugador: Viajes debe aparecer en todos.
- Probar `Usuarios → Miembros → usuario → Ajustes avanzados` en una membresía de club y una de equipo: Viajes debe aparecer y guardar los seis niveles.
- Apagar Coordinación y confirmar que sus filas, incluida Viajes, siguen visibles y configurables.
- Cambiar Viajes, guardar y comprobar que el valor efectivo y la navegación se actualizan sin recargar.

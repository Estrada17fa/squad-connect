# Selector de jugador por categoría con buscador

Hoy los formularios de Salud usan un `<select>` plano con todos los jugadores del club mezclados. Se sustituye por un componente reutilizable en dos pasos: primero categoría, luego búsqueda por nombre dentro de esa categoría.

## Componente nuevo: PlayerPicker

Ubicación: `src/components/squad/PlayerPicker.tsx` (compartido, no específico de Salud).

Flujo:

```text
[ Categoría v ]  ->  [ Buscar jugador... ]  ->  lista filtrada -> elegir
                                                (avatar, nombre, dorsal/posición)
```

Comportamiento:
- Paso 1: selector de categoría con solo las categorías permitidas. Si el usuario tiene acceso a una sola, se preselecciona y el selector se muestra deshabilitado.
- Paso 2: campo de búsqueda que filtra por nombre en vivo (sin acentos/mayúsculas) dentro de la categoría elegida.
- Paso 3: lista corta y desplazable con avatar, nombre, dorsal y posición; al elegir queda una fila resumen con el jugador seleccionado y un botón "Cambiar".
- Estado ya elegido (editar un registro existente): se muestra el resumen bloqueado, igual que hoy con `disabled`.
- Vacíos: "No hay categorías donde puedas registrar información" / "Ningún jugador coincide".
- Sin emojis; iconos lucide y tokens del sistema, mismo estilo que los filtros de Usuarios/Plantel.

API: `players` (lista ya filtrada por permisos), `value`, `onChange`, `disabled`, `label`. El componente agrupa internamente por `teamId`/`teamName`, así sirve tal cual para cualquier módulo que reciba un roster con esos campos.

## Permisos

No se cambia la lógica de permisos: cada pantalla ya calcula su roster editable (en Salud, `editablePlayers`, derivado de los equipos donde el usuario puede editar el módulo). El picker solo deriva las categorías de esa lista, así que un editor de categoría ve solo las suyas y un editor global las ve todas.

## Dónde se aplica (Salud)

- `InjuryFormDialog` (lesión)
- `CheckupFormDialog` (revisión)
- `AppointmentFormDialog` (cita)
- Receta y cambio de estado dentro de `PlayerHealthSheet`: allí el jugador ya viene fijado por la ficha, así que solo se muestra el resumen del jugador (sin selector), y el picker se usa si se abre el formulario desde el panel general.
- `MedicalProfileDialog` (perfil médico): recibe el jugador desde la ficha; se muestra el resumen.

## Reutilización

`src/components/desarrollo/PlayerSelect.tsx` pasa a ser un envoltorio del nuevo `PlayerPicker` para que Desarrollo herede el mismo flujo sin tocar sus pantallas.

## Notas técnicas

- Solo frontend; sin migraciones ni cambios de datos.
- Se mantiene el contrato actual (`value` = `user_id`) para no tocar mutaciones.

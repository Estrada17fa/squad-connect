# Arreglo: no se puede publicar un comunicado

## Qué está pasando

Al guardar, el archivo adjunto sube bien, pero la creación del comunicado falla con:

`new row violates row-level security policy for table "announcements"` (403)

Confirmado en las peticiones reales del preview: el usuario es Admin con nivel `editor_global` en comunicados, su club coincide y el autor es él mismo, así que la regla de escritura sí se cumple. El bloqueo viene de la regla de **lectura**.

La regla de lectura actual llama a una función que vuelve a consultar la tabla `announcements` buscando el propio comunicado. Como el registro se está insertando en ese mismo instante, esa consulta interna todavía no lo ve, la lectura da "no", y Postgres rechaza la operación completa cuando la app pide de vuelta el registro recién creado. El mismo problema afecta a los comunicados dirigidos a categorías: sus categorías se guardan después, así que en el momento de crearlo tampoco "califican" para verse.

## Solución

Una migración que reescribe las reglas de acceso de `announcements` para que evalúen la fila directamente, sin volver a leer la tabla:

- **Ver**: puede verlo quien es el autor, o quien tiene lectura del módulo cuando va dirigido a todo el club, o quien tiene acceso a alguna de las categorías destinatarias.
- **Editar / eliminar**: el autor, quien tiene permiso global de edición en comunicados, o quien puede editar todas las categorías destinatarias.
- **Publicar**: se mantiene igual (autor = usuario, club propio, y para "todo el club" se exige nivel global de edición).

No cambia nada del comportamiento esperado del módulo: sólo deja de fallar en el momento de la creación y garantiza que el autor siempre pueda ver y gestionar lo que publicó.

## Detalles técnicos

- Reemplazar `announcements_select`, `announcements_update`, `announcements_delete` por políticas con expresiones en línea sobre `announcements` (columnas `audience`, `author_id`, `club_id` + `EXISTS` sobre `announcement_teams`), eliminando la autoconsulta de `can_view_announcement` / `can_edit_announcement` en esas políticas.
- Mantener `can_view_announcement` / `can_edit_announcement` como funciones (las usan `announcement_reads` y `announcement_teams`), pero añadiendo la condición de autor para consistencia.
- Sin cambios en el frontend.

## Verificación

Publicar un comunicado a todo el club (con y sin adjunto) y otro dirigido a una categoría, y confirmar que aparecen en el tablón y que el resto de usuarios los ve según su categoría.

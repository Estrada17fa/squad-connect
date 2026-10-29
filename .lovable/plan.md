# Reorganizar Coordinación, roles y permisos

## Idea central (para no romper nada)
Hoy la base de datos tiene 6 niveles y todas sus reglas de seguridad dependen de ellos. En lugar de reescribir esas reglas (riesgoso), **la app solo mostrará 3 niveles y por dentro los traducirá** a los que ya existen:

```text
Sin acceso  -> sin_acceso
Ver         -> lector_categoria
Editor      -> editor_categoria
```

Así las reglas actuales siguen funcionando igual, y "solo tus categorías asignadas" sale gratis: los niveles "categoría" ya limitan a las categorías de la persona. Los niveles globales dejan de existir en la interfaz y los valores guardados se convierten a su equivalente por categoría.

Para ver todas las categorías, la persona necesita la membresía "Todo el club" (así funcionará el Admin). Es la única forma de tener alcance total: clara y difícil de romper.

## 1. Menú y página Admin
- La página Admin (solo super admin) se mueve junto a Mi perfil, en la pestaña "yo". Sale del menú principal.
- Menú principal fijo: **Inicio, Agenda, Mi Club, Coordinación** (Coordinación solo si tiene acceso a al menos un módulo).
- Inicio, Agenda y Mi Club pasan a ser **solo lectura para todos**. Por ahora muestran lo que ya muestran; después definimos qué va en cada una.

## 2. Coordinación con 5 áreas
Dentro de Coordinación habrá pestañas o tarjetas por área. Cada área y cada módulo solo aparecen si el usuario tiene acceso; los demás se recorren sin dejar huecos. Si un área se queda vacía, no se muestra.

| Área | Módulos |
|---|---|
| General | Tareas y juntas, Comunicados, Multimedia, Solicitudes |
| Administrativa | Finanzas (nuevo), Compras (nuevo), Documentos (sale de Admin) |
| Operacional | Operación de partido (nuevo), Viajes, Inventario |
| Técnica | Entrenamientos, Partidos (convocatorias), Desarrollo (nuevo), Plantel (nuevo), Torneo (nuevo) |
| Médica | Salud (nuevo), Nutrición (nuevo) |

- Los módulos que ya existen se mueven tal cual, con su funcionalidad actual.
- Los marcados "nuevo" serán una página vacía con el aviso "En desarrollo". Las páginas actuales de Salud, Nutrición, Desarrollo, Plantel y Torneo se quedan guardadas (no se borran datos) y se sustituyen por la versión vacía hasta que las diseñemos. **Dime si prefieres conservar alguna tal cual.**
- Compras: el módulo actual "Compras y facturas" se queda guardado y la nueva entrada aparece vacía (lo mismo con Finanzas).
- Documentos deja de ser exclusivo del super admin y se controla con los permisos normales.

## 3. Permisos de módulos
- **Módulos de Coordinación:** Sin acceso / Ver / Editor.
- **Inicio, Agenda, Mi Club:** sin permisos, siempre de lectura.
- **Usuarios** (y cualquier otro fuera de Coordinación): solo Con acceso / Sin acceso.
- **Roles (Admin, Técnico, Médico, Staff, Jugador…):** la matriz de roles muestra solo esos 3 niveles y funciona como valor por defecto.
- **Miembros:** en la ficha de cada usuario se puede cambiar el nivel por módulo para esa persona sin afectar a las demás del mismo rol. Se quita el ajuste "por categoría" dentro de un mismo módulo: es la fuente principal de confusión hoy. El nivel aplica a todas las categorías asignadas.
- **Sin categorías asignadas:** se queda el aviso actual "No tienes categorías asignadas" y todo cuenta como Sin acceso.

## 4. Valores por defecto sugeridos (los puedes cambiar después)
- Admin: Editor en todo (con "Todo el club").
- Técnico: Editor en Técnica y General; Ver en Operacional.
- Médico: Editor en Médica; Ver en General.
- Staff: Editor en Operacional; Ver en General.
- Jugador: Ver en Comunicados y Multimedia; Sin acceso en lo demás.

## Mejoras que recomiendo
- Un solo lugar define qué módulos hay y en qué área están. Agregar o mover un módulo será cambiar una línea.
- Ya no habrá "páginas por rol" fijas: lo que ves sale únicamente de tus permisos. Así hay menos combinaciones que puedan fallar.
- Junto con esto se corrigen dos puntos pendientes del diagnóstico anterior: un editor de categoría ya no podrá editar registros de "Todo el club" ajenos en Tareas y Solicitudes, y Compras dejará de exigir nivel global.

## Detalles técnicos
- Se mantiene el enum `permission_level`. La interfaz traduce 3 niveles a sin_acceso / lector_categoria / editor_categoria. La migración convierte lector_global → lector_categoria, editor_global → editor_categoria y vista_jugador → lector_categoria en `role_permissions` y `user_permission_overrides`. Los overrides que tienen `team_id` se colapsan a una sola fila por módulo, con el nivel más alto.
- Se añaden nuevas claves de módulo: finanzas, compras, operacion_partido y las versiones nuevas de salud, nutricion, desarrollo, plantel y torneo. Se insertan filas por defecto en `role_permissions` para cada rol de cada club.
- `src/lib/modules.ts` gana un campo `area` y un `kind` ("coord" de 3 niveles / "toggle"). `rolePages.ts` se reduce a las 4 páginas fijas. `coordinacion.tsx` agrupa por área según `get_my_access`, que sigue siendo la única fuente de permisos.
- `/admin` se enlaza desde `/mi-perfil` y queda protegido por `is_super_admin`. La ruta `/m/documentos` se mueve fuera de Admin.
- Ajustes de RLS: `coord_scope_ok` y `request_scope_ok` exigen membresía "Todo el club" para filas con team_id NULL ajenas. La política de compras acepta nivel de categoría.
- Las pruebas cubren la traducción de niveles y que un módulo Sin acceso no aparezca en el menú.

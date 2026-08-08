# Parte 1 — Base del nuevo sistema de permisos

Solo la base: nueva escala de niveles, catálogo de módulos por tipo, cómo se guardan, migración de lo existente y funciones helper. No se toca la UI de crear usuario ni la RLS de cada módulo (Partes 2 y 3).

## 1. Nueva escala

Nuevo tipo en la base de datos `permission_level` con 6 valores, en orden de menor a mayor:

```text
sin_acceso < lector_personal < lector_categoria < lector_global < editor_categoria < editor_global
```

Nota de orden: `lector_global` se considera menor que `editor_categoria` para "poder de escritura", pero mayor en "alcance de lectura". Por eso el nivel efectivo no se resuelve con un solo número: se resuelve con dos ejes derivados del nivel — **alcance** (personal / categoría / global) y **capacidad** (nada / leer / editar). Esa descomposición vive en una función auxiliar y evita comparaciones ambiguas.

El tipo viejo `access_level` (none/read/editor/approver) se conserva durante la Parte 1 y se elimina al cerrar la Parte 3, cuando ya nada lo use.

## 2. Catálogo de módulos por tipo

Se declara el tipo de cada módulo en dos lugares espejo (misma verdad):

- Código: `src/lib/modules.ts` gana `permissionType: "personal" | "categoria" | "club"` por módulo y un helper `levelsForModule(key)` que devuelve los niveles ofrecidos.
- Base de datos: tabla nueva `module_catalog` (module_key, permission_type, label, orden) para que las funciones SQL y la RLS validen niveles sin duplicar listas en cada policy.

Clasificación:

| Tipo | Módulos | Niveles ofrecidos |
| --- | --- | --- |
| personal | salud, desarrollo, nutricion | los 6 |
| categoria | plantel, entrenamientos, tacticas, torneo, comunicados, viajes, multimedia, agenda, mes | todos menos `lector_personal` |
| club | inventario, compras_facturas, documentos, solicitudes, coordinacion_interna, usuarios | `sin_acceso`, `lector_global`, `editor_global` |

Dos aclaraciones sobre esa tabla:

- `agenda`, `mes`, `viajes`, `multimedia` no aparecían en tu lista; hoy son de ámbito equipo/mixto, así que quedan como **categoría**. Si prefieres alguno como club, se cambia en una línea del catálogo.
- Para módulos de club se reutilizan los valores `lector_global` / `editor_global` como "Lector" y "Editor" (la UI los muestra con esas etiquetas). Así no se inventan valores duplicados y la resolución es la misma en todos los casos.
- `torneo` se clasifica como **categoría** porque un torneo pertenece a una categoría; si en la práctica es del club, se ajusta en el catálogo.

Regla dura: guardar un nivel no ofrecido por el tipo del módulo se rechaza con un CHECK/trigger contra `module_catalog`.

## 3. Cómo se guardan los permisos

Se mantienen las tablas actuales, cambiando la columna de nivel:

- `role_permissions(role_id, module_key, level permission_level)` — se agrega la columna nueva `level`, se llena por migración y se deja de escribir `access_level`.
- `user_permission_overrides(user_id, team_id, module_key, level permission_level)` — misma operación. `team_id NULL` = override de ámbito club.

No cambia la forma de las asignaciones: `team_memberships` (persona ↔ equipo ↔ rol) ya soporta varias asignaciones por persona; una asignación de un rol a varias categorías son varias filas con el mismo `role_id`. El admin es la fila con `team_id NULL` y rol de base `admin` (Editor Global).

## 4. Migración de lo existente

Traducción determinista, aplicada por tipo de módulo:

| Valor viejo | Módulo personal | Módulo categoría | Módulo club |
| --- | --- | --- | --- |
| `none` | sin_acceso | sin_acceso | sin_acceso |
| `read` | lector_categoria | lector_categoria | lector_global (Lector) |
| `editor` | editor_categoria | editor_categoria | editor_global (Editor) |
| `approver` | editor_categoria | editor_categoria | editor_global |

Excepciones y refuerzos aplicados encima de la tabla:

- **Rol con `base_role = 'admin'`**: todo lo que tenía `read`/`editor`/`approver` pasa a `lector_global` / `editor_global` / `editor_global`. Lo que tenía `none` sigue en `sin_acceso` (no se regala acceso nuevo).
- **`approver`**: pasa a editor y además se conserva intacta su configuración de aprobación en `role_request_approvals` y `request_type_user_overrides`. Se añade una verificación posterior a la migración: todo rol/persona que hoy figura como aprobador de algún tipo de solicitud debe quedar con nivel editor en el módulo correspondiente (`request_approver_module`); si alguno queda por debajo, la migración lo sube a editor. Así nadie pierde su capacidad de aprobar.
- **Rol de base `jugador`**: en módulos personales, `read` se traduce a `lector_personal` (el jugador ve lo suyo, no toda la categoría). En cualquier otro caso el jugador conserva la traducción de la tabla.
- **Membresías club-wide** (`team_id NULL`): no se cambia el nivel guardado. El alcance amplio ya lo aporta la asignación al resolver (una membresía sin equipo aplica a todas las categorías del club), igual que hoy.

Con los datos actuales el volumen es chico y verificable: 5 roles, 5 membresías, 15 overrides, 11 aprobaciones por rol, 0 overrides de aprobador; y no existe hoy ningún `approver` guardado en `role_permissions` (solo `none`, `read`, `editor`).

Garantías de que nadie queda sin acceso indebidamente:

1. La traducción nunca produce `sin_acceso` a partir de algo distinto de `none`.
2. La migración corre en una sola transacción, y termina con comprobaciones que abortan si fallan: ninguna fila queda con `level` nulo; ninguna fila con nivel viejo distinto de `none` quedó en `sin_acceso`; todo aprobador vigente quedó como editor.
3. `access_level` se conserva en la misma fila durante Partes 1–3, así que la comparación viejo/nuevo es auditable y se puede revertir sin pérdida.
4. Un query de verificación posterior lista, por usuario, el nivel efectivo antes y después por módulo y categoría, y solo debe mostrar diferencias esperadas (ampliaciones controladas del admin y aprobadores).

## 5. Funciones helper

Todas `security definer`, `stable`, con `search_path = public`:

- `permission_scope(_level)` → `'ninguno' | 'personal' | 'categoria' | 'global'`
- `permission_can_edit(_level)` → boolean
- `effective_permission(_user_id, _module_key, _team_id)` → `permission_level`: recorre las asignaciones del usuario (`team_memberships`), toma el nivel del rol para el módulo, aplica overrides (club primero, categoría después), y devuelve el máximo efectivo para esa categoría. Membresía club-wide aplica a cualquier `_team_id`. Super admin devuelve siempre `editor_global`.
- `can_view_module(_user_id, _module_key, _team_id)` → boolean
- `can_edit_module(_user_id, _module_key, _team_id)` → boolean
- `can_view_own_row(_user_id, _module_key, _owner_id, _team_id)` → boolean: cubre `lector_personal` (ve la fila si es suya) y niveles superiores.
- `max_permission_any_team(_user_id, _module_key)` → `permission_level`: para navegación y menús (¿aparece el módulo?).

La UI de la Parte 2 consumirá los mismos conceptos desde un hook espejo en el cliente, alimentado por la misma tabla `module_catalog`.

## Alcance técnico de esta parte

- Migración SQL: crear `permission_level`, crear y poblar `module_catalog`, agregar y poblar `level` en `role_permissions` y `user_permission_overrides`, crear las 7 funciones helper, y las verificaciones de la sección 4.
- Código: `src/lib/modules.ts` gana el tipo de permiso y `levelsForModule`; se añade un módulo de utilidades de nivel (etiquetas y orden) para que Parte 2 lo use.
- Sin cambios en RLS de módulos, sin cambios en la UI de usuarios/roles: las funciones viejas (`has_module_access`, `has_module_editor`, `health_level`, `training_level`, `development_level`) siguen leyendo `access_level` y siguen funcionando igual hasta la Parte 3.

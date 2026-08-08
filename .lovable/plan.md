# Parte 2A — El frontend pasa a leer los 6 niveles

Solo frontend. No se toca ninguna función SQL, ninguna política RLS ni la columna `access_level`. La base sigue protegiendo con el sistema viejo hasta la Parte 2B.

## La escala y qué significa en pantalla

Niveles reales en la base: `sin_acceso`, `vista_jugador`, `lector_categoria`, `lector_global`, `editor_categoria`, `editor_global`.

| Nivel | ¿Aparece el módulo? | ¿Ve? | ¿Edita? | Alcance |
|---|---|---|---|---|
| sin_acceso | No | Nada | No | — |
| vista_jugador | Sí | Solo lo suyo (módulos personales) / su categoría (el resto) | No | Sus equipos |
| lector_categoria | Sí | Todo lo de sus equipos | No | Sus equipos |
| lector_global | Sí | Todo el club | No | Cualquier equipo |
| editor_categoria | Sí | Todo lo de sus equipos | Sí, en sus equipos | Sus equipos |
| editor_global | Sí | Todo el club | Sí, en cualquier equipo | Cualquier equipo |

Reglas base:
- Un nivel global aplica a CUALQUIER equipo, incluidos los que el usuario no tiene asignados.
- Un nivel de categoría aplica solo a los equipos de sus membresías (más lo club-wide heredado, como hoy).
- Super admin = `editor_global` en todo.
- Aprobar ya no es un nivel: aprueba quien es editor del módulo (la lógica fina sigue en `role_request_approvals`, sin cambios en 2A).

## Archivos que se tocan

1. **`src/lib/permissions.ts` (nuevo)** — un solo lugar con: el tipo `PermissionLevel`, el orden de los niveles, los predicados `canRead`, `canEdit`, `isGlobal`, `isPlayerView`, y la lista de módulos personales (`salud`, `desarrollo`, `nutricion`). Etiquetas en español para la UI.

2. **`src/hooks/useAccess.ts`** — la consulta pasa a traer `level` de `role_permissions` y de `user_permission_overrides` (además de `access_level`, que se sigue trayendo pero ya no se usa para decidir; queda solo por compatibilidad hasta 2B). `permissionsByTeam` conserva su forma pero sus valores son los 6 niveles nuevos. Se añade `globalPermissions`: el mejor nivel global del usuario por módulo, que se aplica a cualquier equipo. La unión `permissions` pasa a ser el equivalente cliente de `max_permission_any_team`.

3. **`src/hooks/useTeamAccess.ts`** — `levelForTeam(teamId)` resuelve: super admin → `editor_global`; si hay nivel global para el módulo, gana sobre el de categoría cuando es mayor; si no, el nivel del equipo; si no, el club-wide; si no, `sin_acceso`. `canReadTeam` = nivel ≠ `sin_acceso`. `canEditTeam` = `editor_global`, o `editor_categoria` en ese equipo concreto. Se agregan `isPlayerView(teamId)` (nivel = `vista_jugador`) y `isPersonalModule` para que las vistas sepan que deben filtrar "solo lo mío".

4. **`src/hooks/useEditableTeams.ts`** — devuelve los equipos con `editor_categoria`; si el usuario es `editor_global` (o super admin) devuelve todos los `teamOptions`.

5. **`src/components/squad/AppLayout.tsx`** — `getModuleAccess` devuelve el máximo nivel del usuario en el módulo (equivalente cliente de `max_permission_any_team`), respetando que los módulos de ámbito club no dependan de equipos. `isModuleAccessible` = ese máximo ≠ `sin_acceso`. Navbar y chips usan el mismo predicado, así que un módulo en `sin_acceso` desaparece de ambos. Los tipos del contexto pasan de `AccessLevel` a `PermissionLevel`.

6. **`src/lib/rolePages.ts`** — la página aparece si tiene al menos un módulo accesible con el nivel nuevo. Se conserva el agrupado por rol base solo como ORDEN/ubicación de los módulos dentro de cada página. **Corrección tras tu punto 1: la sección Admin NO se abre por accesibilidad genérica.** Admin se muestra únicamente si el usuario es super admin o tiene nivel de EDICIÓN en `usuarios` (que es lo mismo que exigimos para Configuración del club). Verifiqué el riesgo concreto: hoy Médico y Staff tienen `documentos` en `lector_categoria`, y con la regla "aparece si hay módulos de admin accesibles" habrían visto la pestaña Admin. Con la regla de edición sobre `usuarios`, Médico, Staff y Jugador quedan en `sin_acceso` en `usuarios` y no ven Admin; `documentos` en solo lectura se les muestra dentro de Coordinación, no en Admin.

7. **Vistas de módulos** — donde hoy comparan contra `'editor'`/`'approver'` o contra `'none'`:
   - `m.documentos.tsx`, `m.solicitudes.tsx`, `m.inventario.tsx`, `m.compras_facturas.tsx`, `m.coordinacion_interna.tsx`, `m.usuarios.tsx` (que usan `getModuleAccess`) pasan a `canEdit`/`canRead` del nuevo módulo de permisos.
   - `m.plantel.*`, `m.salud.tsx`, `m.desarrollo.tsx`, `m.entrenamientos.tsx`, `m.viajes.tsx`, `m.agenda.tsx`, `m.mes.tsx`, `TripDetailSheet`, `RequestDetailSheet`, `PlayerFormDialog`, `EventDetailSheet` ya usan `useTeamAccess`, así que heredan el comportamiento nuevo sin cambios de llamada; solo se revisan los casos donde el nivel se compara a mano.
   - `m.salud.tsx` y `m.desarrollo.tsx` además filtran el roster a la persona del usuario cuando el nivel es `vista_jugador`.
   - `/admin` y `/admin/configuracion` verifican el mismo criterio que la navegación (edición en `usuarios`) para que no se pueda entrar escribiendo la URL.
   - La pestaña de matriz de permisos (`m.usuarios.tsx`, `MembersTab.tsx`) NO se rediseña en 2A: sigue escribiendo `access_level` como hoy. Su rediseño a 6 niveles es la Parte 2C.

## Punto 2: hay desfase real entre lo nuevo y lo viejo, y hay que cerrarlo

Consulté los datos y **NO coinciden**. La Parte 1 pobló `level` con los defaults correctos de cada rol, pero dejó `access_level` como estaba. Resultado en `role_permissions`: 50 filas con `access_level = 'none'` cuyo nivel nuevo sí da acceso.

Tu caso exacto: **Médico → salud** es `editor_categoria` con `access_level = 'none'`. Igual pasa con Médico → nutrición (editor), plantel, agenda, viajes, documentos (lectura), y con varios permisos de Staff y Jugador.

Si solo cambio el frontend, el Médico vería Salud con botón de editar y la base vieja se lo rechazaría. Para evitarlo, **antes del cambio de frontend** ejecuto un ajuste de datos (solo datos: ninguna política, ninguna función, ningún tipo):

- En `role_permissions` y `user_permission_overrides`, el valor viejo se recalcula desde el nuevo: `sin_acceso` → sin acceso; `vista_jugador`, `lector_categoria`, `lector_global` → lectura; `editor_categoria`, `editor_global` → edición.

Con eso los dos sistemas describen los mismos accesos y no queda nada a medias mientras llega la 2B. Como es un cambio en la base, necesito que salgas de modo plan para aplicarlo.

## Cómo verificamos

- Antes/después del ajuste de datos: consulta que muestre cero filas donde el nivel nuevo y el viejo discrepen.
- Consulta del nivel efectivo por usuario/módulo comparada con lo que la navegación muestra, para super admin, Admin con excepciones en `sin_acceso`, Médico y Jugador.
- Caso Médico: ve Salud y Nutrición con edición en el frontend y la base también se lo permite; no ve Admin.
- Caso Jugador y Staff: no ven Admin por ningún camino, ni en la barra ni entrando por URL.
- Recorrido en el navegador con sesión real: barra de navegación, chips de cada hub y presencia/ausencia de botones de crear y editar en Plantel, Salud, Entrenamientos y Solicitudes.

## Fuera de alcance en 2A

Políticas de seguridad, funciones SQL, el tipo viejo `access_level` (se conserva y se sigue usando por la base) y el rediseño de la interfaz de roles y asignaciones.


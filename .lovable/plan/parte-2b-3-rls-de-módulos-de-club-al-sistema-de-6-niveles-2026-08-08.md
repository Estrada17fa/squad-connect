# Parte 2B-3 — RLS de módulos de club al sistema de 6 niveles

Módulos: `inventario`, `compras_facturas`, `solicitudes`, `coordinacion_interna`. Documentos queda fuera.

## Cómo se resuelve "nivel de club" (sin categorías)

Se agregan dos helpers nuevos (security definer, stable), envoltura de lo ya existente:

- `can_view_club_module(_user, _club, _module)` → `has_club_access(_user,_club)` **y** `max_permission_any_team(_user,_module) <> 'sin_acceso'` (super admin siempre true).
- `can_edit_club_module(_user, _club, _module)` → `has_club_access(_user,_club)` **y** `max_permission_any_team(_user,_module) IN ('editor_categoria','editor_global')`.

Así cualquier nivel de lectura (incluido `vista_jugador`) ve todo el club, y cualquier nivel de editor edita todo el club — que es exactamente la regla pedida. Reutiliza `max_permission_any_team`, que ya considera overrides por usuario, membresías club-wide y niveles globales, y ya está verificado en 2B-1/2B-2. El aislamiento entre clubes lo garantiza `has_club_access` sobre el `club_id` de la fila.

## Tablas y políticas

**Inventario** — `inventory_items`, `inventory_loans`
- SELECT: `can_view_club_module(... 'inventario')`; se conserva la política extra `inventory_loans_trip_select/write` por viaje (ya migrada en 2B-2).
- ALL/write: `can_edit_club_module(... 'inventario')`.
- Sin tocar triggers: disponibilidad calculada (`inventory_catalog`), `inventory_loans_check_availability`, `inventory_loans_touch_returned` quedan intactos.

**Compras** — `expenses`, `suppliers`
- SELECT lectura+, write editor, con `'compras_facturas'`.
- El alta de gasto desde solicitud aprobada sigue igual (solo cambia quién pasa la RLS: editor de compras).

**Coordinación** — `tasks`, `task_assignees`, `meetings`, `meeting_attendees`
- SELECT: lectura+ en `coordinacion_interna` **o** ser asignado/invitado de la fila (se conserva y se hace explícito, hoy el asignado dependía de tener lectura del módulo).
- INSERT/DELETE: editor del módulo.
- UPDATE `tasks`: editor **o** asignado (se conserva la regla actual de que el asignado mueve el estatus).
- UPDATE `meeting_attendees`: editor **o** el propio invitado (conserva confirmar/rechazar asistencia).

**Solicitudes** — `requests`, `request_comments`, `request_status_history`
- `can_view_request` reescrita: dueño de la solicitud, o super admin, o **editor del módulo `solicitudes`**, o **aprobador efectivo del tipo** (nueva definición abajo). Se elimina la dependencia de `has_module_approver_any`.
- SELECT `requests` pasa a usar `can_view_request(auth.uid(), id)` para una sola fuente de verdad.
- INSERT: cualquiera con acceso al club crea la suya (igual que hoy).
- UPDATE: dueño mientras esté `pendiente`, editor de `solicitudes`, o `can_approve_request_type`. El `with_check` que impide auto-aprobarse se conserva, más el trigger `requests_status_guard` (intacto).
- DELETE: igual que hoy pero con el helper nuevo de editor.
- Comentarios e historial siguen colgados de `can_view_request`.

## Reescritura de `can_approve_request_type` (punto delicado)

Definición nueva, misma firma `(_user_id, _type, _requester_id)`:

1. `NULL` o `_user_id = _requester_id` → **false** (nadie aprueba lo suyo). Se conserva primero.
2. Super admin → true.
3. Calcular `v_module := request_approver_module(_type)` (mapa intacto: medica→salud, material→inventario, compra/pago_proveedor/reembolso→compras_facturas, resto→coordinacion_interna).
4. **Requisito de nivel:** ser editor del módulo del tipo → `max_permission_any_team(_user, v_module) IN ('editor_categoria','editor_global')`. Si no, **false** (aquí muere el viejo nivel `approver`).
5. **Requisito de designación (híbrido intacto):** override `revoke` → false; override `grant` → true; si no hay override, true solo si algún rol del usuario en su club está en `role_request_approvals` para ese tipo.

Es decir: **editor del módulo del tipo Y designado**. El orden importa — el `grant` por persona ya no puede saltarse el requisito de ser editor, que es justo lo que pide la nueva regla; lo verifico en las pruebas para que ningún aprobador actual quede colgado sin darnos cuenta.

`request_type_approver_ids(_club, _type)` se reescribe con el mismo criterio: la lista actual (rol menos `revoke`, más `grant`) filtrada por "es editor del módulo del tipo". Esto mantiene alineadas las notificaciones (`notify_request_created`) con quién realmente puede aprobar, sin cambiar el trigger.

## Espejo en frontend

`useRequestApprovers.ts` documenta y replica esta lógica en cliente; se actualiza el cálculo de aprobador efectivo para exigir también nivel editor del módulo del tipo (usando el permiso ya cargado por `useAccess`), y el comentario de cabecera. Sin cambios de UI ni de la pantalla de configuración de aprobadores.

## Verificación antes de cerrar (SQL con `set local role`/`request.jwt.claims`)

1. Jugador: ve y crea sus solicitudes, 0 filas de otros, 0 filas en inventario y compras.
2. Staff editor de inventario/compras/solicitudes: lee y escribe inventario y compras; aprueba `material` si está designado.
3. Médico (editor salud, lector inventario): aprueba `medica`; lee inventario sin poder escribir.
4. Aprobación: editor+designado true; designado sin ser editor false; editor sin designación false; solicitante sobre lo suyo false.
5. Coordinación: asignado sin permiso de módulo ve y actualiza su tarea; invitado responde su junta.
6. Aislamiento: usuario de Club A obtiene 0 filas en todas las tablas de Club B.
7. Navegador: cargar Inventario, Compras, Solicitudes y Coordinación sin errores de consola.

Si alguna falla, no cierro la parte.

## Limpieza (solo se lista, no se borra)

Al terminar reporto cuáles de `has_module_access`, `has_module_editor`, `has_module_editor_any`, `has_module_approver_any` y `can_view_trip`/`can_edit_trip` viejas quedan sin referencias en políticas, funciones y código, para una limpieza final opcional en una parte aparte.

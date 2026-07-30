Las tres precisiones quedan cubiertas. Plan final (sin cambios de alcance, solo incorporando tus puntos):

## Estado actual verificado

Ya existen: tabla `requests` (`type`, `status`, `requester_id`, `title`, `description`, `details jsonb`, `amount`, `currency`, `needed_at`, `decided_at`, `decided_by`, `decision_note`, `related_item_id`, `related_event_id`, `related_loan_id`), tabla `request_comments`, los enums `request_type` y `request_status` completos, e `inventory_loans.request_id`. No hay pantalla ni hook: el chip Solicitudes está vacío. La política SELECT actual deja ver **todas** las solicitudes del club a cualquiera — se reescribe.

`has_module_approver_any` **sí existe**, pero no valida que la membresía club-wide pertenezca al club del usuario: se reescribe con aislamiento estricto (precisión 2).

## 1. Base de datos (una migración)

**Historial**: nueva tabla `request_status_history` (`request_id`, `from_status`, `to_status`, `note`, `changed_by`, `created_at`), llenada por trigger, solo lectura para el cliente, con índice por solicitud.

**Funciones**:
- `request_approver_module(request_type)` — mapeo único en servidor.
- `has_module_approver_any` reescrita: exige que el rol y el equipo de la membresía pertenezcan al club del usuario; una membresía club-wide nunca alcanza equipos de otro club (**precisión 2**).
- `can_approve_request_type(user, tipo, solicitante)` — approver del módulo del tipo o super admin, **y** nunca el propio solicitante.
- `can_view_request(user, request_id)` — visibilidad unificada, reutilizada por historial y comentarios.

**Políticas de `requests`**:
- SELECT: propias · editor/approver de `solicitudes` · **approver del módulo del tipo, sin requerir permiso alguno en `solicitudes`** (**precisión 3**) · super admin — siempre acotado al club.
- INSERT: solo con `requester_id = auth.uid()`.
- UPDATE: solicitante mientras esté pendiente; editor; approver del tipo. El `WITH CHECK` bloquea que el solicitante se ponga aprobada/rechazada.
- DELETE: solicitante en pendiente/cancelada/rechazada, editor o super admin.

**Trigger de estatus**: valida transiciones (`pendiente → aprobada/rechazada/cancelada`, `aprobada → completada` solo en material y compra), **lanza error si el solicitante intenta aprobar o rechazar lo suyo** (regla infranqueable también en servidor), permite cancelar solo al solicitante, sella `decided_by`/`decided_at` y escribe el historial.

**Índices**: `(club_id, status)`, `(requester_id)`, `(club_id, type)`.

**Módulo `compras_facturas`**: se inserta en `role_permissions` con `none` para todos los roles existentes y **`editor` únicamente para el rol base Admin** (**precisión 1**). No se activa a nadie por accidente.

## 2. Mapeo tipo → módulo (un solo lugar)

`src/lib/requestTypes.ts`: constante con label, icono, módulo aprobador, campos del formulario y roles que pueden crear cada tipo. Espejo exacto de `request_approver_module` en SQL.

- material → `inventario` · medica → `salud` · compra, pago_proveedor, reembolso → `compras_facturas` · permiso, cortesias, otro → `coordinacion_interna`
- Jugadores solo crean: permiso, medica, cortesias, reembolso.

## 3. Interfaz

- Ruta `m.solicitudes.tsx` con `PageHeader` + `ModuleTabs`, igual que Coordinación Interna.
- Pestañas **Mis solicitudes** / **Todas** (editor o approver), con filtros por tipo y estatus.
- Botón crear verde a todo el ancho: primero elegir tipo (solo los permitidos), luego formulario adaptado.
- Tarjeta `StandardCard`: tipo, título, solicitante, fecha, monto si aplica y `StatusBadge` (pendiente ámbar, aprobada azul, rechazada roja, completada neutro, cancelada gris). Las pendientes que a mí me toca aprobar salen resaltadas.
- Detalle en `EntitySheet`: todos los campos del `details`, historial de estatus en línea de tiempo y acciones arriba — Aprobar/Rechazar con nota (solo si puedo aprobar ese tipo y no soy el solicitante), Editar/Cancelar (solicitante, pendiente), Marcar completada (editor, material y compra aprobadas).
- `EmptyState` con acción, skeletons, toasts y realtime sobre `requests` e historial.

## Archivos

- Migración SQL descrita arriba.
- Nuevos: `src/lib/requestTypes.ts`, `src/hooks/useRequests.ts`, `src/routes/_authenticated/m.solicitudes.tsx`, `src/components/solicitudes/{RequestTypePicker,RequestFormDialog,RequestDetailSheet}.tsx`.
- Editados: `src/lib/modules.ts` (+ `compras_facturas`, scope club) y `src/lib/rolePages.ts`.

## Preparado, no construido

`inventory_loans.request_id` y `requests.related_loan_id` ya existen; el detalle de una solicitud de material aprobada deja el punto de enganche para generar el préstamo más adelante, sin implementarlo.

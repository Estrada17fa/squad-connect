## Alcance

1. Arreglar visibilidad de fotos de inventario (miniatura + detalle).
2. Módulo **Solicitudes** completo (8 tipos) con permisos ver / editar / aprobar y ámbito personal.
3. Integración préstamos ⇄ solicitudes de material: nueva pestaña "Pendientes" en Préstamos.
4. Mostrar foto del artículo en el detalle del préstamo.
5. Filtro de búsqueda por usuario o artículo en Préstamos.

---

## 1. Fotos de inventario

Diagnóstico: en la base no hay ningún objeto en el bucket `inventory` ni `image_path` en los artículos, así que la subida no se está completando (probablemente el `<input type="file">` oculto no dispara el `onChange` en desktop porque el `Button` que lo debería abrir no llama a `ref.current.click()` — sólo lo hace en móvil vía `capture`). Revisaré `ItemFormDialog` para:

- Conectar explícitamente los botones "Tomar foto" / "Subir foto" a `cameraInputRef.current?.click()` y `fileInputRef.current?.click()`.
- Añadir toasts si `upload()` falla y no persistir el artículo sin la imagen cuando el archivo se seleccionó.
- Validar el `content-type` y usar `upsert: true` para reintentos.

La lectura ya usa `useInventoryImageUrl` (signed URL) y las políticas de storage permiten SELECT autenticado, así que en cuanto `image_path` se guarde, miniatura y detalle se verán solas.

## 2. Módulo Solicitudes

### Datos
Nuevo módulo `solicitudes` en `src/lib/modules.ts` (bajo la página "Coordinación"). Nuevas tablas:

- `request_types` enum: `material`, `compra`, `pago_proveedor`, `permiso`, `cortesias`, `reembolso`, `medica`, `otro`.
- `request_status` enum: `pendiente`, `aprobada`, `rechazada`, `cancelada`, `completada`.
- `requests`: `id, club_id, type, status, requester_id, title, description, details jsonb, amount numeric, currency, needed_at, decided_at, decided_by, decision_note, related_item_id, related_event_id, related_loan_id, created_at, updated_at`.
- `request_comments` (para "recordar al aprobador"): `id, request_id, user_id, body, kind ('comment'|'reminder'), created_at`.

`details jsonb` guarda los campos específicos por tipo (proveedor, banco, fechas de permiso, número de boletos, monto de reembolso, tipo de estudio médico, etc.).

### RLS
- SELECT: cualquier miembro del club (`get_user_club_id`) — todos ven todas.
- INSERT: cualquier miembro autenticado del club, `requester_id = auth.uid()`.
- UPDATE:
  - `requester_id = auth.uid()` mientras `status='pendiente'` (editar/cancelar la propia).
  - `has_module_editor(auth.uid(), NULL, 'solicitudes')` (editor total).
  - Aprobar/rechazar: `has_module_approver(auth.uid(), 'solicitudes')` — nueva función helper que revisa `access_level = 'approver'`. Sólo cambia `status`, `decided_by`, `decided_at`, `decision_note`.
- DELETE: propio en pendiente, o editor.
- `request_comments`: INSERT por autor del comentario si tiene acceso a la solicitud; SELECT igual que la solicitud.

Realtime habilitado en ambas tablas.

### UI
Nueva ruta `src/routes/_authenticated/m.solicitudes.tsx`:

- Pestañas: **Mis solicitudes** · **Todas** · **Por aprobar** (sólo si tiene approver).
- Filtros por tipo y estado.
- `Nuevo` (botón verde ancho estándar) → `RequestFormDialog` con `Select` de tipo que renderiza los campos correspondientes:
  - Material: selector de artículo (de `inventory_items`), cantidad, fecha necesitada, notas.
  - Compra: descripción, categoría, monto estimado, urgencia.
  - Pago a proveedor: proveedor, concepto, monto, moneda, fecha límite, adjuntar factura (link/documento).
  - Permiso: tipo (vacaciones / personal / médico), fecha inicio, fecha fin, motivo.
  - Cortesías: partido (selector de `calendar_events` tipo `partido`), cantidad de boletos, para quién.
  - Reembolso: concepto, monto, fecha del gasto, método de pago, adjuntar comprobante.
  - Médica: paciente (miembro), tipo (estudio/consulta/tratamiento), especialidad, urgencia.
  - Otro: título + descripción libre.
- `RequestDetailSheet` (estilo estándar):
  - Header: título + `StatusBadge`. Acciones arriba según permisos:
    - Aprobador + pendiente: **Aprobar** / **Rechazar** (pide nota).
    - Editor: Editar / Eliminar.
    - Autor: Editar / Cancelar / **Recordar aprobador** (crea comment `kind='reminder'`).
  - Cuerpo: campos específicos, historial de comentarios, quién decidió y cuándo.

Hook `useRequests.ts` con `queryOptions` + realtime channel filtrado por `club_id`.

### Notificaciones
Recordatorios se guardan como filas en `request_comments` y aparecen inmediatamente vía realtime. **Push nativas quedan fuera de este entregable** (requieren service worker + VAPID / Firebase); lo dejo anotado y añado sólo indicador visual (badge con conteo de "por aprobar" en la pestaña).

## 3. Puente Solicitudes → Préstamos

- Al aprobar una solicitud tipo `material`, el flujo:
  - El aprobador ve la solicitud en la pestaña **Pendientes** de Préstamos (nuevo tab en `m.inventario.tsx`).
  - Botón "Aprobar y crear préstamo" abre `LoanFormDialog` prellenado con `borrower_user_id = requester_id`, `item_id`, `quantity` y `request_id` de la solicitud.
  - Al guardar el préstamo con `request_id`, marca la solicitud como `completada` (server-side vía función `approve_material_request(request_id, loan_id)` para atomicidad, o simplemente dos writes en un mutate).
  - Rechazar: cambia status a `rechazada`.
- Pestaña **Pendientes** lista solicitudes `type='material' AND status='pendiente'` (para quien tenga acceso a Solicitudes; acciones de aprobar sólo con `approver` en `prestamos` — según indicaste el permiso vive en préstamos, así que usaré `has_module_approver(user, 'inventario')` para las acciones aquí).

## 4. Detalle de préstamo con foto

`LoanDetailSheet` obtiene el `image_path` vía el item embebido en la consulta (`inventory_loans → item`). Ampliar el `select` en `inventoryLoansQueryOptions` para incluir `image_path`, y renderizar la miniatura arriba del detalle usando `useInventoryImageUrl`.

## 5. Filtro en Préstamos

En la pestaña Préstamos de `m.inventario.tsx`:
- Añadir un `Input` de búsqueda (mismo patrón que Catálogo) que filtra por: nombre del artículo, nombre/email del borrower.
- Se aplica sobre las tres sub-pestañas (Activos / Devueltos / Pendientes).

---

## Archivos afectados

**Nuevos:**
- `supabase/migrations/*_requests.sql` (enums, tablas, RLS, grants, triggers, realtime, `has_module_approver`).
- `src/hooks/useRequests.ts`.
- `src/routes/_authenticated/m.solicitudes.tsx`.
- `src/components/solicitudes/RequestFormDialog.tsx` (con subformularios por tipo).
- `src/components/solicitudes/RequestDetailSheet.tsx`.
- `src/components/solicitudes/PendingMaterialList.tsx` (usado en Inventario).

**Modificados:**
- `src/lib/modules.ts` — registrar `solicitudes` en la página Coordinación.
- `src/lib/rolePages.ts` — asegurar que aparece para todos los roles base.
- `src/components/inventario/ItemFormDialog.tsx` — arreglar botones de cámara/subida.
- `src/hooks/useInventory.ts` — incluir `image_path` en `item` embebido del préstamo.
- `src/components/inventario/LoanDetailSheet.tsx` — miniatura + link a solicitud si aplica.
- `src/routes/_authenticated/m.inventario.tsx` — pestaña "Pendientes" en Préstamos + filtro de búsqueda.

## Fuera de alcance (lo aviso, no lo implemento)

- Push notifications nativas (requieren service worker + claves VAPID).
- Módulos Compras/Facturas destino: por ahora las solicitudes de compra/pago quedan como registros aprobados/rechazados; cuando construyamos Compras las enlazamos con `related_purchase_id`.
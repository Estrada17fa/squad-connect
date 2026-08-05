# Compras y Facturas (chip en Coordinación)

Módulo de ámbito club para registrar el dinero que sale: gastos con comprobante y estado de pago, catálogo ligero de proveedores y reportes simples. Se conecta a Solicitudes de forma manual, igual que material → préstamo.

## Datos que se crean

**`expenses` (gastos/compras)**
`club_id`, `concept`, `amount`, `currency` (default MXN), `category` (material, servicios, nomina, viajes, mantenimiento, proveedores, otro), `supplier_id` (opcional, hacia el catálogo), `supplier_name` (texto libre opcional), `expense_date`, `payment_status` (pendiente | pagado, default pendiente), `paid_at`, `receipt_path` (comprobante en bucket privado), `notes`, `request_id` (opcional, la solicitud que lo originó), `created_by`, `created_at`, `updated_at`.
Índices: (club_id, expense_date), (club_id, category), (payment_status), y un índice **único** sobre `request_id` para que una solicitud no genere dos gastos.

**`suppliers` (catálogo opcional)**
`club_id`, `name`, `contact`, `phone`, `email`, `notes`, `created_at`, `updated_at`. Nombre único por club.

**Reglas de acceso**: lectura para miembros del club con acceso al módulo `compras_facturas`; escritura solo con nivel *editor* (o super admin). Sin fuga entre clubes.

**Comprobantes**: bucket privado nuevo `expense-receipts`, con acceso restringido a miembros del club con acceso al módulo; se ven mediante enlaces temporales firmados, igual que los adjuntos de solicitudes.

## Conexión con Solicitudes

- En el detalle de una solicitud **aprobada** de tipo `compra`, `pago_proveedor` o `reembolso`, aparece el botón **"Registrar gasto"** solo para quien tenga *editor* en `compras_facturas`.
- Abre el **mismo formulario de gasto** ya usado para registro directo, pre-llenado desde la solicitud: concepto (resumen automático), monto, proveedor si lo indicó, fecha, notas y el comprobante/imagen de referencia si la adjuntó (se copia al bucket de comprobantes).
- Al guardar: el gasto queda ligado con `request_id` y la solicitud pasa a **completada**. El botón desaparece si ya existe gasto ligado.
- Sincronización visible en ambos lados: en la solicitud se muestra una tarjeta del gasto (monto y estado de pago) y en el detalle del gasto un enlace a la solicitud origen.
- Nota técnica: la regla actual de la base solo permite pasar de aprobada a completada en `material` y `compra`; se amplía a `pago_proveedor` y `reembolso`.
- Notificación al solicitante al registrarse el gasto ("Tu compra fue procesada"), reutilizando `notify_users`.

## Interfaz

Chip **Compras y facturas** dentro de Coordinación, con tres sub-vistas:

- **Gastos**: lista con tarjeta estándar (concepto, monto, proveedor, categoría, fecha, badge de pago — pendiente ámbar, pagado azul). Filtros por categoría, estado de pago y rango de fecha, más buscador por concepto/proveedor. FAB (+) registra gasto. Detalle en panel lateral con todo lo capturado, comprobante visible/descargable, acción "Marcar como pagado" (guarda la fecha), editar y eliminar para editores.
- **Proveedores**: lista simple, crear/editar/eliminar (editor). Al abrir uno, se ven sus gastos asociados y el total.
- **Reportes**: selector de periodo (este mes / mes pasado / rango custom), total gastado, desglose por categoría con barras simples, y total pendiente vs pagado.

En el formulario de gasto el proveedor es opcional: se elige del catálogo o se escribe libre, con casilla "Guardar en catálogo" cuando es nuevo.

**Home**: tarjeta de Compras y facturas para quien tenga acceso, con total pendiente de pago y gasto del mes.

## Detalles técnicos

- Migración: enums `expense_category`, `payment_status`; tablas con GRANT + RLS (lectura por club y acceso a módulo, escritura vía `has_module_editor_any(auth.uid(),'compras_facturas')`); trigger `set_updated_at`; políticas de storage para `expense-receipts`; ampliación de `requests_status_guard`; trigger de notificación al insertar un gasto con `request_id`.
- Frontend: `src/hooks/useExpenses.ts` (gastos, proveedores, realtime como en inventario), `src/lib/expenses.ts` (categorías, iconos, formato de moneda), componentes `ExpenseFormDialog`, `ExpenseDetailSheet`, `SupplierFormDialog`, `SupplierDetailSheet`, y ruta `src/routes/_authenticated/m.compras_facturas.tsx` con soporte de deep-link `?open=`.
- Reutiliza `StandardCard`, `StatusBadge`, `EntitySheet`, `ModuleTabs`, `PageHeader`, `EmptyState` y el botón verde de acción ya estandarizado.

# Compras y Facturas — rediseño + facturas dentro del gasto

Se conserva todo lo que ya funciona (registro de gastos, proveedores, reportes agregados en la base, y el botón "Registrar gasto" desde una solicitud aprobada). Cambia la presentación, el formulario y se añade la factura como parte del gasto.

## 1. La factura vive dentro del gasto

Se amplía la tabla de gastos con los datos de la factura recibida del proveedor (no se emite nada, no hay timbrado ni SAT):

- Archivo PDF y archivo XML de la factura (ambos opcionales, en el mismo almacén privado de comprobantes).
- Folio / UUID fiscal.
- RFC del emisor (proveedor).
- Monto facturado (con IVA) e IVA desglosado.
- Fecha de la factura.
- Marca "este gasto debe llevar factura".

**Estado fiscal** (calculado, no se captura):

| Situación | Badge |
|---|---|
| No lleva factura | Sin factura (gris) |
| Lleva factura pero no hay archivo/folio | Factura pendiente (ámbar) |
| Tiene archivo o folio fiscal | Facturado (verde) |

Ese badge aparece en la tarjeta de la lista y en la ficha de detalle, junto al de categoría y al de pago.

## 2. Formulario de gasto por secciones

Igual al estándar de Solicitudes: bloques con título, no una lista plana de campos.

- **Datos del gasto**: concepto, monto, fecha, categoría, proveedor (catálogo o texto libre con "guardar en catálogo").
- **Pago**: pendiente / pagado, con fecha de pago cuando se marca pagado.
- **Comprobante**: PDF o foto, con vista previa del archivo elegido y opción de quitarlo.
- **Factura** (sección plegable, interruptor "¿Este gasto tiene factura?"): al activarse aparecen adjuntar PDF, adjuntar XML, folio/UUID, RFC del emisor, monto facturado, IVA y fecha de la factura. Un aviso discreto recuerda que el XML es el que vale fiscalmente.
- **Notas** al final.

El pre-llenado desde una solicitud aprobada sigue igual y ahora también puede continuar hacia la sección de factura.

## 3. Lista de gastos y filtros

- Tarjeta escaneable: icono de categoría, concepto, proveedor, fecha, monto grande a la derecha y fila de badges (categoría · pago · estado fiscal).
- Se eliminan las tres filas de chips. En su lugar: buscador + botón embudo con contador que abre un panel ordenado con categoría, estado de pago, estado fiscal y rango de fechas, más "Limpiar filtros". Encima, segmentos **Todos / Pendientes de pago / Sin factura** para lo que se consulta a diario.
- Línea de resumen debajo ("14 gastos · $128,400").
- Las tres pestañas (Gastos, Proveedores, Reportes) se mantienen.

## 4. Ficha de detalle

`DetailSheet` en modo lectura primero, con "Editar" arriba solo para editores:

- Cabecera con concepto, monto y los tres badges.
- Bloques etiqueta‑valor: datos del gasto, pago (con fecha), proveedor, solicitud de origen si la hay.
- Bloque **Factura**: folio, RFC, monto facturado, IVA, fecha, y los archivos PDF/XML con ver y descargar. Si no tiene, un aviso "Sin factura" con acción directa "Agregar factura" para editores.
- Acciones de editar, marcar como pagado y eliminar sin cambios.

## 5. Reportes

Se amplían los totales que la base ya calcula (nada se suma en el cliente):

- Total gastado en el periodo, pagado vs pendiente.
- **Facturado (deducible) vs sin factura**, en importe y porcentaje.
- Desglose por categoría con barras, mostrando también la parte facturada de cada categoría.
- Selector de periodo: este mes / mes pasado / rango libre.

## 6. Permisos (módulo de club)

Comportamiento confirmado como pediste, resuelto con el nivel efectivo del módulo `compras_facturas`:

| Nivel | Resultado |
|---|---|
| Sin acceso | No ve el módulo (ni en navegación ni por URL) |
| Vista jugador | Igual que Sin acceso |
| Lector categoría | Igual que Sin acceso |
| Lector global | Ve gastos, facturas, proveedores y reportes; sin acciones |
| Editor categoría | Igual que Lector global |
| Editor global | Registra, edita, elimina gastos y facturas; gestiona proveedores |

Se aplica en la página, en la navegación y también en la base, para que un nivel de categoría no pueda leer gastos del club por consulta directa.

## Detalles técnicos

- Migración: columnas nuevas en `expenses` (`has_invoice`, `invoice_pdf_path`, `invoice_xml_path`, `invoice_folio`, `invoice_uuid`, `issuer_rfc`, `invoice_total`, `invoice_tax`, `invoice_date`); columna generada/derivada de estado fiscal o cálculo en cliente + índice por `has_invoice`; ampliación de `expense_report` para devolver importe facturado y no facturado por categoría, y de `expense_summary`; políticas RLS y de storage ajustadas a "≥ lector global" para lectura y "editor global" para escritura; el bucket `expense-receipts` guarda también los archivos de factura.
- Frontend: `src/lib/expenses.ts` gana el tipo `FiscalStatus`, labels, variantes y el cálculo del estado; `useExpenses.ts` incluye los campos de factura y firma URLs de PDF/XML; nuevos `ExpenseFilters.tsx` y `ExpenseCard.tsx`; `ExpenseFormDialog.tsx` se reescribe por secciones con subida de PDF/XML; `ExpenseDetailSheet.tsx` añade el bloque de factura; la ruta `m.compras_facturas.tsx` queda como orquestador y pierde los chips; `modules.ts` marca el módulo como no visible para vista jugador.
- Se reutilizan `DetailSheet`, `StandardCard`, `StatusBadge`, `ModuleTabs`, `EmptyState` y el botón verde estándar. El enlace con Solicitudes (`request_id`, completar solicitud, notificación) no se toca.

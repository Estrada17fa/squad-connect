# Solicitudes — mejorar los formularios por tipo

Solo cambian los campos de captura de cada tipo. No se toca la vista tipo Monday, ni los filtros, ni los estados, ni el flujo de aprobación / pedir información, ni los permisos. El selector de tipo (`RequestTypePicker`) se conserva tal cual.

## Cambios por tipo

**Material**
- Nuevo selector arriba: "¿Se devuelve?" con dos opciones — **Préstamo (se devuelve)** / **Consumible (se lo queda)**. Préstamo queda preseleccionado.
- "¿Cuándo lo devolverá?" solo aparece si es préstamo, y solo entonces es obligatorio. Si es consumible, el campo desaparece y no se guarda.
- Se mantienen artículo, cantidad, motivo y equipo/categoría, con el aviso de disponibilidad que ya existe.

**Compra**
- Justificación pasa a opcional. Todo lo demás igual (qué comprar, costo estimado, link, foto).

**Pago a proveedor**
- Se agrega **Fecha límite de pago** (opcional).
- Se agrega **Factura o documento** (opcional): PDF o imagen.

**Reembolso**
- Se agrega **Comprobante o ticket** obligatorio (PDF o imagen), con nota visible de que sin comprobante no se reembolsa.

**Permiso, Cortesías, Otro** — sin cambios.

**Médica** — sin cambios: en la operación normal la solicitud médica siempre es para uno mismo, así que no se agrega "¿para quién es?" para no complicar el formulario.

## Presentación

- El formulario se organiza en secciones limpias con encabezado en mayúsculas: **CATEGORÍA**, **DETALLE DE LA SOLICITUD**, **ADJUNTOS** (solo cuando el tipo los tiene) y **NOTAS**.
- Campos etiqueta-valor como hoy, "(opcional)" solo donde aplica, sin emojis.
- Los adjuntos usan el mismo patrón ya empleado: subida al bucket privado `request-attachments` y URL firmada para verlos. Los PDF se muestran como tarjeta con nombre y botón para abrir; las imágenes con miniatura y zoom, como ya se hace con la foto de referencia.

## Detalles técnicos

- `src/lib/requestTypes.ts`: nuevos tipos de campo `toggle` (dos opciones con valor guardado) y `file` (PDF/imagen); campo opcional `showIf` en `RequestFieldDef` para condicionar visibilidad y obligatoriedad (`{ key: "se_devuelve", equals: "prestamo" }`); campo `hint` para la nota del comprobante. Se ajustan las definiciones de material, compra, pago_proveedor y reembolso.
- `RequestFormDialog.tsx`: se generaliza el estado de adjuntos de una sola foto a un mapa por clave de campo (permite tener foto de referencia y documento en el mismo tipo); se evalúa `showIf` al renderizar y al validar, y los valores de campos ocultos se descartan al guardar; se agrupan los campos en secciones.
- `RequestDetailSheet.tsx`: se omiten en la ficha los campos ocultos por condición y se agrega el visor de documento para los campos `file`. Nada más de esta pantalla se toca.
- `requestSummary` de material sigue igual (artículo × cantidad); para consumibles no cambia el resumen.
- Sin migración de base de datos: todo vive dentro de `requests.details` (jsonb). Las solicitudes existentes sin `se_devuelve` se leen como préstamo cuando tienen fecha de devolución.
- El préstamo generado desde una solicitud de material aprobada ya tolera fecha nula, así que los consumibles funcionan sin cambios en Inventario.

## Cómo verificamos

- Material: alternar préstamo/consumible muestra y oculta la fecha de devolución; al enviar como consumible no se pide la fecha y la ficha no la muestra.
- Compra: se envía sin justificación.
- Pago a proveedor: se guarda con y sin fecha límite y con PDF adjunto visible en la ficha.
- Reembolso: sin comprobante no deja enviar; con comprobante se ve en la ficha.
- Se confirma que lista, filtros, estados y aprobaciones quedan idénticos.

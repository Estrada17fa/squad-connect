## Objetivo

Tres mejoras a los formularios de solicitud: selector de material rico, compromiso de devolución y referencia visual en compras. No se tocan Permiso, Cortesías ni Otro.

## 1. Selector de material (tipo "material")

Nuevo componente `InventoryItemPicker` usado dentro del formulario de solicitud:

- Buscador por nombre.
- Chips de categoría construidos con las categorías reales del catálogo (más "Todas"). Los artículos sin categoría caen en "Sin categoría".
- Cada artículo se muestra con miniatura: si tiene imagen, se resuelve con URL firmada del bucket privado `inventory`; si no, ícono según categoría con mapa de respaldo. Cuando se cargue la foto en Inventario, aparece automáticamente.
- Debajo del nombre: disponibilidad = total menos préstamos vivos.
- Al elegir, la tarjeta seleccionada muestra miniatura/ícono, nombre y disponibilidad, con opción de cambiar.
- Se guarda en `details`: `item_id`, `articulo` (nombre, para histórico legible) y `cantidad`. La cantidad se valida contra la disponibilidad (aviso, no bloqueo duro).

### Acceso al catálogo (ajuste de seguridad)

Hoy leer `inventory_items` exige permiso en el módulo "inventario", así que quien pide material no ve el catálogo. En lugar de ampliar la política de la tabla base, se expone una lectura mínima y acotada:

- Función/vista de solo lectura que devuelve únicamente los campos necesarios para elegir: id, nombre, categoría, unidad, ruta de miniatura y disponibilidad calculada. No expone descripción/notas internas ni ningún campo interno presente o futuro (costos, proveedor, etc.).
- Filtra estrictamente por el club del usuario con `has_club_access` sobre el `club_id` del artículo: un miembro solo ve el catálogo de SU club, nunca el de otro. Super admin sigue con su alcance actual.
- Las políticas actuales de `inventory_items` (lectura completa y escritura para inventario) quedan intactas; quien sí tiene el módulo sigue viendo todo por la vía de siempre.

## 2. Fecha de devolución (material)

- Campo requerido "¿Cuándo lo devolverá?" (fecha), guardado en `details.fecha_devolucion`.
- Se muestra en la tarjeta y en el detalle como el resto de campos.
- Herencia al préstamo: al convertir la solicitud en préstamo, `inventory_loans.expected_return_at` toma `details.fecha_devolucion` (y `item_id`/`cantidad` del mismo detalle). Se deja el helper listo para el flujo de préstamos.

## 3. Referencia en compra

- Dos campos opcionales: "Link de referencia" (url validada) y "Foto de referencia".
- La foto va a un bucket privado nuevo de adjuntos de solicitudes, ruta `{club_id}/{id}/archivo`, lectura para quien puede ver la solicitud dentro del mismo club, escritura para el solicitante.
- En `details`: `referencia_url` y `referencia_foto` (ruta del archivo).
- En el detalle: link clickeable (pestaña nueva) y foto como miniatura ampliable en visor, con URL firmada.

## Detalles técnicos

- `src/lib/requestTypes.ts`: nuevos tipos de campo `item`, `url` e `image`; actualización de `material` y `compra`.
- `src/components/solicitudes/RequestFormDialog.tsx`: render de los nuevos campos, validación de requeridos y subida de imagen al guardar.
- `src/components/solicitudes/RequestDetailSheet.tsx` y la tarjeta en `m.solicitudes.tsx`: miniatura de artículo, link y foto.
- Nuevo `src/hooks/useInventory.ts`: catálogo mínimo (nombre, categoría, miniatura, disponibilidad) y URLs firmadas.
- Migración: bucket privado de adjuntos con políticas por club + función/vista de catálogo mínimo acotada por `has_club_access`.

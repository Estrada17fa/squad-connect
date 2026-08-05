# Módulo Inventario (chip dentro de Coordinación)

## Lo que YA existe (no se duplica)

Verificado en la base de datos:

- **inventory_items**: club_id, name, category, description, unit, total_quantity, min_quantity (stock mínimo, ya existe), image_path (foto, ya existe), created_by, created_at, updated_at.
- **inventory_loans**: club_id, item_id, borrower_user_id, team_id, event_id, **request_id (ya existe)**, quantity, returned_quantity, expected_return_at, returned_at, notes (motivo), created_by, timestamps.
- **Reglas automáticas en servidor**: un disparador valida disponibilidad en cada alta/edición de préstamo (rechaza si excede el total) y otro cierra o reabre el préstamo según lo devuelto.
- **inventory_catalog(club_id)**: devuelve nombre, categoría, unidad, foto, total y **disponible calculado** (total menos préstamos vivos). Fuente única de disponibilidad.
- **Reglas de acceso**: lectura para quien tenga acceso al módulo `inventario` dentro de su club; escritura solo para nivel editor. Ya aplicadas a artículos y préstamos.
- **Bucket privado `inventory`** con permisos: subir/editar/borrar solo editores de inventario.
- El módulo `inventario` ya está mapeado al hub Coordinación en los mapas de rol (admin y staff).

## Único cambio de base de datos propuesto

Ajustar el permiso de lectura de las fotos del bucket `inventory`: hoy cualquier usuario autenticado puede leerlas. Se acotará a miembros con acceso al módulo de inventario, guardando las fotos con la ruta `club_id/archivo` para poder validar el club. No hay cambios de tablas ni de columnas: **no se crea ni se altera ninguna tabla, y `request_id` ya existe**.

## Interfaz

Nueva página `/m/inventario` con las pestañas de módulo existentes y dos sub-vistas:

### Catálogo
- Grid de tarjetas: miniatura (o ícono por categoría, reutilizando el que ya usa el selector de Solicitudes), nombre, categoría y "Disponibles: X de Y".
- Buscador por nombre y chips de categoría (mismo patrón visual del selector de material).
- Indicador ámbar de stock bajo cuando disponible ≤ mínimo.
- Crear / editar / eliminar artículo (solo editor) en un diálogo: nombre, categoría, unidad, descripción, cantidad total, stock mínimo y **foto** (subida al bucket privado, con vista previa y opción de quitarla).

### Préstamos
- Dos secciones: Activos y Devueltos, con los vencidos resaltados.
- Cada préstamo muestra todo lo capturado: artículo con miniatura, cantidad (y saldo pendiente si hubo devolución parcial), a quién se prestó (nombre + avatar), motivo, equipo, fecha de préstamo, fecha esperada de devolución y estado.
- Registrar préstamo (editor): artículo (solo con disponibilidad > 0), cantidad validada contra lo disponible, miembro con buscador, motivo opcional, equipo opcional y fecha esperada opcional.
- Registrar devolución (editor): total o parcial; la disponibilidad sube solo por lo devuelto y el préstamo se cierra al completarse.
- Varios préstamos activos del mismo artículo conviven sin problema.

### FAB y Home
- El botón (+) crea artículo o registra préstamo según la sub-vista activa; oculto para quien solo tiene lectura.
- Tarjeta de Inventario en Inicio para quien tenga acceso: número de préstamos activos y de artículos en stock bajo.

## Preparado para Solicitudes

El vínculo con la solicitud de material queda listo (columna ya existente y el borrador de préstamo que ya genera el módulo de Solicitudes), sin activar aún la creación automática.

## Detalles técnicos

- `src/hooks/useInventory.ts`: se amplía con `useInventoryItems` (fila completa para edición), `useInventoryLoans` (con join a artículo, perfil del prestatario y equipo), mutaciones de artículo/préstamo/devolución y suscripción realtime por `club_id`, siguiendo el patrón de `useCoordinacion.ts`.
- Nueva ruta `src/routes/_authenticated/m.inventario.tsx` con `Tabs` de shadcn para las sub-vistas, `PageHeader`, `ModuleTabs`, `StandardCard`, `StatusBadge`, `EmptyState`, `LoadingState`.
- Componentes nuevos en `src/components/inventario/`: `ItemFormDialog.tsx`, `LoanFormDialog.tsx`, `ReturnDialog.tsx`, `LoanDetailSheet.tsx` (con `EntitySheet`).
- `categoryIcon` y `useInventoryThumbnails` se reutilizan; `categoryIcon` se moverá a `src/lib/inventory.ts` y el selector de Solicitudes lo re-exportará para no romper importaciones.
- Devolución parcial: se actualiza `returned_quantity`; los disparadores existentes ajustan `returned_at`.
- Validación de cantidad en UI contra `available_quantity`; el servidor ya la aplica con su disparador y el error se muestra con `sonner`.
- `src/lib/prefetch.ts` gana el caso `inventario`.

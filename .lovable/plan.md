# Unificar detalles/formularios en Sheets + arreglos de Documentos

## Objetivo
1. Mostrar quién subió cada documento.
2. Reemplazar diálogos centrados por Sheets responsivos (bottom en móvil, side en desktop) en toda la app para detalles y formularios de entidades.
3. Corregir el desborde de la card de vista previa en móvil (393px).

## Alcance de conversión a Sheet
Detalles y formularios de entidades:
- Documentos: preview y formulario de alta/edición.
- Calendario: formulario de evento y detalle (hoy `DaySheet` ya es sheet — se mantiene).
- Coordinación: formulario de tarea y formulario de junta.
- Plantel: formulario de jugador (y el detalle actual de jugador si aplica).
- Usuarios: diálogo de creación de miembro.

Se mantienen como diálogo centrado:
- Confirmaciones cortas (borrar, "¿seguro?") — `AlertDialog`.
- Menús y popovers.

## Cambios por área

### 1. Componente base compartido
Crear `src/components/squad/EntitySheet.tsx`:
- Wrapper sobre `Sheet` de shadcn.
- `side="bottom"` con `max-h-[90dvh]` en móvil (`< sm`), `side="right"` con `w-full sm:max-w-lg` en `sm:` en adelante.
- Header sticky con título/descr, cuerpo con scroll (`overflow-y-auto`), footer sticky opcional.
- Respeta safe-area (`pb-[env(safe-area-inset-bottom)]`).
- Estilos: `glass` + `border-white/10` para paridad visual.

Todas las pantallas convertidas usan este wrapper (no `Dialog`) para garantizar consistencia.

### 2. Documentos
- `DocumentPreviewDialog` → `DocumentPreviewSheet` usando `EntitySheet`.
  - Contenedor de preview: `w-full` con `max-h-[60dvh]` en móvil y `max-h-[70vh]` en desktop; `iframe` y `img` con `w-full h-full object-contain` para que no desborde a 393px.
  - Mostrar el nombre del uploader: `Subido por {nombre} · {fecha}`.
- `DocumentFormDialog` → `DocumentFormSheet` (mismo wrapper).
- `useDocuments.ts`: añadir join `uploader:profiles!documents_uploaded_by_fkey(id, full_name, avatar_url)` al select y tipo `DocumentRow.uploader`.

### 3. Calendario / Coordinación / Plantel / Usuarios
Migrar a `EntitySheet` sin cambiar lógica ni validación:
- `EventFormDialog`
- `TaskFormDialog`, `MeetingFormDialog`
- `PlayerFormDialog` (+ ficha de detalle si abre modal)
- `CreateMemberDialog` (wizard de 2 pasos dentro del sheet; el footer sticky aloja los botones "Atrás/Siguiente/Guardar")

### 4. Confirmaciones
Revisar `confirm()` nativos en botones de borrado (p.ej. Documentos) y sustituir por `AlertDialog` de shadcn cuando estén dentro de un sheet, para evitar bloqueos del navegador móvil.

## No incluido
- No se toca `DaySheet` (ya es sheet).
- No se cambian permisos, RLS, ni esquema (salvo el join de uploader, que es solo lectura).
- No se rediseñan las páginas listado, solo los overlays.

## Detalles técnicos
- Tailwind v4: usar `dvh` en móvil para evitar saltos con la barra del navegador; fallback `vh` en desktop.
- El sheet inferior debe soportar teclado virtual: `max-h-[90dvh]` + `overflow-y-auto` en el body evita que el footer quede fuera de vista al enfocar inputs.
- El join de uploader usa el FK `documents_uploaded_by_fkey` (ya existe en la migración inicial de la tabla `documents`).
- Verificar en móvil (393×852) que el preview de PDF/imagen queda contenido sin scroll horizontal.

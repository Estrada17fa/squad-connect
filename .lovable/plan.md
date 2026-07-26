# Módulo Documentos

Biblioteca de documentos del club con metadatos, filtros y almacenamiento privado. Vive en la página Admin, respeta el sistema de diseño existente (chips scrolleables, glass cards, skeletons, FAB, StatusBadge, EmptyState).

## 1. Base de datos (migración)

**Enum** `document_category`: `jugador`, `staff`, `institucional`, `legal`, `competicion`, `comercial`, `operativo`.

**Tabla `public.documents`**
- `id`, `club_id` (FK clubs), `title`, `description` (null)
- `category` (enum), `file_path` (text, ruta en storage), `file_type` (null), `file_size` (bigint, null)
- `related_user_id` (FK profiles, null), `team_id` (FK teams, null)
- `issue_date` (date, null), `expiry_date` (date, null), `tags` (text[], null)
- `uploaded_by` (FK profiles), `created_at`, `updated_at` (+ trigger)

Índices: `club_id`, `category`, `related_user_id`, `expiry_date`.

GRANTs: `authenticated` (SELECT/INSERT/UPDATE/DELETE), `service_role` (ALL).

**RLS `documents`:**
- SELECT: `has_club_access(auth.uid(), club_id) AND (has_module_access(auth.uid(), 'documentos') OR related_user_id = auth.uid())`
- INSERT/UPDATE/DELETE: `has_club_access(...) AND has_module_editor_any(auth.uid(), 'documentos')`

## 2. Storage

Bucket privado `documents` (via `supabase--storage_create_bucket`, `public=false`). Convención de path: `<club_id>/<document_id>/<filename>`.

Policies en `storage.objects` para bucket `documents`:
- SELECT: usuario con `has_module_access('documentos')` del club dueño del path, o cuyo `auth.uid()` coincida con `related_user_id` en la fila `documents` correspondiente.
- INSERT/UPDATE/DELETE: `has_module_editor_any('documentos')` del club dueño.

(Path prefix = club_id permite verificar club via `split_part(name, '/', 1)::uuid`.)

## 3. Hook de datos

`src/hooks/useDocuments.ts` — `documentsQueryOptions({ clubId, filters })` con Realtime sobre `documents`. Filtros: búsqueda texto (title/description/tags via `or` + `ilike`/`cs`), categoría (multi), `related_user_id`, `team_id`. `staleTime` 30s, placeholderData keepPrev.

`useDocumentMutations` para crear/editar/eliminar + subida a Storage.

## 4. UI

`src/routes/_authenticated/m.documentos.tsx` — sigue el patrón exacto de `m.plantel.tsx`:
1. `ModuleTabs` primero.
2. `PageHeader hideTitle` con acción "Subir documento" (solo si editor).
3. Buscador (Input con ícono Search integrado) + chips de categoría scrolleables ("Todos" + 7 categorías) + Selects de persona y equipo.
4. `ViewToggle` grid/list.
5. Grid/List de `StandardCard`:
   - Icono según `file_type` (FileText / Image / File).
   - Título, `StatusBadge` con categoría (mapeo a variant `info`/`pending`/etc.).
   - Subtítulo: persona relacionada + equipo + fecha emisión.
   - Indicador visual de expiración: badge sutil `pending` si `expiry_date` < 30d, `rejected` si vencida.
   - Click → abre `DocumentPreviewDialog`.
6. Skeleton (`CardGridSkeleton`) y `EmptyState`.

**Componentes nuevos** en `src/components/documentos/`:
- `DocumentFormDialog.tsx` — crear/editar. Campos: archivo (input file), título, categoría (Select), descripción, persona relacionada (Combobox buscable sobre profiles del club), equipo (Select con teams del club), fechas emisión/vencimiento, tags (input separado por comas). Sube a Storage → inserta fila.
- `DocumentPreviewDialog.tsx` — PDFs en `<iframe>` con signed URL; imágenes en `<img>`; otros muestran botón "Descargar". Acciones editar/eliminar solo si editor.
- `DocumentCard.tsx` (opcional) o inline en la página.

FAB reutiliza la lógica (o el botón del header ya cubre "Subir"; el FAB global sigue).

## 5. Integración Plantel

En `m.plantel.$playerId.tsx` — añadir sección "Documentos" que reutiliza `useDocuments` con `related_user_id = playerId`, y botón "Subir documento" que abre `DocumentFormDialog` con `related_user_id` prefijado. Aplica igual para staff (la ruta ya es de miembro).

## 6. Home

En el Dashboard/Home, tarjeta opcional "Documentos por vencer" visible solo si el usuario es editor de `documentos`: cuenta `documents` con `expiry_date` entre hoy y +30d. Placeholder de conteo (query simple), sin sistema de alertas.

## 7. Registrar módulo

- `module_key = 'documentos'` ya existe en `src/lib/modules.ts` y `rolePages.ts` (página Admin). Verificar/agregar si falta.
- Sin nuevos estilos: reutilizar tokens y componentes existentes.

## Notas técnicas

- Descargas usan `supabase.storage.from('documents').createSignedUrl(path, 60)`.
- Búsqueda por tags: `contains` con array del término, o combinar `.or()` con `ilike` sobre title/description.
- Categoría → variante de StatusBadge: mapa fijo en util local.
- Todos los queries filtran por `club_id` explícitamente además de RLS.

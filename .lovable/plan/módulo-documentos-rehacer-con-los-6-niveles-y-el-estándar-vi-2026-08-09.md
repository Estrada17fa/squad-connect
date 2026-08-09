# Módulo DOCUMENTOS — rehacer con los 6 niveles y el estándar visual de Usuarios

## 1. Aclaración de vocabulario (así queda el modelo)

- **Categoría** = equipo (`documents.team_id`). Un documento puede ser del club entero (`team_id` nulo) o de una categoría concreta.
- **Tipo/etiqueta** = enum actual `document_category` (institucional, legal, competición, comercial, operativo, jugador, staff).
- **General** = sin persona asignada → vive en el módulo Documentos.
- **Personal** = con `related_user_id` → NO aparece en el módulo; aparece en el perfil de esa persona.

## 2. Migración de permisos (RLS) a los 6 niveles

Hoy Documentos usa las funciones viejas `has_module_access` / `has_module_editor_any` (sin categoría, sin niveles). Se reemplazan por las nuevas, por equipo:

- **Ver**: `can_view_module(auth.uid(), 'documentos', team_id)` para documentos de categoría; para los de club (`team_id` nulo), `can_view_club_module(..., 'documentos')`. Se excluyen del módulo los personales salvo que el lector sea editor.
- **Editar / borrar / subir**: mismo esquema con `can_edit_module` y `can_edit_club_module`.
- **Dueño**: siempre puede ver y descargar sus documentos personales (`related_user_id = auth.uid()`), aunque no tenga el módulo.
- **Vista Jugador**: `vista_jugador` no da acceso al módulo (`can_view_module` es falso en ese nivel), pero sí conserva el acceso a lo suyo por la regla de dueño. Queda implementado explícitamente en el front (pantalla "Sin acceso" + sus documentos en el perfil), no omitido.
- Las políticas de viajes (`documents_trip_select` / `documents_trip_write`) se conservan intactas.
- Mismo criterio en las políticas del bucket privado `documents` (storage), que hoy también usa las funciones viejas.
- Limpieza: `has_module_access` y `has_module_editor_any` quedan huérfanas solo si ninguna otra política las usa; hoy siguen en uso en otras tablas, así que **no se eliminan** — se dejan de usar en Documentos y se documenta. No se toca RLS de otros módulos.

## 3. Comportamiento por nivel en la interfaz

| Nivel | Módulo | Alcance | Acciones |
|---|---|---|---|
| Sin acceso | oculto | — | — |
| Vista jugador | oculto | sus documentos en su perfil | descargar los suyos |
| Lector categoría | visible | sus categorías + documentos del club | descargar |
| Lector global | visible | todas las categorías | descargar |
| Editor categoría | visible | sus categorías | subir/editar/eliminar solo ahí |
| Editor global | visible | todo | todo |

El botón "Subir documento" solo aparece si hay al menos una categoría editable; en la ficha, "Editar"/"Eliminar" se evalúan contra la categoría del documento.

## 4. Lista y filtros (idénticos a Usuarios)

- Buscador arriba + botón embudo "Filtrar" con contador de filtros activos, en un panel ordenado: **Categoría (equipo)**, **Tipo**, **Estado de vigencia** (vigente / por vencer / vencido) y **Persona asignada** (solo editores). Nada de chips sueltos.
- Segmentos principales debajo del buscador: **Todos / Por vencer / Vencidos**, con el contador de resultados a la derecha.
- Tarjetas (`StandardCard`): icono según extensión (PDF / imagen / archivo), título destacado, badge de tipo, badge de categoría, fecha de emisión, y `StatusBadge` de vigencia en color cuando aplica. Sin párrafos largos.

## 5. Formulario de subir/editar

Campos, leyendo catálogos reales: título; archivo (PDF/imagen al bucket privado); **categoría** (selector con equipos reales + "Todo el club", limitado a las categorías donde puede editar); **tipo**; **asignado a** (persona real del club, opcional — al llenarse el documento pasa a ser personal y sale del listado del módulo, con un aviso claro en el formulario); fecha de emisión; fecha de vencimiento (opcional); notas; etiquetas; "subido por" automático.

Validación con Zod, mismos estilos de sección que el formulario de Usuarios (secciones con encabezado, no un formulario plano).

## 6. Ficha de detalle (sheet)

Se conserva la previsualización actual (imagen embebida / PDF en visor) y se adapta al patrón único:

- Abre en **lectura**: cabecera con icono de archivo, título, badges (tipo, categoría, vigencia); previsualización; secciones etiqueta-valor con emisión, vencimiento, persona asignada, subido por, tamaño/formato y notas.
- **Descargar** siempre visible (URL firmada temporal).
- **Editar** arriba solo si puede editar esa categoría; guardar/cancelar vuelven a lectura. **Eliminar** con confirmación, solo editores.
- Sin desbordes: mismas reglas de corte de texto que en la ficha de Usuarios.

## 7. Documentos personales en el perfil

- `/mi-perfil`: sección "Mis documentos" con las mismas tarjetas y la misma sheet en modo lectura + descarga (sin editar).
- Ficha de miembro en Usuarios: pestaña/sección "Documentos" de esa persona, con alta y edición solo para quien administra usuarios o es editor de documentos.

## 8. Detalles técnicos

- Fechas con el formateador `es-MX` ya usado en la app; emisión/vencimiento siguen siendo fechas de calendario y todo lo demás `timestamptz`.
- `useDocuments.ts` se amplía: filtro por alcance (general vs personal), estado de vigencia y helpers de tipo de archivo ya existentes; se mantiene el canal realtime.
- Nuevos componentes: `DocumentsFilters.tsx`, `DocumentCard.tsx`, refactor de `DocumentDetailSheet.tsx` y `DocumentFormDialog.tsx`, más una sección reutilizable `PersonDocumentsSection.tsx` para perfil y ficha de miembro.
- Reutiliza `StandardCard`, `StatusBadge`, `DetailSheet`, `EmptyState`, `PageHeader`, `ModuleTabs`. Sin emojis, solo iconos lucide.

## 9. Verificación

Recorrido con sesión real en móvil (393 px) probando cada nivel: módulo oculto en sin acceso y vista jugador, lector sin botones de edición pero con descarga, editor categoría limitado a sus categorías, editor global con todo; documento personal que desaparece del módulo y aparece en el perfil del dueño; títulos y nombres largos sin encimarse; consola sin errores.

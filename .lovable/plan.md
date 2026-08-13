# Módulo COMUNICADOS (Mi Club)

Tablón de anuncios de una vía: la directiva o el cuerpo técnico publica, el resto lee y confirma lectura. Sin comentarios ni respuestas. Módulo de categoría con `module_key = 'comunicados'` (ya existe en la lista de módulos y en los permisos por rol).

## Qué verá el usuario

- **Tablón (lista)**: tarjetas escaneables con título, extracto, badge de prioridad con color (normal / importante / urgente), a quién va dirigido (categoría(s) o "Todo el club"), autor y fecha. Los no leídos se destacan con punto e indicador visual; urgentes e importantes se ordenan arriba.
- **Filtros limpios** (patrón Usuarios): buscador + embudo por prioridad, categoría y leídos / no leídos.
- **Detalle (sheet estándar, lectura primero)**: título, prioridad, contenido completo, adjunto con vista previa (imagen o PDF), autor y fecha. Se marca como leído automáticamente al abrirlo.
- **Sección "Lectura"** visible solo para editores: contador "18 de 22 leyeron" y la lista de quién leyó y quién no, con avatares.
- **Crear / editar** (solo editores, botón FAB): título, contenido, dirigido a (una categoría, varias o todo el club), prioridad, adjunto opcional.
- **Notificación al publicar** a las personas destinatarias, reutilizando el sistema existente; el urgente se distingue en el título de la notificación.

## Permisos

| Nivel | Puede |
| --- | --- |
| Sin acceso | No ve el módulo |
| Vista jugador | Lee los comunicados de su(s) categoría(s) y los del club; confirma lectura |
| Lector categoría | Igual que arriba, sin crear |
| Lector global | Ve los comunicados de todas las categorías del club |
| Editor categoría | Crea, edita y elimina los de su categoría; ve la confirmación de lectura de esos |
| Editor global | Crea para cualquier categoría o todo el club; ve toda la confirmación de lectura |

Un comunicado dirigido a "todo el club" lo ven todas las personas con acceso al módulo. Uno dirigido a categorías solo lo ven quienes pertenecen a esas categorías (o quienes tienen nivel global).

## Detalles técnicos

**Migración (nuevo esquema, siguiendo el patrón de módulos de categoría ya migrados)**

- Enum `announcement_priority`: `normal`, `importante`, `urgente`.
- `announcements`: `club_id`, `title`, `body`, `priority`, `audience` (`club` | `teams`), `published_at timestamptz`, `author_id`, `attachment_path`, `attachment_name`, `attachment_type`, `created_at`, `updated_at` (+ trigger `set_updated_at`).
- `announcement_teams`: `announcement_id`, `team_id` (destino cuando `audience = 'teams'`).
- `announcement_reads`: `announcement_id`, `user_id`, `read_at` (único por par).
- GRANT a `authenticated` y `service_role` en las tres tablas, luego RLS y políticas.
- Funciones `SECURITY DEFINER` nuevas, encima de las ya migradas (`effective_permission`, `can_view_module`, `can_edit_module`, `has_team_scope`, `is_super_admin`):
  - `can_view_announcement(_user_id, _announcement_id)`: `audience = 'club'` → basta `can_view_module(...,'comunicados', NULL)`; `audience = 'teams'` → existe un `team_id` destino con `can_view_module(_user,'comunicados', team_id)` y (`has_team_scope` o nivel global).
  - `can_edit_announcement(_user_id, _announcement_id)`: `editor_global` para cualquiera; `editor_categoria` solo si todos los destinos son categorías donde tiene edición. Publicar a "todo el club" requiere `editor_global`.
- Políticas: lectura por `can_view_announcement`; escritura/borrado por `can_edit_announcement`; `announcement_teams` hereda del comunicado; `announcement_reads` — cada quien inserta/lee su propia fila, y los editores del comunicado leen todas.
- Trigger `AFTER INSERT` en `announcements` que llama a `notify_group` (`scope = 'club'` o un `notify_group` por cada equipo destino), con `related_module = 'comunicados'`.
- `ALTER PUBLICATION supabase_realtime ADD TABLE` para `announcements` y `announcement_reads`.
- Bucket privado `announcement-attachments` con políticas alineadas a las del comunicado (patrón `expense-receipts`).

**Frontend**

- `src/hooks/useAnnouncements.ts`: listado con equipos destino, autor y estado de lectura; mutaciones crear / editar / eliminar / marcar leído; suscripción realtime con canal de nombre único.
- `src/components/comunicados/`: `AnnouncementCard.tsx`, `AnnouncementDetailSheet.tsx` (sobre `DetailSheet`, con la sección "Lectura"), `AnnouncementFormDialog.tsx` (con selector de alcance y subida de adjunto), `ReadReceipts.tsx`.
- `src/routes/_authenticated/m.comunicados.tsx`: `PageHeader`, filtros, tablón, `FAB` para editores; permisos desde `useTeamAccess('comunicados')`.
- Prioridad con `StatusBadge`, estados vacío y de carga con `EmptyState` / `LoadingState`, fechas con el formateo estándar del proyecto, solo iconos de lucide.

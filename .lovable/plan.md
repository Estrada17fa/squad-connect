# Módulo Multimedia — gestión en Coordinación + feed en Mi Club

Confirmado: el **tipo de publicación sirve como filtro** del feed (y de la pestaña de gestión), y la **liga a un partido es opcional** — solo se ofrece cuando el tipo es "Partido", y si no se elige, la publicación queda como tipo Partido genérico.

## Qué se construye

### 1. Coordinación — nueva pestaña "Multimedia"
- Se añade una pestaña más junto a Tareas y Juntas, con el mismo patrón visual.
- Botón "Publicar" (solo editores) que abre un formulario:
  - Archivos: una o varias fotos/videos a la vez (cada archivo genera su publicación, compartiendo título, tipo y destinatarios; o se agrupan como álbum, ver abajo).
  - Título/descripción opcional.
  - Fecha de la publicación (por defecto ahora).
  - Dirigida a: todo el club o una/varias categorías (mismo selector que Comunicados).
  - Tipo: Entrenamiento, Partido, Evento especial, Convivencia, Institucional, Otro.
  - Si el tipo es Partido: selector opcional de uno de nuestros partidos (torneo/Partidos), mostrando rival y jornada.
- Lista de publicaciones existentes en tarjetas con miniatura, tipo, destinatarios y fecha; filtros estándar (buscador + embudo por tipo, categoría y rango de fechas).
- Editar y eliminar desde la ficha lateral estándar (leer primero, botón Editar).
- Álbumes: se resuelve de forma simple — al subir varios archivos juntos quedan agrupados bajo un mismo "álbum" (título compartido); el feed muestra el grupo como carrusel de una sola publicación. Sin pantalla aparte de gestión de álbumes.

Permisos de la pestaña (module_key `multimedia`):
- Sin acceso y Vista jugador: la pestaña no aparece.
- Lector de categoría / Lector global: la pestaña aparece solo en consulta (sin Publicar, Editar ni Eliminar); el lector de categoría ve lo de sus categorías + club, el global todo.
- Editor de categoría: publica/edita/elimina lo de sus categorías.
- Editor global: publica/edita/elimina de todo el club.

### 2. Mi Club — feed tipo Instagram (`/m/multimedia`)
- Columna de publicaciones, imagen o video protagonista, esquinas suaves, sin recuadros ruidosos.
- Cada publicación: media grande (carrusel si el álbum tiene varias), badge de tipo, título/descripción, autor con avatar, fecha, y si está ligada a un partido, una línea "vs Rival · Jornada N" que abre ese partido.
- Acciones: ver en pantalla completa, descargar, like (icono corazón con contador, se puede quitar) y comentar.
- Comentarios: hilo con avatar, nombre y fecha; cada quien borra el suyo; los editores pueden borrar cualquiera (moderación).
- Video: se reproduce en línea, con controles.
- Filtros estándar arriba: buscador de texto (título/descripción) + embudo por tipo, categoría y rango de fechas.

Alcance por nivel (todos los que acceden interactúan igual: ver, descargar, like, comentar):
- Sin acceso: no ve el feed. Vista jugador y lector de categoría: su(s) categoría(s) + lo del club. Lector global y editor global: todo. Editor de categoría: su categoría + club.

### 3. Notificaciones
Al publicar, se avisa a la audiencia ("Nueva publicación en Multimedia") reutilizando el sistema actual, igual que Comunicados. Sin push nuevo.

## Detalles técnicos

Migración:
- Enum `media_post_type` (`entrenamiento`, `partido`, `evento_especial`, `convivencia`, `institucional`, `otro`).
- `media_posts`: club_id, album_id (uuid, agrupa subidas múltiples), title, description, type, audience (`club` | `teams`), match_id (FK opcional a `tournament_matches`, ON DELETE SET NULL), published_at timestamptz, author_id, created_at/updated_at + trigger.
- `media_post_files`: post_id, storage_path, file_name, mime_type, kind (`image`/`video`), width/height opcional, sort_order.
- `media_post_teams`: post_id, team_id (audiencia por categoría).
- `media_likes` (post_id, user_id, único) y `media_comments` (post_id, user_id, body, created_at).
- Funciones SECURITY DEFINER siguiendo el patrón de Comunicados: `can_view_media_post` (audiencia club → `can_view_module('multimedia', NULL)`; audiencia equipos → `can_view_team_media` por cada equipo, con lector/editor global viendo todo) y `can_edit_media_post` (autor, editor global, o editor con alcance sobre todos los equipos destinatarios).
- GRANTs a `authenticated` y `service_role` en cada tabla nueva, RLS activada y políticas: lectura por `can_view_media_post`; insert/update/delete de posts, archivos y equipos solo para editores; likes y comentarios insertables por cualquiera que pueda ver el post; borrado de comentario por su autor o por un editor del post.
- Trigger de notificación al insertar post (audiencia club) y al insertar fila en `media_post_teams`, con `notify_group`.

Frontend:
- Bucket privado `media-posts` + URLs firmadas (mismo patrón que `announcement-attachments`), con caché de firmas por render.
- `src/lib/multimedia.ts` (etiquetas de tipo, orden, helpers), `src/hooks/useMultimedia.ts` (posts, likes, comentarios, subida, mutaciones, realtime).
- Componentes en `src/components/multimedia/`: `MediaFeedCard`, `MediaCarousel`, `MediaLightbox`, `MediaComments`, `MediaFormDialog`, `MediaDetailSheet`, `MediaFilters`.
- Ruta nueva `src/routes/_authenticated/m.multimedia.tsx` (feed) y pestaña añadida en `m.coordinacion_interna.tsx`.
- Fechas siempre timestamptz formateadas con los helpers existentes; iconos lucide, sin emojis.

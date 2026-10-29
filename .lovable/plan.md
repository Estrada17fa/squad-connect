# Base nueva de permisos: todo por categoría

## Paso 0 — Foto "antes" (sin cambios)
- Guardar `get_my_access` de todos los usuarios del club (club_levels + cada categoría) en una tabla temporal de comparación en /tmp (no en la base).

## Paso 1 — Interruptor "Todas las categorías" (base de datos)
- `roles.default_all_categories boolean default false`, copiado desde `allows_club_wide` (Admin = true). `allows_club_wide` queda marcada `DEPRECATED`, sin borrar.
- Elección más simple: tabla nueva `member_all_categories (club_id, user_id, role_id, created_at)`, PK (club_id, user_id). Una fila = interruptor encendido con ese rol. No mezcla con membresías ni perfiles. Grants + RLS: lectura con `can_view_users`, escritura solo vía servidor.
- Trigger `AFTER INSERT ON teams`: por cada fila del club en `member_all_categories`, inserta la membresía (user, nuevo team, rol), conservando el `job_title` de otra membresía de la persona.
- Server functions nuevas en `members.functions.ts` (fila por fila, sin DELETE masivo):
  - `previewAllCategories` → lista categorías donde la persona ya tiene otro rol (para el aviso).
  - `setAllCategories({userId, roleId, on, replaceConflicts})` → encendido: upsert del interruptor + inserta membresías faltantes; reemplaza roles distintos solo si se confirmó. Apagado: borra solo la fila del interruptor, conserva membresías.
- Validaciones existentes (no escalar privilegios, último admin) se reutilizan.

## Paso 2 — Migrar a los 3 Admin
**Va en la MISMA migración y transacción que el Paso 3**, para que Sebastian y Connor no pierdan acceso ni un instante. Para Emilio, Sebastian y Connor: encender interruptor con rol Admin → se crean Primer Equipo y Equipo Juvenil con su `job_title` → borrar su membresía `team_id NULL` (borrado por id). La restricción `team_memberships.team_id NOT NULL` va en una migración posterior, ya sin filas nulas.

## Paso 3 — Quitar lo "global"
Inventario encontrado en la base viva. Dos casos: (M) usa membresía sin categoría / nivel global → se cambia; (R) `team_id IS NULL` del **registro** ("Todo el club" en tareas, solicitudes, eventos, comunicados, multimedia, documentos). Un registro de todo el club pertenece a TODAS las categorías: lo **ve** quien tenga Ver en al menos una categoría; lo **edita** solo quien tenga Editar en TODAS las categorías del club (si le falta membresía en alguna, no edita). Helpers nuevos: `level_any_team` (máximo) y `level_all_teams` (mínimo entre todas las categorías del club). Nunca se usa "editor en alguna categoría" para editar registros de todo el club.

Funciones SQL:
| Función | Uso actual | Cómo queda |
|---|---|---|
| effective_permission | ampliación club_wide + niveles globales | Sin club_wide. Baja = sin_acceso; super admin = editor_global; excepción de categoría > excepción general > máx. de roles; `_team_id` NULL = máx. de todas sus membresías |
| max_permission_any_team, has_module_editor_any, has_module_approver_any | compara global / membresía NULL | máximo entre categorías, umbral de categoría |
| can_view_compras / can_edit_compras | exige lector/editor_global | lector/editor_categoria (máx.), comentario "temporal hasta que el módulo tenga categoría por registro" |
| can_view_users, is_user_admin | global | igual que arriba |
| can_edit_club_module, can_edit_module | global | igual |
| can_edit_announcement, can_view/edit_team_announcement | global para club | categoría (máx.) |
| can_edit_media_post, can_view/edit_team_media | global | categoría (máx.) |
| can_approve_request_type, request_type_approver_ids | global | categoría (máx.) |
| development_level, health_level, training_level | global / NULL | solo por categorías |
| coord_scope_ok, request_scope_ok | global + registro NULL (R) | registro NULL: ver = Ver en alguna; editar = Editar en TODAS |
| has_team_access, has_team_scope | membresía NULL = todas | solo membresías reales |
| can_view_event_new, can_view_request | registro NULL (R) | ver = Ver en alguna categoría |
| comunicados, multimedia, eventos, documentos (funciones y políticas) | registro NULL (R) | ver = Ver en alguna; editar = Editar en TODAS |
| notify_group, notify_calendar_event_* | registro NULL (R) | destinatarios = quien puede ver el registro |

Políticas RLS: announcements (insert/update/delete), calendar_events (4), documents (4), exercises (select/write), media_posts_insert, requests (select_club/update), role_perms_write_own_club, routine_exercises_select, training_routines.routines_select → sustituir comparaciones `_global` por el equivalente de categoría; las de registro NULL (R) se mantienen.

Código (sin cambiar pantallas ni rutas): `permissions.ts`, `useAccess.ts`, `members.helpers.ts`, `AppLayout.tsx`, `ModuleTabs.tsx`, `m.compras_facturas.tsx`, `m.comunicados.tsx`, `m.multimedia.tsx`, `MediaManagerPanel.tsx`, `AnnouncementFormDialog.tsx`, `TravelerPicker.tsx`, `admin.configuracion.tsx`, `MembersTab.tsx`, `MemberForm.tsx`, `EditMembershipDialog.tsx`, `AddMembershipDialog.tsx` → quitar opción "Todo el club" de membresías y chequeos de nivel global (salvo super admin). `get_my_access` mantiene su forma de salida.

## Paso 4 — Interfaz de permisos
- `RolePermissionsMatrix`: un selector por módulo Sin acceso · Ver · Editar; "Solo lo suyo (temporal)" solo si el valor guardado es vista_jugador. Interruptor "Asignar todas las categorías por defecto" en el encabezado del rol.
- `MemberForm` (crear) y ficha: interruptor "Todas las categorías" que sigue al rol pero editable; encendido muestra "Todas (incluye las nuevas)"; apagado, categorías con rol por cada una. Aviso de reemplazo de roles al encender.
- `UserAdvancedSettings`: columnas = categorías de la persona, filas = módulos, celda Sin acceso · Ver · Editar con valor del rol; cambiar guarda override con team_id, punto de color + "Volver al rol". Las 66 excepciones sin team_id se muestran en todas las columnas como "Excepción en todas las categorías".

## Paso 5 — Pruebas y entrega
1. Comparar `get_my_access` antes/después por persona y categoría (clase: nada / solo lo suyo / ver / editar) → tabla de diferencias.
2. Sebastian y Connor: Usuarios, Compras, Documentos igual en ambas categorías.
3. Categoría de prueba → los 3 Admin asignados → borrarla.
4. Persona de prueba con dos categorías y roles distintos; excepción en una celda afecta solo esa categoría. Borrarla al final.
5. Jugador ve lo mismo.
6. Cero membresías con team_id NULL y cero referencias activas a club_wide.
7. Acceso de más: para cada función con umbral cambiado (can_view_users, is_user_admin, can_view/edit_compras, can_edit_club_module, can_edit_module, comunicados, multimedia, can_approve_request_type, request_type_approver_ids, coord_scope_ok, request_scope_ok, development/health/training_level), tabla "quién pasa ANTES / DESPUÉS" con todos los usuarios del club, simulada antes de aplicar. Debe ser idéntica salvo los 3 Admin por la vía nueva. Si alguien nuevo pasa, no se habilita: en la misma migración su rol queda en Sin acceso en ese módulo, y se reporta.
- Agregar a AGENTS.md la regla "Todo es por categoría; 'Todas las categorías' es solo un interruptor que crea membresías".
- Reporte final: archivos/migraciones, tabla del Paso 3 con su estado final, resultados de pruebas.

## Nota
La super admin sigue con editor_global interno; ningún otro usuario recibe niveles globales.

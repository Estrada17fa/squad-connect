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
Para Emilio, Sebastian y Connor: encender interruptor con rol Admin → se crean Primer Equipo y Equipo Juvenil con su `job_title` → borrar su membresía `team_id NULL` (borrado por id). Después: restricción `team_memberships.team_id NOT NULL` (en migración posterior, ya sin filas nulas).

## Paso 3 — Quitar lo "global"
Inventario encontrado en la base viva. Distingo dos casos: (M) usa membresía sin categoría / nivel global → se cambia; (R) `team_id IS NULL` del **registro** ("Todo el club" en eventos, documentos, solicitudes) → no es membresía; la regla pasa de "exige global" a "máximo entre sus categorías".

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
| coord_scope_ok, request_scope_ok | global + registro NULL (R) | registro NULL: exige editor_categoria en alguna categoría (comportamiento actual de hecho; los hallazgos pendientes no se resuelven aquí) |
| has_team_access, has_team_scope | membresía NULL = todas | solo membresías reales |
| can_view_event_new, can_view_request, notify_group, notify_calendar_event_* | registro NULL (R) | sin cambio de lógica; se revisa que no dependan de membresía NULL |

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
- Agregar a AGENTS.md la regla "Todo es por categoría; 'Todas las categorías' es solo un interruptor que crea membresías".
- Reporte final: archivos/migraciones, tabla del Paso 3 con su estado final, resultados de pruebas.

## Nota
La super admin sigue con editor_global interno; ningún otro usuario recibe niveles globales.

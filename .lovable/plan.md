# Parte 1 — Nueva escala de permisos en paralelo (sin cambiar el comportamiento actual)

Al terminar esta parte, la app funciona **exactamente igual que hoy**: se agrega la escala nueva, se pueblan los datos y se crean funciones nuevas, pero ningún módulo, RLS ni pantalla las consume todavía.

## 1. Estado real verificado hoy

Consultado en la base de datos:

- Un solo club activo, 5 roles del sistema (Admin, Jugador, Médico, Staff, Técnico), 18 filas de permisos cada uno.
- Permisos actuales distintos de `none`:
  - Admin: `editor` en los 18 módulos.
  - Jugador: `read` en agenda, mes, entrenamientos. Todo lo demás `none` (incluye salud, desarrollo, plantel, nutrición).
  - Médico: **todo en `none`** (hoy no ve nada).
  - Staff: `read` en entrenamientos.
  - Técnico: `editor` en entrenamientos.
- 5 personas: 3 con rol Admin club-wide (2 son super admins), 1 Médico club-wide, 1 Jugador en la categoría "Liga Premier".
- 15 overrides personales, todos club-wide: e.estrada (none en plantel/salud/desarrollo) y prueba2@admin.com (varios none, `read` en coordinación e inventario, **`approver` en solicitudes**).
- Aprobadores por rol: Admin (7 tipos), Técnico (permiso, médica, cortesías), Médico (médica). Sin overrides de aprobador por usuario.

Consecuencia importante: aplicar la tabla de roles predefinidos **amplía** permisos para Médico, Técnico, Staff y Jugador respecto a lo que tienen hoy en la escala vieja. Como en la Parte 1 nada consume la escala nueva, no hay cambio visible; el cambio real de acceso ocurrirá en la Parte 2, módulo por módulo.

## 2. Escala nueva

Tipo `permission_level`: `sin_acceso`, `vista_jugador`, `lector_categoria`, `lector_global`, `editor_categoria`, `editor_global` (orden de menor a mayor para poder tomar máximos).

Sin catálogo de tipos de módulo. El significado concreto de `vista_jugador` se define por módulo en la Parte 2.

## 3. Almacenamiento

- `role_permissions`: nueva columna `level permission_level` (NOT NULL, default `sin_acceso`).
- `user_permission_overrides`: nueva columna `level permission_level` (NOT NULL, default `sin_acceso`).
- `access_level` **se conserva intacta** en ambas tablas durante las Partes 1–3 (comparación y rollback).

## 4. Tabla de permisos por defecto de los 5 roles

Se escriben en `role_permissions.level` para los roles con `is_system_default = true`, quedando editables desde la base (no cableados en código).

| módulo | Admin | Jugador | Médico | Técnico | Staff |
|---|---|---|---|---|---|
| plantel | editor_global | vista_jugador | lector_categoria | editor_categoria | lector_categoria |
| salud | editor_global | vista_jugador | editor_categoria | sin_acceso | sin_acceso |
| desarrollo | editor_global | vista_jugador | sin_acceso | editor_categoria | sin_acceso |
| nutricion | editor_global | vista_jugador | editor_categoria | sin_acceso | sin_acceso |
| entrenamientos | editor_global | vista_jugador | lector_categoria | editor_categoria | lector_categoria |
| tacticas | editor_global | vista_jugador | sin_acceso | editor_categoria | sin_acceso |
| torneo | editor_global | vista_jugador | lector_categoria | editor_categoria | lector_categoria |
| comunicados | editor_global | vista_jugador | lector_categoria | editor_categoria | lector_categoria |
| viajes | editor_global | vista_jugador | lector_categoria | lector_categoria | editor_categoria |
| agenda | editor_global | vista_jugador | lector_categoria | editor_categoria | lector_categoria |
| mes | editor_global | vista_jugador | lector_categoria | editor_categoria | lector_categoria |
| documentos | editor_global | sin_acceso | lector_categoria | lector_categoria | lector_categoria |
| inventario | editor_global | sin_acceso | lector_global | lector_global | editor_global |
| compras_facturas | editor_global | sin_acceso | sin_acceso | sin_acceso | editor_global |
| solicitudes | editor_global | lector_global | lector_global | lector_global | editor_global |
| usuarios | editor_global | sin_acceso | sin_acceso | sin_acceso | sin_acceso |
| coordinacion_interna | editor_global | sin_acceso | lector_global | lector_global | lector_global |
| multimedia | editor_global | vista_jugador | lector_categoria | lector_categoria | lector_categoria |

Notas de lectura: "lector"/"editor" sin categoría en tu especificación (inventario, compras, solicitudes, coordinación) se interpreta como global, por ser módulos de club. `coordinacion_interna` y `multimedia` no venían en tu lista; propongo esos valores y los ajusto si prefieres otros.

## 5. Migración de datos, en una sola transacción

Orden y reglas:

1. Se crea el tipo y las columnas.
2. Roles con `base_role` en (admin, jugador, medico, tecnico, staff) → se les escribe la tabla del punto 4 tal cual (esto cubre los 5 roles existentes).
3. Roles personalizados futuros/otros (hoy no hay ninguno) → traducción determinista desde `access_level`: `none`→`sin_acceso`; `read`→`lector_categoria`; `editor`/`approver`→`editor_categoria`; y para módulos de club (inventario, compras_facturas, solicitudes, documentos, usuarios, coordinacion_interna, torneo, comunicados) se eleva a `lector_global`/`editor_global`.
4. `user_permission_overrides` → misma traducción determinista por fila, con una salvedad: en salud, desarrollo y nutrición, un `read` de un usuario cuyo único rol base es jugador se traduce a `vista_jugador`, nunca a `lector_categoria`.
5. `approver` viejo → `editor_*`. `role_request_approvals` y `request_type_user_overrides` no se tocan.
6. Membresías club-wide (`team_id NULL`) se conservan; el alcance amplio lo resuelve la función efectiva.

Verificaciones que abortan la transacción:

- Ninguna fila de `role_permissions` ni de `user_permission_overrides` con `level` nulo.
- Ninguna fila con `access_level <> 'none'` que quede en `sin_acceso`, salvo la excepción explícita de Jugador → documentos (que hoy ya está en `none`, así que no debe dispararse).
- Todo rol o usuario con aprobaciones vigentes queda como `editor_categoria` o `editor_global` en el módulo del tipo de solicitud; si alguno queda por debajo, se eleva y se vuelve a verificar.
- Conteo de filas antes/después idéntico.

## 6. Lista de privacidad para tu confirmación (módulos personales)

Resultado que produciría la migración en salud, desarrollo y nutrición, persona por persona (datos reales de hoy):

| persona | rol / alcance | salud | desarrollo | nutricion |
|---|---|---|---|---|
| estradaemilio7@gmail.com | Admin club-wide + super admin | editor_global | editor_global | editor_global |
| e.estrada@loscabosunited.mx | Admin club-wide + super admin, con overrides `none` | override sin_acceso (super admin lo sobrepasa) | override sin_acceso (super admin lo sobrepasa) | editor_global |
| prueba2@admin.com | Admin club-wide, con overrides `none` | **sin_acceso** | **sin_acceso** | **sin_acceso** |
| prueba@doctor.com | Médico club-wide | editor_categoria | sin_acceso | editor_categoria |
| prueba1@jugador.com | Jugador, categoría Liga Premier | **vista_jugador** | **vista_jugador** | **vista_jugador** |

Ningún jugador queda en `lector_categoria` o superior en módulos personales. Ningún usuario no-médico y no-admin queda viendo salud ajena. Puntos a confirmar:

- Los 2 super admins siguen viendo todo por ser super admin, aunque tengan overrides en `none`. ¿Lo dejamos así?
- El Médico hoy no tiene ningún permiso; con la tabla nueva pasa a editor de salud y nutrición de sus categorías. Como es club-wide, eso alcanza todas las categorías. ¿Correcto?

No aplico nada hasta que confirmes esta tabla.

## 7. Funciones helper nuevas (no reemplazan a ninguna vieja)

- `effective_permission(_user uuid, _module text, _team uuid) → permission_level`: super admin → `editor_global`; si no, máximo entre el nivel del rol de cada membresía aplicable (club-wide aplica a cualquier `team_id`), luego se aplican overrides club y después overrides de esa categoría (el override pisa, no se suma).
- `can_view_module(_user, _module, _team) → bool`: nivel distinto de `sin_acceso`.
- `can_edit_module(_user, _module, _team) → bool`: nivel en (`editor_categoria`, `editor_global`).
- `can_view_own_row(_user, _module, _owner uuid, _team) → bool`: true si el nivel es de lectura amplia, o si es `vista_jugador` y `_owner = _user`.
- `max_permission_any_team(_user, _module) → permission_level`: máximo sobre todas las membresías, para navegación y chips.

Todas `security definer`, `stable`, `set search_path = public`, con nombres nuevos que no chocan con los actuales.

## 8. Inventario de lo que tocará la Parte 2 (no se cambia ahora)

Funciones SQL viejas y quién las usa:

| función vieja | módulos / tablas que dependen |
|---|---|
| `has_module_access` | navegación y RLS genéricas |
| `has_module_editor`, `has_module_editor_any` | documentos, inventario, compras, coordinación, tareas, juntas |
| `has_module_approver_any`, `can_approve_request_type`, `request_type_approver_ids`, `request_approver_module` | solicitudes |
| `can_access_health`, `can_edit_health`, `health_level` | salud: injuries, injury_progress, medical_checkups, medical_prescriptions, player_medical_profile |
| `can_edit_development`, `development_level` | desarrollo: development_goals/feedback/assessments, assessment_scores, training_routines, routine_assignments, routine_exercises |
| `can_view_training`, `can_edit_training`, `can_view_training_club`, `can_edit_training_club`, `training_level` | entrenamientos: exercises, training_sessions, session_exercises |
| `can_view_trip`, `can_edit_trip` | viajes y sus 13 tablas de logística |
| `can_view_request` | solicitudes, request_comments, request_status_history |
| `has_team_access`, `has_team_scope`, `has_club_access`, `user_sees_all_club`, `is_player_only`, `has_event_access` | plantel, agenda/mes, calendar_events, event_attendees, notificaciones |

Frontend a reemplazar en la Parte 2:

- `src/hooks/useAccess.ts` (construye `permissions` y `permissionsByTeam` con la escala vieja).
- `src/hooks/useTeamAccess.ts` (`levelForTeam`, `canEditTeam`, `canReadTeam`).
- `src/hooks/useEditableTeams.ts`.
- `src/components/squad/AppLayout.tsx`: `getModuleAccess`, `isModuleAccessible`, navegación y chips.
- `src/lib/rolePages.ts` (mapa de páginas por rol base).
- Vistas de módulo que hoy comparan contra `editor`/`approver`: plantel, salud, desarrollo, entrenamientos, viajes, inventario, compras, solicitudes, documentos, coordinación, agenda/mes, usuarios.
- Matriz de permisos en `/m/usuarios` (pasa a los 6 niveles en la Parte 3).

## 9. Cómo garantizo que la app siga igual

- No se elimina ni se modifica ninguna función SQL existente.
- No se cambia ninguna política RLS.
- No se modifica ningún archivo de `src/`: la escala nueva vive solo en la base.
- `access_level` sigue siendo la única columna leída por el código actual; `level` queda como dato inerte.
- Rollback: borrar las columnas `level` y las 5 funciones nuevas devuelve el sistema a su estado exacto de hoy.

## 10. Orden de ejecución al aprobar

1. Confirmas la tabla de privacidad del punto 6 y las dos preguntas abiertas.
2. Migración única: tipo, columnas, poblado, verificaciones, funciones helper.
3. Reporte posterior: nivel resultante por rol y por usuario en los 18 módulos, para revisión antes de arrancar la Parte 2.

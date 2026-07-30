## Estado actual verificado

Hoy `can_approve_request_type(user, tipo, solicitante)` exige nivel Aprobar en el módulo del área (`request_approver_module`: médica→Salud, compra/pago/reembolso→Compras y facturas, material→Inventario, permiso/cortesías/otro→Coordinación interna) y ya bloquea al propio solicitante. Es implícito y no se ve en pantalla. Se sustituye por el modelo rol + ajuste por persona.

## 1. Base de datos (una migración)

**`role_request_approvals`** (`role_id`, `request_type`), única por par. Lectura para los miembros del club del rol; escritura solo super admin o editor de `usuarios`. Con GRANT y RLS.

**`request_type_user_overrides`** (`club_id`, `request_type`, `user_id`, `mode` con enum `grant`/`revoke`, `assigned_by`, `created_at`), única por (club, tipo, usuario). Lectura: la persona misma y quien pueda gestionar usuarios del club; escritura solo super admin o editor de `usuarios`. Con GRANT y RLS.

**`can_approve_request_type` reescrita**, en este orden exacto:
1. Es el solicitante → falso, siempre.
2. Super admin → verdadero.
3. Override `revoke` de ese tipo en su club → falso.
4. Override `grant` de ese tipo en su club → verdadero.
5. Alguna membresía del usuario en su club con un rol que tenga ese tipo en `role_request_approvals` → verdadero.
6. Si no → falso.

**`request_type_approver_ids(club, tipo)`**: (aprobadores por rol − `revoke`) ∪ `grant`. Es la única fuente para la UI, así servidor y pantalla no divergen.

**Semilla**: se insertan en `role_request_approvals` los tipos cuyo módulo asociado ya tiene nivel Aprobar en cada rol, para no perder la configuración vigente. La tabla de overrides nace vacía.

Las políticas de `requests` y el trigger `requests_status_guard` ya llaman a `can_approve_request_type`: heredan el cambio sin tocarse.

## 2. Interfaz

**Roles** (`PermissionsMatrix` en `/m/usuarios`): bajo la matriz de módulos, bloque "Aprueba solicitudes de" con los 8 tipos como checkboxes. Se guarda con el mismo botón Guardar de permisos, en una sola operación junto a `role_permissions`. Solo editable con permiso de edición de roles.

**Ficha de miembro** (`MembersTab`, panel del miembro seleccionado): sección "Aprobador de solicitudes" con los 8 tipos. Cada fila muestra el estado efectivo y su origen:
- "Aprueba (por su rol)" → acción "Quitar solo a esta persona" (crea `revoke`).
- "No aprueba (su rol no lo cubre)" → acción "Dar solo a esta persona" (crea `grant`).
- Con override: etiqueta "Ajustado manualmente" y acción "Volver al comportamiento por rol" (elimina el override).

Visible y editable solo para editor de `usuarios` o super admin.

**Detalle de solicitud** (`RequestDetailSheet`): línea "Aprueban: nombres…" con la lista efectiva del servidor, y aviso ámbar cuando nadie puede aprobarla.

No se crean pestañas nuevas.

## 3. Archivos

- Migración SQL descrita arriba.
- Nuevo `src/hooks/useRequestApprovers.ts`: tipos por rol, overrides por persona, estado efectivo por miembro, lista efectiva por tipo, mutaciones y realtime.
- Editados: `src/routes/_authenticated/m.usuarios.tsx` (checklist en la matriz de roles), `src/components/usuarios/MembersTab.tsx` (sección por persona), `src/components/solicitudes/RequestDetailSheet.tsx` (línea "Aprueban" + aviso), `src/lib/requestTypes.ts` (`approverModule` pasa a ser solo informativo).

## Objetivo

Permitir que cada club personalice qué ve y qué puede editar cada rol (Técnico, Utilero, Médico, etc.), sin que otros clubes se vean afectados. Todo vive dentro del módulo **Usuarios** (`/m/usuarios`), que hoy es un placeholder.

## Alcance

- Un Admin del club (con `editor` en `usuarios`) puede: crear, renombrar y eliminar roles del club; y, por cada rol, marcar el nivel de acceso (`none` / `read` / `editor` / `approver`) en cada uno de los 16 módulos.
- Los roles de sistema (`is_system_default = true`) no se pueden eliminar ni renombrar, pero **sí** se pueden editar sus permisos (es justo el caso del ejemplo: el Utilero de un club ve cosas distintas al de otro).
- Cambios se reflejan al instante para los usuarios asignados (invalidamos `useAccess` y usamos realtime en `role_permissions`).
- El módulo respeta multi-club: cada Admin solo ve/edita roles de su club (RLS ya lo hace); Super Admin ve todos.

## Cambios de datos (una sola migración pequeña)

Ajustar RLS de `roles` y `role_permissions` para que escrituras exijan `has_module_editor_any(auth.uid(), 'usuarios')` en vez de "cualquier miembro del club". Lecturas siguen igual (todo el club). Sin tablas nuevas.

## Cambios de UI

1. **`src/routes/_authenticated/m.usuarios.tsx`** (nuevo, reemplaza el fallback de `/m/$module`): dos pestañas — "Miembros" (placeholder por ahora, se llenará después) y **"Roles y permisos"**.
2. **Pestaña Roles y permisos**:
   - Lista de roles del club como `StandardCard` con badge "Sistema" si aplica.
   - Al seleccionar un rol, panel derecho (o sheet en móvil) con una matriz compacta: fila por módulo (con su ícono + `scope`), un `Select` con los 4 niveles.
   - Botón "Guardar cambios" hace `upsert` masivo a `role_permissions` (una fila por módulo).
   - Botones "Nuevo rol" / "Renombrar" / "Eliminar" (deshabilitado para `is_system_default`).
3. **`useAccess`**: al detectar cambios en `role_permissions` del club (realtime), invalidar la query para que la navegación de cada usuario se recalcule sin logout.

## Fuera de alcance

- Gestión de miembros (invitar, cambiar rol de un usuario existente) — irá después dentro de la misma pestaña "Miembros".
- Permisos por recurso individual (ej. "solo tareas creadas por mí"): seguimos con el modelo `module_key + access_level`.
- Duplicar rol / plantillas entre clubes.

## Verificación

- Como Admin de un club, cambio "Utilero → Calendario" de `read` a `editor` y el utilero de ese club ve el botón de crear evento; el utilero de otro club no cambia.
- Como usuario sin `editor` en `usuarios`, la pestaña "Roles y permisos" se muestra en solo-lectura (sin guardar/nuevo/eliminar).
- Correr linter de seguridad tras la migración.

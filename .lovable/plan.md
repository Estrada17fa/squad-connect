# Foto de perfil en el menú del avatar

El botón redondo del header (arriba a la derecha) hoy siempre muestra la primera letra del nombre. Pasa a mostrar la foto de perfil cuando la persona tiene una, y mantiene la letra como respaldo cuando no hay foto o la imagen falla al cargar.

## Qué cambia

- El disparador del menú se convierte en el mismo avatar que usa el resto de la app: imagen circular de 36 px con iniciales de respaldo.
- Dentro del menú desplegable, junto al nombre, también se muestra la miniatura para que quede claro de quién es la sesión. Las opciones siguen siendo exactamente dos: "Mi perfil" y "Cerrar sesión".
- Al cambiar la foto desde Mi perfil, el header se actualiza solo (ya se refresca la consulta de acceso al guardar).

## Detalles técnicos

- `src/hooks/useAccess.ts`: la consulta de `profiles` incluye `avatar_url` y el objeto `profile` que expone el contexto lo devuelve.
- `src/components/squad/AppLayout.tsx`: el tipo `AppCtx["profile"]` gana `avatar_url`; `Header` recibe una prop `avatarUrl` y el `DropdownMenuTrigger` renderiza `Avatar` + `AvatarImage` con `AvatarFallback` de iniciales (el fallback de shadcn ya cubre el caso de imagen rota).

Sin migraciones ni cambios de permisos.

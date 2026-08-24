# Sin verificación de correo + cambio de contraseña obligatorio en el primer acceso

## 1. Quitar la verificación de correo

Activar la confirmación automática de correo en la configuración de autenticación del backend: las cuentas quedan válidas al instante, sin correo de verificación ni pantalla de "revisa tu correo".

En la pantalla de acceso se elimina el mensaje "Cuenta creada. Revisa tu correo para confirmar tu registro." porque ya no aplica: tras crear la cuenta se entra directo.

Nota: las cuentas que crea un administrador desde Usuarios ya se creaban confirmadas, así que ese flujo no cambia.

## 2. Cambio de contraseña obligatorio la primera vez

Comportamiento: cuando un administrador crea un miembro (o le asigna una contraseña nueva), ese usuario, al iniciar sesión, ve una pantalla que solo permite definir su nueva contraseña. No puede navegar a ningún módulo hasta hacerlo. Al guardarla, entra normal a la app y no se le vuelve a pedir.

Piezas:

- Nuevo campo `must_change_password` en el perfil (por defecto activo para miembros creados por un admin).
- Se marca como activo al crear un miembro y también cuando un admin cambia la contraseña de alguien desde la ficha del miembro.
- Al iniciar sesión, si el campo está activo, la app muestra la pantalla de "Crea tu contraseña" en lugar del contenido normal.
- Al guardar la nueva contraseña (mínimo 8 caracteres, con confirmación), se actualiza la contraseña y el campo se desactiva.
- Si el usuario cambia su contraseña por su cuenta desde Mi Perfil, también se desactiva.

## Detalles técnicos

- `supabase--configure_auth` con `auto_confirm_email: true`, sin tocar el resto de banderas.
- Migración: `ALTER TABLE public.profiles ADD COLUMN must_change_password boolean NOT NULL DEFAULT false;` (los perfiles existentes quedan en `false` para no bloquear al admin actual). Las políticas actuales de `profiles` ya permiten que cada usuario lea y actualice su propia fila; se revisa que la política de update lo cubra y, si no, se ajusta solo para este campo.
- `src/lib/members.functions.ts`: en `createClubMember` incluir `must_change_password: true` en el update de perfil; en `updateClubMember`, cuando venga `data.password`, marcarlo también en `true`.
- Nueva ruta protegida `src/routes/_authenticated/cambiar-contrasena.tsx` con el formulario (usa el estándar visual existente: tarjeta glass, sin emojis).
- Guardado: `supabase.auth.updateUser({ password })` y luego `profiles.update({ must_change_password: false })` sobre la propia fila.
- Bloqueo: en `src/components/squad/AppLayout.tsx`, donde ya se carga el perfil del usuario, si `must_change_password` es `true` y la ruta actual no es la de cambio de contraseña, redirigir a `/cambiar-contrasena` y no renderizar el resto del layout (sin barra inferior ni cabecera con navegación, para que sea realmente obligatorio).
- `src/routes/auth.tsx`: quitar la rama del mensaje de confirmación por correo.

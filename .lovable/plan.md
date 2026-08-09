# Perfil de usuario: foto con recorte, Mi Perfil y menú del avatar

Tres cambios acotados, siguiendo el diseño del módulo Usuarios (secciones etiqueta‑valor, lectura primero + botón Editar, sin emojis).

## 1. Foto de perfil como archivo, con recorte

- Nuevo bucket `avatars` (público) para que el avatar se vea en toda la app sin URLs firmadas, igual que hoy: los componentes ya pintan `profiles.avatar_url` directo. Si la organización bloquea buckets públicos, lo aviso y pasamos a URL firmada centralizada.
- Componente nuevo `AvatarUploadField`: botón "Subir foto" → selector de archivo → diálogo de recorte cuadrado (zoom + arrastre, guía circular igual a la miniatura) → recorta a 512×512 en canvas, sube como JPG a `avatars/<user_id>/<timestamp>.jpg` y guarda la URL pública en `avatar_url`. Incluye "Quitar foto".
- Se usa en dos sitios: `MemberForm` (alta/edición de miembro por un Editor global) y Mi Perfil. Desaparece el campo de texto "Foto de perfil (URL)".
- RLS de `storage.objects`: cada persona escribe solo en su carpeta; un editor global de usuarios puede escribir en cualquiera; lectura pública del bucket.

## 2. Mi Perfil: ve todo, edita poco

Se rehace la página con el patrón de ficha del módulo Usuarios:

- Cabecera con avatar grande, nombre, badges de estado y rol.
- Secciones **solo lectura**: Datos personales (nombre completo, fecha y lugar de nacimiento, nacionalidad), Membresías (categoría · rol · puesto), Datos deportivos si es jugador (dorsal, posición, pie, estatus, medidas), más las secciones ya existentes de Salud, Desarrollo y Documentos.
- Sección **editable** (botón "Editar" que abre el formulario): foto, correo, teléfono, contacto de emergencia (nombre y teléfono) y contraseña.
  - Correo y contraseña se cambian con `supabase.auth.updateUser`; el correo se sincroniza en `profiles` tras confirmarse.
  - El resto (rol, categorías, puesto, datos deportivos) se muestra con una nota: solo lo cambia un Editor global de Usuarios.
- Nada de esto toca RLS: `profiles` ya permite a cada quien actualizar su propia fila.

## 3. Menú del avatar

En `AppLayout`, el desplegable queda con exactamente dos opciones: "Mi perfil" y "Cerrar sesión". Se quitan la etiqueta de cuenta y el acceso extra que aparece hoy (el resto de la navegación no cambia).

## Detalles técnicos

- Nuevos: `src/components/perfil/AvatarUploadField.tsx`, `src/components/perfil/ImageCropDialog.tsx` (canvas puro, sin dependencias nuevas), `src/lib/avatars.ts` (subida + URL pública), `src/components/perfil/MyProfileEditSheet.tsx`.
- Editados: `src/routes/_authenticated/mi-perfil.tsx`, `src/components/usuarios/MemberForm.tsx`, `src/components/squad/AppLayout.tsx`.
- Fechas con el formato del club (`formatShortDate`), como en Usuarios.
- Sin cambios en permisos de módulos ni en otros módulos.

## Verificación

- Subir y recortar foto desde Mi Perfil y desde el alta de miembro; comprobar que se ve en lista, ficha y header.
- Con sesión de jugador: ve todos sus datos, solo puede editar los cinco campos permitidos.
- Menú del avatar con dos opciones.

# Regla única de contraseña en los 3 lugares

## Regla (una sola, compartida)

Mínimos obligatorios: 8+ caracteres, al menos 1 número, 1 minúscula y 1 mayúscula.
Se acepta **cualquier** carácter: letras acentuadas, espacios y símbolos (`!@#$%&*` etc.) son válidos y **no** se exigen. No habrá ninguna lista de caracteres permitidos ni expresión que rechace símbolos: la validación solo comprueba longitud y presencia de los tres tipos, nunca la ausencia de otros.

## Qué se construye

1. **Validador compartido** (`src/lib/password.ts`): devuelve la lista de requisitos con su estado (cumplido/no) y los mensajes concretos que faltan ("Falta una mayúscula", "Falta un número", "Mínimo 8 caracteres"). Se reutiliza en los 3 formularios y en la validación de servidor (esquemas de miembros), para que cliente y servidor exijan lo mismo.

2. **Checklist en vivo** (`PasswordRequirements`): lista visible siempre bajo el campo, con los 4 requisitos marcándose en verde mientras se escribe, más la nota "Puedes usar símbolos, no son obligatorios".

3. **Los 3 lugares**
   - **Primer inicio de sesión** (`/cambiar-contrasena`): sustituir la regla actual (solo 8 caracteres) por la regla única + checklist visible.
   - **Mi perfil** (sección de cambio de contraseña): misma regla, mismo checklist, mismos mensajes.
   - **Admin cambia la contraseña de un usuario** (Usuarios → editar miembro): la opción ya existe (el formulario de edición tiene campo de contraseña que actualiza la del usuario y le fuerza el cambio en el siguiente acceso). Se le aplica la misma regla y checklist; se mantiene vacío = no cambiar.

4. **Mensajes de error específicos**: el botón se deshabilita hasta cumplir, y si el backend rechaza (por ejemplo una contraseña filtrada en brechas conocidas, protección que está activa en la cuenta), se muestra un texto claro en español en lugar del error crudo.

## Nota técnica

Fuente de verdad: `src/lib/password.ts` (`checkPassword` → requisitos + `isValid`), consumido por `cambiar-contrasena.tsx`, `mi-perfil.tsx`, `MemberForm.tsx` y `members.schemas.ts` (Zod `superRefine` con el mismo validador). No se toca lógica de permisos ni de negocio.

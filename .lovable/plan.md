# Quitar el registro público: solo inicio de sesión

Como el administrador es quien crea a los usuarios, la pantalla de acceso dejará de ofrecer la creación de cuentas.

## Cambios

1. **Pantalla de acceso (`/auth`)**
   - Eliminar la pestaña "Crear cuenta" y todo el modo de registro (campo de nombre, texto de confirmación por correo).
   - Queda un único formulario: correo + contraseña, botón "Iniciar sesión".
   - Se conserva el enlace de "¿Olvidaste tu contraseña?" si existe, y el cambio forzoso de contraseña en el primer acceso.

2. **Invitaciones por enlace (`/invite/:token`)**
   - Se mantiene tal cual: ese flujo sí crea la cuenta, pero solo con un token de invitación válido emitido por un admin.

## Nota técnica

No se desactiva el registro a nivel de backend, porque el alta de miembros por parte del admin y el flujo de invitación dependen de esa capacidad. La vía pública de registro desaparece de la interfaz.

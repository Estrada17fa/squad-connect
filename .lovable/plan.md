# Ajustes al alta de miembro

## 1. Contacto de emergencia opcional
- Nombre y teléfono del contacto de emergencia pasan a "(opcional)" en alta y en Editar; dejan de bloquear "Siguiente" y ya no muestran "Falta completar". Si se escribe un teléfono, se sigue validando su formato.

## 2. Contraseña inicial: tres opciones (paso 4 y Restablecer)
Control segmentado con:
- **Contraseña del club** (por defecto). Si el servidor no la tiene configurada: opción deshabilitada con aviso "Configura la contraseña del club", y se selecciona "Generar aleatoria".
- **Escribir una**: campo con mínimo 8 caracteres, botón mostrar/ocultar, error corto si es menor.
- **Generar aleatoria**: la actual, con botón para regenerar.

En las tres, `must_change_password = true` como hoy.

Restablecer contraseña desde la ficha abre una hoja con el mismo control antes de confirmar.

## 3. Secreto del servidor
- Nuevo secreto `DEFAULT_MEMBER_PASSWORD`; te pediré el valor con el formulario seguro (nunca pasa por el chat ni por el código).
- El navegador envía solo `passwordMode: "club" | "custom" | "random"` (y la contraseña cuando es custom/random). Con "club", `createClubMember` y `updateClubMember` leen el secreto dentro del servidor.
- Nueva función de solo lectura `getClubPasswordStatus` que devuelve únicamente `{ configured: boolean }` (requiere permiso de editar Usuarios).
- Pantalla "Listo" / "Contraseña restablecida": la función responde con la contraseña aplicada solo a quien hizo la acción (ya autorizado como editor de Usuarios), para copiarla o enviarla por WhatsApp como hoy. No se guarda en ningún lado del navegador.
- `/m/usuarios` sigue enviando contraseña directa (modo custom implícito), sin cambios de comportamiento.

## Entrega
- Capturas 375×667 del paso 4 con cada opción (incluida la deshabilitada si falta el secreto) y de "Listo" — para "Listo" crearé un miembro de prueba y lo eliminaré después, verificando que no quede rastro.
- Búsqueda en todo el repositorio confirmando que el valor de la contraseña del club no aparece en ningún archivo.

## Detalles técnicos
- `members.schemas.ts`: `password` opcional + `passwordMode` con refinamiento (custom/random requieren password válido; club no lo acepta).
- `members.functions.ts`: helper server-only `resolvePassword(mode, pw)` que lee `process.env.DEFAULT_MEMBER_PASSWORD` en el handler; error claro si falta. Devuelve `appliedPassword` en la respuesta.
- `PersonFields.tsx`: quitar emergencia de requeridos.
- Nuevo `PasswordChoice.tsx` en `src/components/admin/users/`, usado en `nuevo.tsx` y en `$userId.index.tsx`.

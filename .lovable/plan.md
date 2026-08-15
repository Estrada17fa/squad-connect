# Notificaciones separadas y acceso a Solicitudes desde el avatar

Dos ajustes de experiencia. Confirmo: se reutiliza el módulo Solicitudes ya construido (no se duplica vista ni permisos) y la separación de notificaciones usa la tabla `notifications` actual — no hay cambios de base de datos ni de RLS.

## 1. Centro de notificaciones: nuevas vs. leídas

Estado actual (verificado): el panel de la campana lista las 100 más recientes en un solo bloque; ya marca leído al tocar, ya tiene "Marcar todas" y el badge ya cuenta solo las no leídas, pero no hay separación visual entre nuevas y pasadas.

Cambios en el panel:

- Dos pestañas arriba: **Nuevas** (no leídas, con su número) y **Todas**.
- Dentro de "Todas", las notificaciones se agrupan con encabezados de sección: **Nuevas** primero y **Anteriores** después, para que se escaneen sin perder el historial.
- La no leída conserva y refuerza su distinción: punto verde, fondo destacado y título en negritas; la leída queda en tono apagado.
- Se añade un **icono por tipo** a la izquierda de cada renglón (solicitud, tarea, junta, partido, viaje, préstamo, comunicado, salud, etc.), tomado del catálogo de módulos que ya existe, así que es icono, nunca emoji.
- Tiempo relativo ("Hace 2 h") y navegación al detalle: se mantienen igual que hoy.
- "Marcar todas como leídas" queda visible en el encabezado siempre que haya no leídas; en la pestaña "Nuevas", al vaciarse, aparece un estado vacío propio ("Estás al día").
- Al tocar una notificación se marca leída (comportamiento actual) y, si estabas en "Nuevas", desaparece de esa lista pero sigue en "Todas".

## 2. "Mis Solicitudes" en el menú del avatar

Estado actual (verificado): un jugador con acceso a Solicitudes ve una página completa en la barra inferior etiquetada "Mis Solicitudes" (la página Coordinación en su variante de jugador). Eso ocupa un espacio de navegación que el jugador casi no usa.

Cambios:

- En el menú del avatar, entre "Mi perfil" y "Cerrar sesión", se agrega **"Mis Solicitudes"** con icono de portapapeles, que abre directo el módulo Solicitudes ya existente en su modo Vista Jugador (solo las suyas, con su botón de crear).
- La entrada aparece **solo** cuando la persona tiene acceso a `solicitudes` en nivel Vista Jugador y **no** tiene la página Coordinación en su navegación. Quien entra por Coordinación no la ve.
- Para que no haya doble acceso, la variante "Mis Solicitudes" de la barra inferior deja de generarse para el jugador: su punto de entrada pasa a ser el avatar. El resto de las páginas del jugador (Inicio, Agenda, Mi Club) no cambia.
- Si un jugador tuviera además otro módulo de Coordinación accesible (por ejemplo Partidos por un override), se conserva la página Coordinación y entonces no se muestra la entrada del avatar.

## Detalles técnicos

- `src/components/notificaciones/NotificationBell.tsx`: se reestructura el contenido del sheet con pestañas y secciones; se extrae un `NotificationRow` de presentación y un mapa `tipo → icono`. Sin cambios en el hook salvo exponer las listas ya derivadas.
- `src/hooks/useNotifications.ts`: se añaden `unread` y `read` derivados de `items` (memo), sin tocar consultas ni realtime.
- `src/lib/rolePages.ts`: la rama `variant: "jugador-solicitudes"` deja de emitir la página cuando el único módulo accesible de Coordinación es `solicitudes`; se expone un helper para saber si la persona necesita el atajo del avatar.
- `src/components/squad/AppLayout.tsx`: nueva entrada en el `DropdownMenu` del avatar, condicionada por ese helper, que enlaza a `/m/solicitudes`.
- `src/routes/_authenticated/coordinacion.tsx`: se conserva el redireccionamiento existente para no romper enlaces antiguos.

## Cómo verificamos

- Con notificaciones mezcladas: el badge coincide con el conteo de "Nuevas"; tocar una la mueve a "Anteriores"; "Marcar todas" vacía la pestaña "Nuevas".
- Sesión de jugador: no aparece la pestaña inferior de Solicitudes, sí la entrada en el avatar, y al abrirla ve solo sus solicitudes y puede crear una.
- Sesión de staff/admin: el avatar no muestra la entrada extra y Coordinación sigue igual.

## Fuera de alcance

Cambios en la tabla `notifications`, en los disparadores que las generan, o en la lógica y RLS del módulo Solicitudes.

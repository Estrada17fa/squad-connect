# Arreglar el error de privacidad al publicar en Multimedia

## Qué está pasando

Al subir la foto, el archivo sí se guarda en el almacenamiento, pero el registro de la publicación es rechazado por la regla de privacidad de la tabla de publicaciones (error 42501, "row-level security"). Por eso la app borra el archivo recién subido y muestra el error.

Diagnóstico **no confirmado todavía**: revisé la regla de inserción y, evaluada con tu usuario, tu club y una publicación "Todo el club", todas sus condiciones dan verdadero (eres super admin, tienes acceso al club y nivel editor global en multimedia). Es decir, la causa no es lo obvio, así que hay que reproducirlo antes de tocar nada.

## Plan

1. **Reproducir el fallo con una sesión real firmada** (navegador automatizado dentro del entorno): crear una publicación igual a la que falló (tipo Partido, ligada a un partido, dirigida a "Todo el club") y capturar el error exacto del servidor, incluyendo si viene de la inserción en sí, de la lectura de vuelta de la fila creada, o del disparador de notificaciones que corre solo cuando la audiencia es "Todo el club".
2. **Identificar la causa exacta** entre los tres candidatos:
   - la condición de escritura de la publicación,
   - la condición de lectura (la app pide de vuelta la fila creada; si la regla de lectura no la deja ver, el servidor devuelve el mismo tipo de error),
   - el disparador que genera la notificación de "Nueva publicación" para todo el club.
3. **Aplicar el arreglo mínimo** en la capa que corresponda: ajustar la regla implicada (sin abrirla de más: se mantiene que solo editor de categoría/global pueda publicar, y que "Todo el club" siga siendo exclusivo de editor global), o ajustar la llamada del cliente si el problema es la lectura de vuelta.
4. **Verificar publicando de verdad** desde una sesión firmada: la publicación aparece en la gestión de Coordinación y en el feed de Mi Club, con su archivo visible, y no queda basura en el almacenamiento.

## Detalles técnicos

- Tabla `media_posts`, política `media_posts_insert` (WITH CHECK) y `media_posts_select` (`can_view_media_post`).
- Disparador `media_posts_notify` → `notify_media_post_club()` → `notify_group(...)` solo con `audience = 'club'`.
- El insert del cliente usa `.select("id").single()`, por lo que también depende de la política de lectura.
- No se cambian permisos de módulo ni la ubicación del módulo; solo la causa del rechazo.

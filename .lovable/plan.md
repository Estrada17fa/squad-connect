# Actualizar íconos de la app (LOGO2)

Reemplazar los 4 íconos actuales por los archivos nuevos que subiste, tal cual, sin regenerarlos ni recortarlos.

## Qué cambia

| Archivo subido | Se copia a |
| --- | --- |
| LOGO2_apple-touch-icon.png | public/icons/apple-touch-icon.png |
| LOGO2_icon-192.png | public/icons/icon-192.png |
| LOGO2_icon-512.png | public/icons/icon-512.png |
| LOGO2_icon-maskable-512.png | public/icons/icon-maskable-512.png |

## Qué NO cambia

- `public/manifest.webmanifest` ya apunta a esas rutas (mismos nombres): no se toca.
- Las meta tags de iOS/Android en `src/routes/__root.tsx` siguen igual.
- Ningún otro archivo ni lógica de la app.

## Nota

En iPhone/Android el ícono viejo puede quedar en caché: hay que quitar el acceso directo y volver a agregar el sitio publicado a la pantalla de inicio para ver el nuevo logo.

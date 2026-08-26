# Actualizar íconos de la app (LOGO3)

Reemplazar los 4 íconos actuales de la pantalla de inicio por la versión LOGO3 (escudo verde sobre fondo negro, sin texto).

## Qué cambia
- `public/icons/icon-192.png` ← LOGO3_icon-192.png
- `public/icons/icon-512.png` ← LOGO3_icon-512.png
- `public/icons/icon-maskable-512.png` ← LOGO3_icon-maskable-512.png
- `public/icons/apple-touch-icon.png` ← LOGO3_apple-touch-icon.png

Se conservan los mismos nombres de archivo, así que el manifest y las meta tags del head no se tocan.

## Detalles técnicos
- Copia directa desde los archivos subidos, sin regenerar ni redimensionar.
- Se actualiza también `public/favicon.png` con la versión de 192px para que el ícono del navegador coincida.
- Nota: en iPhone/Android el ícono ya instalado puede tardar en refrescarse; conviene reinstalar el acceso directo tras publicar.

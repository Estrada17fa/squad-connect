# Actualizar los íconos de la PWA

Reemplazar los 4 íconos actuales por los nuevos archivos que subiste, tal cual, sin regenerarlos ni recortarlos.

## Cambios

Sobrescribir en `public/icons/`:

- `icon-192.png` ← `icon-192-2.png`
- `icon-512.png` ← `icon-512-2.png`
- `icon-maskable-512.png` ← `icon-maskable-512-2.png`
- `apple-touch-icon.png` ← `apple-touch-icon-2.png`

Se mantienen los mismos nombres de archivo, así que no hay que tocar `public/manifest.webmanifest` ni el head en `src/routes/__root.tsx`.

## Notas

- El favicon del navegador sigue siendo el logo actual (`squad-logo`); si también lo quieres cambiar al nuevo ícono, dímelo.
- El ícono nuevo se ve al instalar desde el sitio publicado (squadlcu.app), no en el preview del editor. Si ya lo tenías en la pantalla de inicio, hay que quitarlo y volverlo a agregar.

# PWA: logo de Squad al agregar a pantalla de inicio

Solo instalabilidad (manifest + íconos + meta tags). Sin service worker, sin modo offline, sin tocar lógica existente.

## 1. Archivos de ícono (tal cual, sin regenerar)

Se copian los 4 archivos subidos, sin modificarlos, a la carpeta pública:

- `public/icons/icon-192.png`
- `public/icons/icon-512.png`
- `public/icons/icon-maskable-512.png`
- `public/icons/apple-touch-icon.png`

Quedan servidos con ruta absoluta desde la raíz (`/icons/...`).

## 2. `public/manifest.webmanifest` (nuevo)

```json
{
  "name": "Squad",
  "short_name": "Squad",
  "start_url": "/",
  "scope": "/",
  "display": "standalone",
  "theme_color": "#000000",
  "background_color": "#000000",
  "icons": [
    { "src": "/icons/icon-192.png", "sizes": "192x192", "type": "image/png", "purpose": "any" },
    { "src": "/icons/icon-512.png", "sizes": "512x512", "type": "image/png", "purpose": "any" },
    { "src": "/icons/icon-maskable-512.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable" }
  ]
}
```

## 3. Head de la app

Este proyecto no usa `index.html`: el head se define en `src/routes/__root.tsx` (opción `head()`). Ahí se agregan:

`links`:
- `{ rel: "manifest", href: "/manifest.webmanifest" }`
- `{ rel: "apple-touch-icon", sizes: "180x180", href: "/icons/apple-touch-icon.png" }`

`meta`:
- `{ name: "theme-color", content: "#000000" }`
- `{ name: "apple-mobile-web-app-capable", content: "yes" }`
- `{ name: "apple-mobile-web-app-status-bar-style", content: "black-translucent" }`
- `{ name: "apple-mobile-web-app-title", content: "Squad" }`

El favicon actual (`squad-logo`) se queda igual.

## Notas

- Se usan tus 4 archivos exactamente como los subiste: solo se copian a `public/icons/`, sin recortes, escalados ni regeneración.
- iPhone y Android quedan cubiertos: Apple usa `apple-touch-icon`, Android usa el manifest (incluido el maskable).
- El ícono real solo se ve al instalar desde el sitio publicado (squadlcu.app), no dentro del preview del editor. Si ya lo habías agregado antes a la pantalla de inicio, hay que quitarlo y volverlo a agregar para que tome el ícono nuevo.

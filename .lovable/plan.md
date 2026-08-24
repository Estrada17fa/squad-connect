# Escudo del club sin recortes

## Problema
El escudo se renderiza dentro de un `Avatar` (círculo con `overflow-hidden`), así que el PNG se recorta en los bordes.

## Solución (solo presentación)
En `src/components/squad/ClubCrest.tsx`:
- Sustituir el `Avatar`/`AvatarImage` por un contenedor cuadrado sin recorte circular y una `<img>` con `object-contain`, `h-8 w-auto max-w-[120px]` para respetar la proporción del PNG (escudos verticales u horizontales se ven completos).
- Sin borde ni fondo circular alrededor de la imagen; el PNG transparente se integra con la cabecera.
- Fallback: si no hay logo, mantener el círculo con iniciales del club como hoy.
- El nombre del club sigue igual (oculto en móvil).

No se toca lógica de datos, permisos ni el hook de URL firmada.

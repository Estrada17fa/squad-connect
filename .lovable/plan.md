# Arreglo de diseño: la barra de acento de las sheets en móvil

## El problema

En `DetailSheet` el acento de color se dibuja como una franja horizontal absoluta pegada al borde superior de la cabecera. En móvil la sheet entra desde abajo y arriba tiene el "handle" de arrastrar, así que esa franja queda debajo del handle: se lee como una raya suelta cruzando el ancho, y además choca visualmente con el redondeo superior y con la X de cerrar.

## La solución (opción b, misma para móvil y desktop)

Quitar la línea horizontal superior y mover el acento a la propia cabecera:

- **Franja vertical a la izquierda de la cabecera**: barra sólida de 3px, altura del bloque de título, con esquinas redondeadas, separada del borde por el padding existente. Nunca toca el redondeo de la sheet, ni el handle, ni la X.
- **Icono/avatar con el color**: se conserva el fondo tintado y el icono en color de acento que ya existen (así el significado del color se refuerza).
- Sin acento, la cabecera se ve exactamente igual que hoy (la franja simplemente no se renderiza).

Resultado: mismo lenguaje visual que las tarjetas de lista (`StandardCard` ya usa barra lateral), consistente en las 20+ sheets sin tocar ninguna una por una.

```text
┌──────────────────────────────┐   sheet móvil
│            ▁▁▁▁▁             │   handle (libre)
│ ▌ [icono]  Título        [X] │   ▌ = acento vertical
│ ▌          descripción       │
│ ▌          [badges]          │
├──────────────────────────────┤
```

## Detalles técnicos

- Único archivo: `src/components/squad/DetailSheet.tsx`.
- En `DetailSheetHeader`: se elimina el `div.absolute.inset-x-0.top-0.h-1` y el bloque de título pasa a un contenedor `flex` con un `<span>` de `w-[3px] self-stretch rounded-full` que usa `backgroundColor: accent`.
- No cambia la API: la prop `accent` sigue igual, así que ninguna sheet consumidora se modifica. Se actualiza solo el comentario de la prop.
- Sin cambios en lógica, datos, permisos ni en `EntitySheet`.

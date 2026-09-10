# Ver el pase de abordar en PDF dentro de la app (Android)

## Qué pasa

El pase se guarda como PDF. En el teléfono, la vista incrustada no sabe mostrar PDFs: en su lugar el sistema pinta esa caja gris con el nombre del archivo y un botón "Abrir". Por eso se ve así aunque el archivo esté bien.

## Solución

Dibujar el PDF nosotros mismos, como imagen, dentro de la app:

- Al abrir "Mi pase de abordar", el PDF se convierte a imagen y se muestra completo, página por página, en alta definición para que el código de barras se lea bien.
- Se puede desplazar y hacer zoom con los dedos.
- Mientras se prepara, aparece "Cargando tu pase…"; si algo falla, un mensaje claro con "Reintentar".
- Desaparece la caja gris con el nombre del archivo y el botón "Abrir".
- El botón verde "Descargar" se queda igual, y se mantiene un enlace pequeño de respaldo "Abrir en el navegador" por si alguien lo prefiere.
- Los pases que son foto (JPG/PNG) siguen mostrándose como hoy.
- Mismo comportamiento en la vista de gestión (hoja de Pases de abordar en Coordinación).

## Detalle técnico

- `src/components/viajes/BoardingPassViewer.tsx`: se sustituye el `<iframe>` por un render con `pdfjs-dist` (ya instalado y usado en `src/lib/boardingPassMatch.ts`).
- Nuevo componente interno `PdfCanvas`: carga el documento desde la URL firmada con `getDocument`, recorre todas las páginas y las pinta en `<canvas>` con escala según `devicePixelRatio` y el ancho disponible; limpia el documento al cerrar.
- Carga diferida de pdfjs (`await import`) para no pesar en el arranque, con estados de carga y error propios y botón de reintento.
- Se conserva `useBoardingPassUrls` (URLs de ver y descargar ya resueltas) sin cambios.

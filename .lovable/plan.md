# Mis viajes: etiquetas solo con el día, pase en un toque y visor

Solo presentación y navegación. Sin cambios en la base de datos.

## 1. Etiquetas de salida y regreso: solo el día
- Las etiquetas muestran SOLO el día, nunca la hora: "Sale mañana", "Sale el sáb 7", "En curso", "Regresa hoy", "Regresa el lun 9".
- Se aplica en Mis viajes, tarjetas y hoja de la Agenda, Inicio y Coordinación › Viajes (lista y ficha). Se elimina la hora falsa "12:00 p.m.".
- Las horas solo aparecen dentro de cada elemento (reunión, vuelo, transporte, comida, check-in) en el itinerario, el boleto y las tarjetas de vuelo.

## 2. El pase en un toque
- Un solo visor de pases a pantalla completa, que se abre desde cualquier lugar con viaje + tramo.
- "Mi pase" en la tarjeta de viaje de la Agenda abre el visor directo (sin hoja ni página).
- "Mi pase" en la hoja del viaje, "Ver pase completo" y tocar el boleto MI PASE en la página del viaje abren el mismo visor.
- Varios pases en el tramo (escala): abre en el primero y permite pasar al siguiente.
- Sin pase: el botón dice "Mi viaje" y lleva a la página del viaje.
- Hoja del viaje: se quita la fila "Vuelo … · Horario y ruta arriba"; la reunión queda con su hora real y lugar.

## 3. Visor
- Fondo oscuro neutro; imagen ajustada al ancho, se desplaza hacia abajo si es larga (Volaris).
- Zoom con dos dedos y doble toque.
- Barra superior fija: cerrar, nombre del tramo ("Ida · SJD → PBL"), "1 de 2" con flechas si hay varios.
- "Descargar": en celular abre el menú de compartir con el archivo de imagen; si no se puede, descarga directa. Nombre: Pase_<Apellido>_<tramo>_<fecha>.jpg.
- Pases viejos en PDF se siguen viendo y se descargan como imagen de la página.

## Pruebas
1. Viaje temporal que sale mañana con reunión 9:30: la etiqueta dice "Sale mañana" (sin hora) y la reunión muestra 9:30 a.m. en el itinerario.
2. "Mi pase" abre el visor en un toque desde tarjeta, hoja y página.
3. Pase largo a todo lo ancho con desplazamiento; zoom; Descargar comparte en celular y descarga en computadora.
4. Viajero sin pase ve "Mi viaje".
5. Datos temporales borrados al final, sin avisos a nadie real. TypeScript limpio.
Capturas 375×667: etiqueta de salida solo con el día, tarjeta de Agenda, visor arriba y desplazado, menú de descargar.

## Detalles técnicos
- `src/lib/misViajes.ts`: `personDeparture` / `personReturn` devuelven solo la fecha (sin hasTime) + `tripDayLabel`; pruebas ajustadas en misViajes.test.ts. Quitar horas derivadas de departure_at/return_at en agenda.ts, AgendaCards, EventDetailSheet, coord/viajes/parts.tsx, TripDetailTabs, coordinacion.$area.index.
- `src/components/viajes/mine/BoardingPassViewer.tsx` (evoluciona PassFullscreen; PassAssignFlow sigue usando ZoomImage) + `usePassViewer` para abrirlo desde Agenda, hoja y página.
- Descarga: blob firmado → File → navigator.canShare({files}) → navigator.share; si no, enlace de descarga. PDF: página renderizada a JPEG.
- Añadir la tarea a roadmap.md al implementar.

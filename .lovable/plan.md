# Mis viajes: hora de salida real, pase en un toque y visor

Solo presentación y navegación. Sin cambios en la base de datos.

## 1. Hora de salida real
- Nueva regla única: la hora de salida para una persona = lo más temprano entre la reunión del viaje (meeting_at) y su primer vuelo o transporte. El regreso usa su último tramo de vuelta.
- Si no hay hora: solo el día ("Sale mañana", "Sale el sáb 7", "Regresa el lun 9"). Nunca se inventa 12:00 p.m. a partir de una fecha sin hora.
- Se aplica en Mis viajes (etiquetas y línea de tiempo), tarjetas y hoja de la Agenda, Inicio y Coordinación › Viajes (lista y ficha).

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
1. Viaje temporal con salida sin hora y reunión 9:30: "Sale mañana 9:30 a.m."; sin reunión ni vuelos: "Sale mañana".
2. "Mi pase" abre el visor en un toque desde tarjeta, hoja y página.
3. Pase largo a todo lo ancho con desplazamiento; zoom; Descargar comparte en celular y descarga en computadora.
4. Viajero sin pase ve "Mi viaje".
5. Datos temporales borrados al final, sin avisos a nadie real. TypeScript limpio y pruebas de la regla de hora.
Capturas 375×667: etiqueta con hora real, tarjeta de Agenda, visor arriba y desplazado, menú de descargar.

## Detalles técnicos
- `src/lib/misViajes.ts`: `personDeparture(trip, legs, meetingAt)` / `personReturn` devolviendo `{date, hasTime}` + `departureLabel`; tests en misViajes.test.ts. Reemplazar formatos de departure_at/return_at con hora en agenda.ts, AgendaCards, EventDetailSheet, coord/viajes/parts.tsx, TripDetailTabs, coordinacion.$area.index.
- `src/components/viajes/mine/BoardingPassViewer.tsx` (evoluciona PassFullscreen, reutiliza ZoomImage; PassAssignFlow sigue importando ZoomImage) + hook `usePassViewer` con estado global ligero para abrirlo desde Agenda, hoja y página.
- Descarga: fetch blob firmado → `File` → `navigator.canShare({files})` → `navigator.share`, si no `<a download>`. PDF: render de la página a JPEG con pdf.js existente.

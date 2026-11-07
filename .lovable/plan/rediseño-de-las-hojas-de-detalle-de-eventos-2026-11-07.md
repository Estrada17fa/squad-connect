# Rediseño de las hojas de detalle de eventos

Solo presentación, con los datos que ya existen. Sin cambios en la base de datos.

## Qué cambia para quien usa la app
- Al tocar cualquier evento en la Agenda o en Inicio se abre una hoja nueva desde abajo, con el mismo lenguaje de las tarjetas.
- Las juntas y los viajes, que hoy saltan directo a otra pantalla, ahora abren primero su hoja. Desde ahí, "Abrir junta" y "Ver viaje completo" llevan a donde iban antes. Los avisos y enlaces directos siguen igual.
- La hoja tiene agarradera, esquinas de 20 px y altura según su contenido (máximo 90%). Se cierra deslizando hacia abajo o tocando fuera; ya no hay botón "Cerrar" ni barra de scroll visible.

## Estructura común (un solo componente)
1. Encabezado según el tipo.
2. Bloque personal en verde tenue, solo si aplica a quien mira.
3. Filas de información en tarjetas agrupadas: ícono gris, dato principal y una línea gris debajo. Cada dato aparece una sola vez, sin etiquetas de colores ni títulos en mayúsculas.
4. Hasta 2 botones fijos abajo: el principal en verde y el secundario neutro.
- Lugar: nombre, ciudad y mapa pequeño. "Cómo llegar" abre Google Maps; si hay coordenadas, un menú ofrece también Waze.
- Quien puede editar ve un lápiz pequeño arriba a la derecha que abre la edición actual.

## Por tipo
- **Partido.** Encabezado: torneo, jornada y local o visita; escudos de 64 px con su nombre corto, hora grande, fecha y categoría. Bloque personal para quien está convocado: "Tu citación" (hora y lugar) y su estado, o solo el estado si no hay citación. Filas: lugar, uniforme y notas. Acciones: "Cómo llegar" y, si viaja en un viaje publicado, "Mi viaje".
- **Entrenamiento.** Encabezado con ícono, título y "Lun 9 nov · 7:00 – 9:00 am". Bloque personal con su asistencia, si está registrada. Filas: lugar, enfoque o plan de la sesión y notas. Acción: "Cómo llegar".
- **Junta.** Encabezado con ícono de personas. Bloque personal con su respuesta. Filas: lugar, orden del día e invitados (caras y "5 de 7 confirmaron"). Acciones: "Asistiré" / "No asistiré" (o "Cambiar respuesta" si ya respondió) y "Abrir junta".
- **Viaje.** Encabezado tipo pase de abordar: aeropuertos u origen → destino, con horas. Bloque personal con su cuarto, con quién lo comparte y su transporte, si existen. Filas: hora y lugar de reunión, y el vuelo o transporte. Acciones: "Mi pase" y "Ver viaje completo".
- **Evento.** Encabezado con ícono. Filas: lugar y notas. Acción: "Cómo llegar".
- **Cita médica.** Sigue mostrando solo lo general, con su aviso de privacidad.

## Pruebas (375 × 667)
Abriré desde la Agenda un partido, un entrenamiento, una junta y un viaje publicado. Para la junta y el viaje usaré datos de prueba y un usuario temporal invitado que responde. No se avisará a nadie real y al final borraré todo.

En cada hoja revisaré que cada dato aparezca una vez, que los botones funcionen y que se cierre deslizando. No debe haber errores de código. Entregaré capturas de la hoja de cada tipo.

## Detalles técnicos
- `src/components/agenda/EventSheet.tsx`: contenedor (Drawer de vaul con agarradera y scroll oculto), `SheetRow`/`SheetRows`, `PersonalBlock`, `SheetActions`, `DirectionsButton` (menú con Google Maps y Waze).
- Encabezados por tipo en `EventSheetHeaders.tsx`; reutilizan `TeamCrest` (match), `rowTime` y `tripMoments`.
- `EventDetailSheet.tsx` se reescribe encima de esto, con la misma interfaz (props) y los mismos hooks: `useMatchByEvent`, `useMatchCallups`, `useMatchLogistics`, `useSessionByEvent`, juntas y viajes ya cargados.
- Ruta de la Agenda: `open(e)` abre la hoja para viajes y juntas; se le pasan el viaje, el momento, la junta y el pase. La edición sigue usando `EventFormDialog` y `SessionFormDialog`.
- Se revisa qué datos existen para la asistencia a entrenamientos y para cuartos y transporte del viaje. Si alguno no se puede leer, esa fila se omite.

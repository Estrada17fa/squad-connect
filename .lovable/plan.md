# Agenda: tira de semana y tarjetas grandes por evento

Solo presentación. Se conservan categorías, filtros, viajes en Borrador ocultos (isAgendaVisible), respuestas a juntas y el "+" temporal. Sin cambios en la base.

## 1. Pestañas y encabezado
- Pestañas: Agenda · Mis viajes (subrayadas). Mis viajes sin cambios.
- Mes sale de las pestañas: ícono de calendario junto al filtro que abre la vista actual de Mes (la ruta de Mes sigue existiendo).
- Encabezado: "Agenda", categoría debajo; a la derecha filtro, calendario y "+" (solo quien puede crear).

## 2. Tira de la semana
- 7 días (día abreviado + número grande), hasta 3 puntos por día: verde = partido, gris = resto.
- Hoy y día seleccionado con fondo claro.
- Deslizar cambia de semana; tocar un día desplaza la lista a ese día (o al siguiente con eventos).
- Enlace pequeño "Hoy" visible solo si te moviste de la semana actual.

## 3. Lista de tarjetas
- Próximos 14 días agrupados por día ("Sábado 7 · Mañana"); días vacíos ocultos; "Ver más" al final.
- Se elimina la tarjeta verde protagonista: cada evento aparece una vez.
- Tarjeta base: superficie neutra, radio 18 px, relleno 16 px, etiqueta superior en mayúsculas gris (tipo · detalle y dato a la derecha), divisor fino con contexto a la izquierda y pastilla de acción a la derecha.
- Por tipo:
  - Partido: escudos 56-60 px (TeamCrest) con nombre corto, hora grande al centro; pie con sede y convocatoria (jugadores); pastilla "Cómo llegar".
  - Viaje (publicado y visible): estilo pase de abordar; con vuelo, códigos de aeropuerto grandes, horas y línea punteada con avión; sin vuelo, origen → destino y hora. Pie: reunión; pastilla "Mi pase" o "Mi viaje". Tarjetas para ida y regreso; tocar abre Mis viajes con ese viaje.
  - Entrenamiento / Evento general: ícono en cuadro, nombre y lugar, hora grande a la derecha.
  - Junta: igual, ícono de personas; pie con "Asistiré · No asistiré" o la respuesta dada.
- Tocar la tarjeta abre el detalle actual; las pastillas hacen su acción directa.

## Pruebas y entrega
- Capturas 375×667: tira con puntos, partido, viaje con vuelo (datos temporales si hace falta, sin avisos a personas reales, borrados al final), entrenamiento y junta con "Asistiré".
- Pruebas de las nuevas funciones de semana/momentos de viaje; TypeScript limpio.

## Detalles técnicos
- src/lib/agenda.ts: weekDays, dotsForDay, tripMoments (ida/regreso a partir de vuelos o fechas del viaje) con tests.
- src/components/agenda/WeekStrip.tsx (nuevo, gestos táctiles), AgendaCards.tsx (tarjetas por tipo) reemplazando AgendaHero/AgendaRow.
- AgendaHeader.tsx: pestañas Agenda/Mis viajes + ícono de Mes. Página de agenda, Mes y Mis viajes usan el nuevo encabezado.

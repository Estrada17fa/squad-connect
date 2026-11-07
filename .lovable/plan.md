# Correcciones: partidos en Agenda, itinerario y formularios de Viajes

## 1) Partidos en la Agenda

**Causa (ya confirmada):** la regla de la base deja ver un partido de torneo solo si la persona tiene acceso a Partidos. Un Jugador tiene "vista jugador", y con eso solo ve el partido si está convocado. Los partidos del dom 8 (Montañeses) y del sáb 14 (Chapulineros) existen en Primer Equipo, pero aún no tienen convocados. Por eso, al consultarlos como César (Jugador, Primer Equipo), la base regresa 0 partidos. Los filtros de la app (rango, Borrador, categoría, tipo) no los ocultan.

**Arreglo (decisión aprobada):** un solo ajuste en la base, solo en la regla que decide quién ve los eventos de partido en la Agenda. Un Jugador ve todos los partidos de su categoría. La convocatoria, la logística y los avisos siguen visibles solo para los convocados, igual que ahora.

**Prueba:** los dos partidos aparecen en Semana, Mes, Lista, las tarjetas y la hoja de detalle. Se revisa con tu cuenta (Admin) y con un jugador temporal de Primer Equipo.

## 2) Itinerario del viajero (Mis viajes)
- Reglas: un vuelo aparece solo si la persona es pasajera. Un transporte o una comida sin pasajeros asignados aparece para todos los viajeros; si tiene pasajeros asignados, solo para ellos.
- Primero reviso el viaje a Orizaba y te entrego la lista de lo que faltaba y por qué.
- Se quitan del itinerario el check-in y el check-out del hotel. "Mi cuarto" muestra el hotel y el cuarto, sin horas. En Coordinación › Viajes las horas se siguen viendo.
- Un elemento solo se puede tocar ("Cómo llegar") si tiene un lugar del catálogo o una dirección. Si no tiene, no muestra flecha ni reacciona al tocarlo.

## 3) Formularios y hojas de Coordinación › Viajes con el nuevo look
Cambia solo el diseño; los formularios funcionan igual. Aplica a editar viaje, vuelo, hotel, cuarto, transporte, comida, equipaje, material y documentos:
- Campos rellenos de unos 44 px, sin borde, con la etiqueta pequeña arriba. Se quitan las descripciones largas.
- Fecha y hora con el selector propio de la app.
- Controles segmentados para Tramo, tipo de transporte y tipo de comida.
- Botón principal fijo abajo. Cancelar pasa a ser la X o "‹" de arriba, y las hojas de detalle ya no tienen botón "Cerrar".
- Editar y Eliminar pasan a un menú "⋯".
- Hojas de detalle con encabezado visual y filas con ícono, sin datos repetidos. La ubicación se muestra con mapa, Maps y Waze.
- Equipaje en el detalle de vuelo: una fila por pasajero con tres íconos tocables, sin deslizar de lado, y un resumen arriba.
- Tarjeta de vuelo: hasta 6 caras + "+N", "N pasajeros · N con pase" y "Ver pasajeros".

## Pruebas y entrega
- Uso un viaje temporal, sin avisar a nadie real, y lo borro al final.
- Abro y guardo cada formulario.
- Reviso el itinerario con un transporte sin pasajeros asignados y confirmo que no aparecen check-in ni check-out.
- Confirmo que un elemento sin dirección no se puede tocar.
- TypeScript sin errores.
- Capturas en celular de 375×667 de: la Agenda con los partidos, el formulario de vuelo, el detalle de vuelo con el equipaje, el detalle del hotel y el itinerario del viajero.

## Detalles técnicos
- Migración: en la política SELECT de calendar_events (y en can_view_event_new), la rama 'partido' también permite verlo con can_view_module(uid,'partidos',team_id) cuando el nivel es vista_jugador. match_callups y match_logistics no cambian.
- Itinerario: la lógica de pasajeros va en src/lib/misViajes.ts, con pruebas nuevas.
- Componentes: src/components/coord/viajes/*, reutilizando LocationCard y el selector de fecha/hora existente.

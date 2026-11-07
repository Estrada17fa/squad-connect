# Agenda con el nuevo look + viajes en Borrador fuera de la Agenda

Sin cambios a la base ni a las reglas. Se reutilizan las consultas actuales de Agenda, Mes, Mis viajes e Inicio.

## 1) Arreglo: viajes en Borrador
- Toda lectura de eventos del calendario trae también el estado de su viaje (si lo tiene).
- Un evento de viaje solo se muestra si el viaje está Publicado, En curso o Finalizado; si está en Borrador, o la persona no puede ver el viaje, se oculta.
- Quién lo ve: sus viajeros; quien puede gestionar viajes ve los publicados de sus categorías. Borradores solo en Coordinación › Viajes.
- Se aplica en un solo lugar compartido, así cubre Próximo, Mes, Inicio y el resto de vistas que muestran eventos.
- Nota: el aviso "Fuiste convocado al viaje" al crear un Borrador sigue saliendo (viene de la base); queda pendiente tu decisión anterior.

## 2) Solo sus categorías
- Eventos de las categorías de la persona más los de "Todo el club".
- Selector como texto bajo el título ("Primer Equipo ▾", 12 px, gris), con "Todas mis categorías". Con una sola categoría no hay selector. Se quita la fila de pastillas.

## 3) Encabezado y pestañas
- "Agenda" (20 px), categoría debajo; a la derecha ícono de filtro que abre una hoja con tipos (Partido, Entrenamiento, Viaje, Junta, Evento; varios a la vez) y punto verde si hay filtro activo. Se quitan pastillas de tipos.
- Se quita el botón "Nuevo evento". Temporal: "+" pequeño en el encabezado solo para quien hoy puede crear eventos; abre el mismo formulario.
- Pestañas subrayadas: Próximo · Mes · Mis viajes. Mes y Mis viajes conservan su contenido actual, solo bajo el nuevo encabezado.

## 4) Pestaña Próximo
- Tarjeta protagonista (verde tenue, sin borde): próximo partido de su categoría en 7 días; si no, próximo viaje publicado donde viaja; si no, próximo evento.
  - Partido: etiqueta ("MAÑANA · JORNADA 11"), escudos completos, fecha/hora, sede, estado de convocatoria del jugador si existe; botones "Mi viaje" y "Cómo llegar".
  - Viaje: destino, salida (hora y punto de reunión), "Ver mi viaje".
  - Otro: título, fecha, hora, lugar.
- Lista por día: encabezado "Hoy"/"Mañana" en verde o "Dom 8 nov"; tarjeta agrupada sin borde; filas con hora grande (o "Todo el día"), título completo en hasta dos líneas, ícono gris del tipo (escudos pequeños en partidos), línea de contexto gris y flecha. Sin barras de color ni etiquetas.
- Juntas donde está invitada: "Asistiré · No asistiré" en la fila (misma respuesta que hoy).
- 14 días y "Ver más"; vacío: "Nada en tu agenda esta semana".
- Tocar: evento → detalle actual; viaje → Mis viajes con ese viaje; junta → su ficha.

## Pruebas
1. Viaje de prueba en Borrador invisible en la Agenda; publicado, visible solo a sus viajeros (usuarios temporales, sin avisos a personas reales).
2. Viaje real a Orizaba: solo consultar; en Borrador no aparece.
3. Jugador temporal de Primer Equipo no ve Equipo Juvenil; staff con dos categorías elige entre ellas.
4. "+" solo para quien puede crear eventos.
5. En 375×667: protagonista y primer día visibles sin scroll.
6. Borrar todo lo de prueba; TypeScript limpio; capturas móviles pedidas.

## Detalles técnicos
- `useCalendarEvents`, `useUpcomingEvents`, `useNextEventOfType`: select `*, trip:trips(status)` y filtro común `isAgendaVisible(event)` en `src/lib/viajes.ts` (usa isPlayerVisible/tripDisplayStatus), con tests.
- Nuevos componentes en `src/components/agenda/*` (AgendaHeader, CategoryPicker, TypeFilterSheet, HeroCard, DayGroup, AgendaRow); reusa MatchupHeader, TeamCrest, NewEventLauncher, EventDetailSheet, RSVP de juntas.
- Las rutas `/m/agenda`, `/m/mes`, `/agenda-viajes` comparten el encabezado; categorías desde get_my_access (memberships).

## 5) Avisos de viaje (único cambio en la base)
- Se ajusta la función que envía "Fuiste convocado al viaje": no avisa si el viaje está en Borrador.
- Al publicar se avisa a todos una sola vez (ya existe); si ya está publicado y se agrega a alguien, a esa persona sí se le avisa.
- Orizaba (en Borrador): ya se enviaron 24 avisos a 24 personas, ninguno leído aún. No se borran sin tu permiso.
- Prueba: agregar viajero temporal a borrador = sin aviso; publicar = un aviso; agregar tras publicar = aviso.

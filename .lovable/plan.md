# Ajustes a Tareas + módulo Juntas (Coordinación › General)

## Punto que necesita tu visto bueno
La base actual de juntas ya tiene estado, hora real de inicio/fin, lugar del catálogo, categoría y respuesta de invitados (Invitado / Asistiré / No asistiré). **Falta dónde guardar la asistencia real** (Asistió / No asistió), que es distinta de la respuesta previa. Propongo agregar una sola columna opcional: `meeting_attendees.attended` (sí / no / vacío). Si no la apruebas, la asistencia real se guardaría dentro de la minuta como texto (menos fiable). Al aprobar este plan, se agrega la columna.

El orden del día con puntos palomeables se guarda en el campo de orden del día existente (lista estructurada); las juntas viejas con texto libre se leen como un punto por línea. Sin cambio de base.

## Base de datos (aditivo, idempotente)
- `tasks.location_id` → ubicaciones (al borrar, queda vacío), con validación de mismo club (como la Sede).
- `tasks.meeting_id` → juntas (al borrar, queda vacío).
- `meeting_attendees.attended` (si se aprueba).
- Aviso "Te invitaron a <junta>" (ya existe un aviso de invitación; se reutiliza y se ajusta para abrir la ficha nueva) y aviso "Resumen de <junta>" al finalizar, con notify_users.
- Reglas de tareas y juntas sin cambios.

## A) Tareas
1. Fecha límite: solo calendario con hora opcional (se quitan Hoy/Mañana/Viernes).
2. `LocationPicker` reutilizable: ubicaciones del club (Sede arriba) con buscador; "Buscar en Google" con la búsqueda que usa Club y casilla "Guardar en ubicaciones del club" (marcada). Al elegir de Google se crea en el catálogo y se liga.
3. `LocationCard` reutilizable: nombre, dirección, mapa pequeño de Club, botones Google Maps y Waze (con dirección si no hay coordenadas).
4. Lista: ícono de lugar + nombre corto en la línea gris. Ficha: LocationCard bajo la fecha.
5. Ficha: fila "De la junta: <título> ›".

## B) Juntas
- Pestaña Juntas en /coordinacion/general/tareas muestra la lista (ya no redirige). El "+" crea junta o tarea según la pestaña.
- Lista: Próximas · Pasadas; bloque de fecha, título, horario, lugar, 3 caras + "+N", "5 de 7 confirmaron", etiqueta "En curso".
- Crear/editar en página completa: título, fecha, inicio/fin, LocationPicker, categoría o Todo el club, invitados con fotos, orden del día (agregar/reordenar). Botón fijo abajo.
- Ficha /coordinacion/general/juntas/$meetingId: "‹ Juntas", menú ⋯ (Editar, Cancelar, Eliminar con confirmación), datos, LocationCard, invitados agrupados (Asistirá / No asistirá / Sin responder), orden del día, Acuerdos (tareas ligadas con estado, responsable y avance), minuta y asistentes si terminó. Botones "Asistiré / No asistiré" para el invitado.
- Modo junta: "Iniciar junta" → puntos palomeables, minuta con guardado automático, asistencia real tocando a cada invitado, "+ Acuerdo" (título, responsable, fecha; crea tarea ligada, con la categoría de la junta). "Finalizar junta" → hora real de fin, estado Finalizada, aviso de resumen.
- Avisos de juntas nuevos y viejos (y enlaces /m/coordinacion_interna?kind=junta) abren la ficha nueva.
- Agenda: las juntas ya se reflejan en Agenda; verificaré que el invitado la vea. Si no la ve, te aviso antes de tocar Agenda.

## Pruebas y entrega
Las 5 pruebas del documento con usuarios de prueba, limpieza total (juntas, tareas, ubicaciones, usuarios, avisos), sin errores de TypeScript, y las 7 capturas en celular 375×667.

## Detalles técnicos
- UI en src/components/coord/juntas/*, reglas puras en src/lib/juntas.ts con pruebas (agrupación próximas/pasadas, conteo de confirmados, parseo de orden del día viejo/nuevo).
- Reutiliza la lógica de MeetingFormDialog/MeetingDetailSheet (hooks de guardado e invitados) sin tocar /m/coordinacion_interna.
- Rutas: coordinacion.general.juntas.$meetingId.tsx, .nuevo.tsx, .$meetingId_.editar.tsx.

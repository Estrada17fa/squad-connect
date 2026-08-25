# Ubicaciones, notificaciones y acomodo de Mi Club

## 1. Ubicaciones que se pueden picar

Hoy, cuando una ubicación viene del catálogo real (con coordenadas), el nombre se muestra como texto plano y el mapa solo se abre desde el botón "Abrir en Google Maps".

Cambio en la ficha de ubicación (usada en Evento, Junta, Partido, Viaje, Transporte y Hotel):
- Si la ubicación tiene coordenadas, el nombre y la dirección se vuelven un enlace tocable que abre Google Maps en una pestaña nueva, con el ícono de destino y un subrayado sutil para que se note que es tocable.
- Se conservan los botones "Ver en mapa" y "Abrir en Google Maps" como están.
- Si es solo texto libre (sin coordenadas), se sigue mostrando como texto; los enlaces (videollamadas) siguen igual.

## 2. Notificaciones: dejar solo cinco

Se quedan únicamente:
- Nuevo evento en la agenda
- Nuevo entrenamiento
- Te convocaron (convocatoria de partido)
- Se modificó el horario de un evento
- Comunicados

Se apagan todas las demás: solicitudes creadas/resueltas, gastos, préstamos de inventario, tareas (asignada, vencimiento, borrada), invitación a junta, salud (lesión, revisión, receta, cita médica), desarrollo (feedback, objetivo, rutina), multimedia y todas las de viajes (pase de abordar, pasajero de vuelo, equipaje, transporte, viajero).

Detalle técnico:
- Migración que elimina esos disparadores y sus funciones.
- Se agregan dos disparadores nuevos sobre los eventos del calendario: uno al crear (nuevo evento) y otro cuando cambia la fecha/hora de inicio o fin (horario modificado). Ambos avisan al equipo del evento, o a todo el club si el evento es de club.
- Para no duplicar, el aviso de "nuevo evento" se omite cuando el evento nace de un entrenamiento (ese caso ya tiene su propio aviso de nuevo entrenamiento).
- Se conservan tal cual los disparadores de entrenamiento, convocatoria y comunicados.
- El centro de notificaciones aprende los tipos nuevos (`evento_nuevo`, `evento_horario`) para llevar a la Agenda al tocarlos.

## 3. Orden de módulos en Mi Club

Orden fijo: Entrenamientos, Torneo, Comunicados, Salud, Desarrollo, Nutrición, Tácticas, Plantel, Multimedia. Si a alguien le falta acceso a uno, los demás se recorren igual que hoy (mismo mecanismo que ya usa Coordinación).

## 4. Íconos de páginas

- Mi Club: escudo (Shield).
- Admin: edificio (Building2).

## Archivos que se tocan

- `src/components/calendar/LocationDisplay.tsx` — nombre/dirección tocables.
- `src/lib/rolePages.ts` — orden fijo de Mi Club e íconos de las páginas.
- `src/lib/notificationTargets.ts` — destino de los tipos nuevos.
- Migración SQL — limpieza de disparadores y nuevos avisos de evento/horario.

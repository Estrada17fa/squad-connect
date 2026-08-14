# Agenda / Calendario — plan

La Agenda no crea eventos: agrega y muestra lo que ya generan Entrenamientos, Juntas, Salud, Partidos y Viajes, y cada evento se filtra con el permiso de su módulo de origen, en la base de datos.

## 1. Qué ya está conectado y qué falta

Verificado en la base:

- Juntas: trigger de alta/edición/baja hacia el calendario, y los convocados se copian como asistentes del evento. Conectado.
- Partidos: trigger de alta/edición/baja. Conectado.
- Viajes: trigger de alta/edición. Conectado (salida; el regreso hoy va dentro del mismo evento).
- Citas médicas: trigger de alta/edición/baja, marcadas como privadas. Conectado.
- Entrenamientos: NO hay trigger. Hoy el evento se crea desde el cliente al guardar la sesión, así que una sesión creada por otra vía puede quedar sin evento. Se añade trigger para que sea consistente.

## 2. Permisos: el punto crítico

Hoy la regla de lectura del calendario es única para todos los eventos: básicamente "si puedes ver el módulo Agenda de esa categoría, ves el evento". Eso es un hueco: un técnico con Agenda ve el evento de un viaje o de un partido aunque no tenga permiso en esos módulos, y las citas médicas dependen de una sola condición general de Salud.

Se reescribe la regla de lectura para que el permiso se decida por tipo de evento:

- Entrenamiento: permiso de ver Entrenamientos en esa categoría.
- Junta: ser convocado a la junta, o permiso de ver la junta (regla ya existente de Coordinación).
- Partido: permiso de ver Partidos/Torneo de esa categoría, o estar convocado.
- Viaje: regla ya existente de visibilidad de viaje (viajero del viaje o permiso de Viajes en la categoría).
- Cita médica: SOLO el jugador de la cita o quien tenga acceso a Salud en esa categoría. Nunca por permiso de Agenda.
- Cualquier otro evento suelto: la regla actual de Agenda.

Con esto el filtro vive en la base: aunque el frontend pidiera todo, la base devuelve solo lo permitido. Además, los eventos de cita médica siguen mostrando solo el título genérico "Cita médica" (sin motivo ni diagnóstico) y en el detalle no se consulta el diagnóstico.

Se añade también una regla para que un jugador vea el partido en el que está convocado aunque su permiso de categoría fuese limitado.

## 3. Las 3 pestañas

Página Agenda con las pestañas ya existentes en el proyecto (mismo estilo de ModuleTabs):

1. **Agenda (lista)**: próximos eventos en orden cronológico, agrupados por día, con color e icono por tipo, hora, título y un renglón de contexto (rival y sede, categoría, destino del viaje, sala de la junta). Filtros por tipo de evento y por categoría. Se quita el botón de crear evento suelto salvo para quien es editor de Agenda (se conserva como está hoy).
2. **Mes (grid)**: calendario mensual, puntos de color por día, día seleccionado abre la lista de ese día. Leyenda de colores por tipo, con iconos, sin emojis.
3. **Viajes (solo lectura)**: reutiliza los componentes de Viajes en modo lectura. El jugador ve su propia información (su transporte, su vuelo, su hotel/habitación, su equipaje, su citación y SU pase de abordar); staff con permiso de Viajes ve el viaje completo en pestañas Ida / Regreso / General. Nada editable, ni botones de alta.

## 4. Detalle al tocar un evento

El detalle es un router por tipo, en el sheet estándar:

- Entrenamiento: abre el plan de sesión (se reutiliza el contenido de sesión de Entrenamientos, en lectura si no es editor).
- Partido: rival, escudo, sede, hora, resultado si ya se jugó, y convocatoria/logística según permiso de Partidos.
- Junta: hora, lugar, agenda y convocados.
- Cita médica: solo "Cita médica", fecha, hora y lugar. Sin motivo, sin diagnóstico, sin notas.
- Viaje: resumen con enlace a la pestaña Viajes.

## 5. Home / Inicio

Se deja un hook de "próximos eventos del usuario" (próximo entrenamiento, próximo partido, próximo viaje) listo para que Home lo consuma después. No se construye Home en este paso.

## Detalles técnicos

- Migración: nueva política SELECT de `calendar_events` con `CASE` por `event_type`, apoyada en las funciones ya existentes (`can_view_module`, `can_access_health`, `can_view_trip_new`, `can_view_meeting`, `can_view_match_ops`) más pertenencia por `event_attendees`; trigger de sincronización de `training_sessions` hacia `calendar_events`; se añade `medico` al mapa de tipos en `src/lib/eventTypes.ts`.
- Frontend: `src/hooks/useCalendarEvents.ts` amplía el select con las llaves de origen (`meeting_id`, `trip_id`, y las de sesión/partido) y expone `useUpcomingEvents`; `EventDetailSheet.tsx` pasa a ser un router por tipo; `m.agenda.tsx`, `m.mes.tsx` y `agenda-viajes.tsx` se refinan con filtros por tipo y categoría y la leyenda de colores.
- Fechas en timestamptz, formateadas con los utilitarios de calendario ya existentes.

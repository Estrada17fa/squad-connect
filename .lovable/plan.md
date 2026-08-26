# Notificaciones: dejar solo las reales y necesarias

## Paso 1 — Diagnóstico (verificado en la base)

No hay ninguna notificación creada desde el frontend: todo sale de triggers en la base. Hay 20 triggers activos. Regla transversal ya activa: `notify_users` nunca notifica a quien ejecuta la acción.

| Módulo | Disparador | A quién |
|---|---|---|
| Comunicados | Alta de comunicado de club | Todo el club |
| Comunicados | Alta de comunicado por categoría | Miembros de esa categoría |
| Agenda / Entrenamientos | Se crea un evento tipo entrenamiento | **Toda la categoría** (aunque no estén convocados) |
| Agenda / Entrenamientos | Cambia hora de un entrenamiento | **Toda la categoría** |
| Entrenamientos | Se crea la sesión con plan | Convocados del evento ("Plan de entrenamiento disponible") |
| Partidos | Convocatoria | El convocado |
| Partidos | Cambia citación / punto de reunión | Los convocados |
| Juntas | Se invita a alguien | El invitado |
| Juntas | Cambia fecha/lugar o se cancela | Los invitados |
| Tareas | Asignación | El asignado |
| Tareas | Cambia fecha límite | Los asignados |
| Solicitudes | Alta | Aprobadores del tipo (nunca el solicitante) |
| Solicitudes | Aprobada / rechazada / requiere info | El solicitante |
| Salud | Cita médica creada o con cambio de fecha/lugar | Solo el paciente |
| Documentos | Documento con persona destinataria | Solo esa persona |
| Viajes | Se agrega viajero | El viajero |
| Viajes | Cambia citación/salida del viaje | Los viajeros |
| Viajes | Se asigna a un vuelo | Esa persona |
| Viajes | Se asigna a un transporte | Esa persona |
| Viajes | Se sube su pase de abordar | Esa persona |

Confirmado que **no existe** ningún trigger de multimedia, resultados/goles/torneo, inventario, compras/gastos, lesiones, revisiones, recetas, desarrollo ni nutrición. Las filas viejas de multimedia (4) son residuo histórico.

Volumen real acumulado: 112 "plan de entrenamiento", 72 "nuevo entrenamiento", 49 "vuelo asignado", 39 comunicados, 25 pases de abordar, 24 viajeros, 18 convocatorias de partido, el resto marginal. El ruido está concentrado en entrenamientos y en el detalle logístico de viajes.

## Paso 2 — Qué se quita y qué se deja

**Se quita:**

1. **Entrenamiento a toda la categoría.** Hoy el aviso de "nuevo entrenamiento" y "cambio de horario" se manda a todos los miembros de la categoría, estén o no convocados. Pasa a mandarse **solo a los convocados** del evento (lista de asistentes). Ésta es la causa principal del exceso.
2. **Aviso duplicado de entrenamiento.** Hoy un mismo entrenamiento genera hasta dos avisos: el del evento y el de "plan de entrenamiento disponible". Se queda **un solo aviso** por entrenamiento: creado y cambio de horario, a los convocados. Se elimina el aviso separado de plan publicado.
3. **Vuelo asignado y transporte asignado (viajes).** Son detalle logístico que ya se ve en la ficha del viaje; el viajero ya recibió el aviso de convocatoria al viaje. Se eliminan.

**Se deja tal cual** (todo cumple la regla de accionable/dirigido): comunicados de club y categoría, convocatoria y cambio de citación de partido, invitación y cambio/cancelación de junta, asignación y cambio de fecha de tarea, solicitud por aprobar y su resolución, cita médica solo al paciente, documento dirigido, viajero convocado, cambio de citación del viaje y pase de abordar personal.

**Se confirma que nada notifica** en multimedia, resultados de partido/torneo, inventario, compras, gastos ni salud general.

## Paso 3 — Cómo se aplica

- Una sola migración SQL. No se toca ninguna tabla, permiso, RLS ni la campana.
- `notify_calendar_event_created` y `notify_calendar_event_time_changed`: cambian de `notify_group` (categoría completa) a `notify_users` con los asistentes del evento; si el entrenamiento no tiene convocados, no se notifica a nadie.
- Se elimina el trigger `trg_notify_training_session` y su función (aviso de plan publicado).
- Se eliminan los triggers y funciones `notify_flight_passenger` y `notify_transport_passenger`.
- Limpieza opcional del histórico: borrar las filas ya guardadas de los tipos eliminados (`entrenamiento_publicado`, `viaje_vuelo_asignado`, `viaje_transporte_asignado`, `multimedia`, `viaje_documenta_maletas`) para que la campana quede limpia. Dime si la quieres o prefiero conservar el historial.

## Nota

Si prefieres conservar el aviso de vuelo asignado (porque incluye código de vuelo y horario), dímelo y lo dejo; el resto del plan no cambia.

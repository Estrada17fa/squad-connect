# Agenda — reporte de auditoría y plan de pulido

## 1. Reporte (verificado contra la base de datos)

### Duplicados y huérfanos: LIMPIO hoy
Revisé los disparadores de los cinco módulos y conté las filas reales del calendario. Resultado: 2 eventos en total (1 entrenamiento, 1 partido), cero duplicados y cero huérfanos en los cinco tipos.

Cómo crea el evento cada módulo (una sola vía en todos):

| Origen | Alta | Edición | Baja |
| --- | --- | --- | --- |
| Entrenamiento | disparador, respeta el evento que manda el formulario | actualiza el mismo evento | disparador de borrado |
| Junta | disparador | actualiza por `meeting_id` | disparador + borrado en cascada |
| Partido | disparador | actualiza el evento ligado | disparador de borrado |
| Cita médica | disparador | actualiza el evento ligado | disparador; al cancelar la cita también se quita |
| Viaje | disparador | actualiza por `trip_id` | borrado en cascada |

No encontré el patrón "cliente + disparador crean dos" en ningún módulo restante: solo Entrenamientos lo tenía y ya está corregido.

Dos huecos menores que sí conviene cerrar:

- **Partido sin fecha**: si un partido se guarda sin hora de inicio no genera evento, y si luego se le pone hora sí lo genera. Correcto, pero hoy nada avisa al usuario de que ese partido no aparecerá en la Agenda.
- **Viaje**: se genera UN evento que abarca de la salida al regreso. En la lista aparece solo el día de salida, así que el regreso no se ve como hito propio. No es un error, es una decisión de diseño que hay que definir.

### Fecha y hora: CORRECTO
Todas las columnas de origen y del calendario son `timestamp with time zone` (partido, entrenamiento, junta, cita, viaje). No hay corrimiento posible por tipo de dato; los disparadores copian el valor tal cual, sin recomponer fechas. No hay ningún tipo con hora corrida.

### Permisos: la regla por tipo SÍ está activa y bien ordenada
La regla de lectura evalúa por tipo, en este orden: cita médica → junta → viaje → partido → entrenamiento → evento suelto.

- Cita médica: solo el jugador de la cita o quien tenga acceso a Salud de esa categoría. Un técnico sin Salud no la ve, y el permiso de Agenda no sirve para verla.
- Junta: regla de la junta (convocado o permiso de Coordinación).
- Viaje: regla del viaje (viajero o permiso de Viajes de la categoría).
- Partido: regla de Partidos (convocado o permiso de la categoría).
- Entrenamiento: permiso de Entrenamientos de esa categoría.
- Evento suelto: convocado, o permiso de Agenda de esa categoría.

Todas pasan por la categoría, así que Categoría A no ve Categoría B salvo permiso global. No detecté fuga clara. Dos puntos a cerrar por precaución, no confirmados como fuga:

- **Partido sin ficha de partido ligada** (evento de partido creado a mano desde la Agenda): cae en la regla de Agenda, no en la de Partidos. Es coherente, pero conviene dejarlo explícito.
- **Lista de convocados de un evento**: la regla de asistentes se apoya en una función distinta a la de lectura del evento. Hay que comprobar que para una cita médica nadie fuera de Salud pueda leer quién es el paciente.

## 2. Plan de arreglos

### A. Base de datos (una migración)
1. Alinear la lectura de asistentes con la lectura del evento: quien no puede ver el evento no puede ver sus convocados. Cierra el punto del paciente de la cita médica.
2. Hacer explícita en la regla de lectura la rama de "evento de partido creado a mano": permiso de Agenda de la categoría, igual que hoy pero sin depender del orden del caso.
3. Sin cambios en los disparadores: ya están consistentes.

### B. Comportamiento
4. Viaje: se mantiene **un solo evento** (día de salida) con el rango completo dentro del detalle; el regreso no genera hito propio.
5. Partido sin hora: avisar en la captura del partido que sin hora no aparece en la Agenda.

### C. Pulido visual (sin tocar lógica ni permisos)
6. **AGENDA (lista)**: mantener el agrupado por día con HOY/MAÑANA; el resto de días con etiqueta larga (hoy solo aparece la fecha en HOY/MAÑANA). Tarjeta de evento con barra de color por tipo, hora grande, icono y un renglón de contexto correcto por tipo: partido (rival y sede), entrenamiento (objetivo/categoría), junta (lugar), viaje (destino y regreso), cita (solo "Cita médica" y lugar, nunca motivo ni diagnóstico).
7. Filtros: chips por tipo (ya existen, se afinan) más filtro por categoría; ambos combinables y con estado vacío propio.
8. **MES**: grid limpio, puntos de color por tipo, hoy marcado, día seleccionado con sus eventos abajo usando la misma tarjeta, y leyenda de colores al pie.
9. **VIAJES**: se conserva tal cual la información y los permisos, presentada con el estándar de sheet (hero + secciones + mini-tarjetas de vuelo, hotel, transporte, comidas y pase de abordar).
10. Detalle del evento: router por tipo, siempre en lectura primero; la cita médica muestra solo tipo, fecha, hora y lugar.

### Notas técnicas
- Una sola migración: política de `event_attendees` para SELECT alineada a la visibilidad del evento, y refinamiento del `CASE` de `calendar_events`. Sin cambios de esquema.
- Frontend limitado a `m.agenda.tsx`, `m.mes.tsx`, `agenda-viajes.tsx`, `EventCard.tsx` y `EventDetailSheet.tsx`.
- Sin emojis, solo iconos lucide; colores por tipo desde `src/lib/eventTypes.ts`.

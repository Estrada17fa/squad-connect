# Quitar la hora falsa "12:00 p.m." en eventos de VIAJE (Agenda)

Los viajes no capturan hora, pero el evento de calendario guarda 12:00. Faltan dos lugares en el módulo Agenda.

## 1. Ficha de detalle (EventDetailSheet)

Solo cuando el evento es de tipo viaje (`event_type === "viaje"` o tiene `trip_id`):

- El subtítulo de la cabecera muestra solo la fecha: "viernes, 28 de agosto" (sin " · 12:00 p.m.").
- El campo pasa de "Fecha y hora" a **"Fecha"** y muestra:
  - "viernes, 28 de agosto" si sale y regresa el mismo día,
  - "vie 28 ago → dom 30 ago" si hay fecha de regreso distinta.

Los demás tipos (partido, entrenamiento, junta, cita) quedan exactamente igual, con su hora real.

## 2. Tarjeta de la lista (EventCard)

Recomendación: **rango de fechas en el lugar de la hora**. Es la opción más limpia porque conserva la estructura de la tarjeta (columna izquierda con dos renglones ya existente), no deja hueco y da información real:

```text
VIE 28        [icono]  Viaje a Irapuato
→ DOM 30               Viaje · Irapuato, Gto.
```

- Viaje de un solo día: un único renglón con el día ("VIE 28").
- Viaje con regreso: primer renglón salida, segundo renglón "→ DOM 30".
- El destino sigue apareciendo en el renglón de contexto como hoy.
- Cualquier otro tipo de evento sigue mostrando hora de inicio y fin sin cambios.

## Detalle técnico

- Añadir un helper de formato de rango corto en `src/lib/calendar-utils.ts` (reutilizando `formatShortDate` / `formatDateOnly` ya existentes) para no duplicar lógica.
- `src/components/calendar/EventCard.tsx`: bandera `isTrip` que conmuta solo el bloque de hora de la columna izquierda.
- `src/components/calendar/EventDetailSheet.tsx`: usar la variable `isTrip` que ya existe en el componente para el `description` de la cabecera y para el label/valor del campo de fecha.
- Sin cambios en datos, RLS, permisos ni en el módulo Viajes.

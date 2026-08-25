# Arreglar la creación de eventos desde Agenda

## Qué está pasando (confirmado)

En las peticiones reales de la app, **toda** la lectura de la agenda está fallando con:

`infinite recursion detected in policy for relation "calendar_events"`

Causa exacta (verificada en la base): hay un ciclo entre dos reglas de acceso.

```text
calendar_events (ver)  --consulta-->  event_attendees (¿soy convocado?)
event_attendees (ver)  --consulta-->  calendar_events (¿es cita médica?)
```

Cada una necesita a la otra para decidir, y Postgres corta con error. Por eso
la Agenda no carga eventos y cualquier creación/edición falla en cuanto toca
la convocatoria.

Segundo tema, de diseño: el botón "Nuevo evento" de Agenda crea una fila suelta
de calendario. Para "entrenamiento" eso deja el evento **sin sesión**, así que
no hay dónde poner el plan de entrenamiento; lo mismo con junta, viaje y
partido, que viven en sus propios módulos.

## Qué voy a hacer

### 1. Romper el ciclo de permisos (migración)
- Crear dos funciones internas de apoyo: una que responda "¿este usuario es
  convocado a este evento?" y otra "¿este evento es una cita médica?".
- Reescribir la regla de lectura de `calendar_events` y la de `event_attendees`
  para que usen esas funciones en vez de consultarse entre sí. Mismas reglas de
  quién ve qué; solo desaparece la referencia circular.

### 2. Crear desde Agenda según permisos y categoría
- En el paso "tipo de evento" solo se muestran los tipos donde la persona es
  editora en al menos un equipo, según su módulo real:
  entrenamiento → Entrenamientos, junta → Coordinación, viaje → Viajes,
  partido → Partidos, evento especial → Agenda.
- El selector de equipo se recalcula por tipo: solo aparecen las categorías
  donde esa persona puede editar ese módulo (no las de Agenda en general).
- Si no puede crear nada, el botón "Nuevo evento" no aparece.

### 3. Que cada evento nazca en su módulo
Al elegir el tipo, Agenda abre el formulario del módulo correspondiente, que ya
existe y ya crea el evento de calendario:
- **Entrenamiento** → formulario de sesión de Entrenamientos (queda con plan
  de entrenamiento editable desde Agenda y desde Entrenamientos).
- **Junta** → formulario de juntas de Coordinación.
- **Viaje** → formulario de viaje.
- **Partido** → aviso corto de que se crea desde Torneo/Gestión de partidos,
  con acceso directo.
- **Evento especial** → formulario genérico actual de Agenda.

Así, un entrenamiento creado desde Agenda aparece también en Entrenamientos, y
una junta en Coordinación, sin filas duplicadas ni huérfanas.

## Detalles técnicos
- Migración sobre las políticas `calendar_events_select` y
  `event_attendees_select`, con funciones `SECURITY DEFINER` (`search_path`
  fijo) para cortar la recursión; sin cambios en el resto de políticas.
- Frontend: `EventFormDialog` pasa a filtrar tipos con `useEditableTeams` por
  módulo, y `m.agenda.tsx` orquesta la apertura de `SessionFormDialog`,
  `MeetingFormDialog` y `TripFormDialog` según el tipo elegido.
- Sin cambios en el modelo de datos ni en la escala de permisos.

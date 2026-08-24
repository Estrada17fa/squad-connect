# Entrenamientos: quitar duplicados y poder eliminar

## Por qué se duplican (causa confirmada)

Hay dos creadores del evento de agenda, y ambos corren:

1. El formulario (cliente) crea/actualiza el evento del calendario antes de guardar la sesión, y le pasa `event_id` a la sesión.
2. En la base de datos existe un disparador (`sync_training_session_to_calendar`, BEFORE INSERT OR UPDATE) que, al insertar una sesión, **siempre** crea otro evento y sobrescribe el `event_id` que mandó el cliente — incluso cuando ya venía uno.

Resultado: cada guardado deja un evento huérfano "Entrenamiento · Sin plan" en la Agenda. Los datos lo confirman: hoy hay 3 eventos de entrenamiento sin sesión a la misma hora (03:57–03:59) y solo 1 con sesión.

Al planear desde "Por planear" pasa lo mismo: el cliente liga el evento agendado, pero el disparador lo descarta y crea uno nuevo, dejando el original huérfano.

Editar una sesión existente sí actualiza (el hook usa UPDATE por id), pero como el `event_id` quedó apuntando al evento creado por el disparador, el evento original queda suelto.

## Cómo lo arreglo

**Regla única: el evento lo crea/actualiza SOLO el cliente.** El disparador pasa a respetar el `event_id` que llega.

1. Migración: reescribir `sync_training_session_to_calendar` para que
   - en INSERT, si `NEW.event_id` ya viene, no cree nada (solo sincronice título/fecha/equipo en ese evento);
   - en INSERT sin `event_id`, siga creando el evento (respaldo para altas hechas fuera del formulario);
   - en UPDATE, solo actualice el evento ligado (comportamiento actual, correcto).
2. Migración de limpieza: borrar los eventos de tipo entrenamiento que no tienen ninguna sesión ligada (los 3 duplicados actuales), sin tocar los que sí tienen plan.
3. Formulario (`SessionFormDialog`): asegurar un solo guardado — bloquear doble envío mientras está en curso y usar siempre el `event_id` ya conocido (sesión existente > evento de "Por planear") para que se haga UPDATE y nunca un INSERT nuevo.
4. Verificar los 3 caminos: crear nuevo, planear desde "Por planear", editar existente → en cada uno debe quedar exactamente 1 evento y 1 sesión.

## Eliminar entrenamientos (arreglo 2)

- Botón de eliminar con confirmación ("¿Eliminar este entrenamiento?"), usando el componente de borrado ya existente en el proyecto, en:
  - la ficha de detalle del entrenamiento,
  - la tarjeta de "Por planear" (para quitar un entrenamiento agendado que no se va a hacer).
- Al eliminar una sesión, el disparador de borrado ya elimina su evento de agenda. Para un entrenamiento agendado sin plan, se borra directamente el evento.
- Visibilidad por permiso: solo se muestra si la persona es editor de Entrenamientos en esa categoría (Editor Categoría en su equipo, Editor Global en todos). Lector y Vista Jugador no ven la opción. Se reutiliza la comprobación de acceso por equipo que ya usa el módulo, y las políticas de la base de datos siguen siendo la última barrera.

## Alcance

No se cambia el diseño ni la lógica de los planes de ejercicios; solo el guardado del evento, el borrado y la limpieza de duplicados existentes.

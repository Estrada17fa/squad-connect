# Coordinación: detalle, filtros y estados tipo Monday/Notion

Cambios acotados a Tareas y Juntas del módulo Coordinación. No se toca el sistema de diseño ni los tokens existentes (glass, StandardCard, StatusBadge, chips, sheets).

## 1. Filtros de tareas en dos capas

Reemplazo del pill único actual por dos controles independientes arriba de la lista:

- **Segmento principal** (mismo estilo pill que hoy): `Mis tareas` · `Todas`. Default `Mis tareas`.
- **Filtro de prioridad** (segundo control, a la derecha en desktop / debajo en móvil): selector con `Todas las prioridades`, `Alta`, `Media`, `Baja`. Se combina con el segmento principal (AND).

Ajustes:
- `TaskFilter` pasa a ser `{ scope: 'mias'|'todas'; priority: 'all'|'alta'|'media'|'baja' }`.
- La lógica de auto-cambio al crear una tarea (para que no "desaparezca") se adapta: si el scope la esconde → `todas`; si la prioridad la esconde → `all`. Un solo toast informativo.

## 2. Nuevo estado "En pausa" para tareas

Estilo Monday: los estados pasan a ser `Pendiente → En progreso → En pausa → Completada`, con transiciones libres (no un único "next").

- Migración: ampliar el CHECK / enum de `tasks.status` para incluir `en_pausa`. Mantener default `pendiente`. Trigger existente de `completed_at` sigue disparando solo al pasar a `completada`.
- Agrupación en la lista: se añade sección "En pausa" entre "En progreso" y "Completada".
- `StatusBadge` variants: pendiente=info, en_progreso=pending, en_pausa=info (atenuado), completada=approved.

## 3. Tarjeta de detalle (Tarea y Junta)

Hoy, al tocar una tarjeta con permiso editor se abre directo el formulario. Nuevo comportamiento:

- Tocar cualquier tarjeta (con permiso de acceso, no solo editor) abre un **sheet de detalle** de solo lectura, usando el `EntitySheet` existente.
- Header del sheet: título de la entidad + fila de acciones sticky arriba, visible solo para `editor`: `Editar` (abre el form actual) y `Eliminar` (con confirmación). Para no-editor no aparecen.
- Body organizado en secciones limpias (labels sobrios + valores en `text-foreground`), sin cambiar tokens:
  - **Tarea**: Estado (control interactivo, ver §4), Prioridad (badge), Fecha límite (con indicador "Vencida"), Descripción, Asignados (lista con avatar + nombre + rol), Creado por / Creado el, Completada el (si aplica).
  - **Junta**: Estado próxima/pasada, Inicio y Fin, Ubicación, Agenda, Invitados con su estado de asistencia (chips por persona), Minuta (solo lectura; si es editor y la junta ya pasó, botón "Editar minuta" abre el form). Si soy invitado y es futura, controles Confirmar/Rechazar dentro del detalle.

Flujo: `Detalle → Editar` abre el `TaskFormDialog` / `MeetingFormDialog` ya existentes sin cambios de diseño. Cerrar el form regresa al detalle actualizado.

## 4. Progreso de tareas tipo Monday dentro del detalle

Dentro del sheet de detalle de tarea, el campo Estado es un **selector de segmentos** (pill group) con las 4 opciones. Cualquier asignado o editor puede cambiarlo libremente en cualquier dirección (no solo avanzar). Cambio optimista + toast.

En la tarjeta (grid), el botón rápido "Iniciar / Completar" actual se sustituye por un menú pequeño (`⋯` o click en el badge) con las 4 transiciones, para asignados/editor. Sin cambios visuales fuera del menú.

## 5. Progreso de juntas tipo Monday

Añadir campo `meetings.status` con valores `programada | en_curso | en_pausa | finalizada | cancelada` (default `programada`, timestamptz `started_at` y `ended_at_actual` opcionales para timeline).

- En el detalle, editores ven un selector de estado equivalente al de tareas.
- La sección "Próximas / Pasadas" sigue calculándose por `starts_at`, pero el badge de la tarjeta refleja `status` cuando difiere (ej. `En curso` sobre una próxima, `Cancelada`).
- Sin campos nuevos en el form de creación (default `programada`); el estado se maneja desde el detalle, igual que en Monday/Notion donde se crea y luego se avanza el pipeline.

## 6. Alcance de permisos aplicado a todo Coordinación

Mismo patrón "detalle primero, editar como acción explícita" queda listo para replicarse en los futuros módulos (viajes, solicitudes, etc.) reutilizando el `EntitySheet` de detalle. Este plan solo lo implementa en Tareas y Juntas.

## Archivos afectados

- Migración SQL: enum/CHECK de `tasks.status` (+ `en_pausa`), nueva columna `meetings.status` + `started_at` + `ended_at_actual`, políticas RLS ya cubren estos updates.
- `src/hooks/useCoordinacion.ts`: tipos `TaskStatus`, `MeetingStatus`, campos nuevos.
- `src/routes/_authenticated/m.coordinacion_interna.tsx`: filtros en dos capas, agrupación por 4 estados, tarjetas abren detalle en lugar del form.
- `src/components/coordinacion/TaskDetailSheet.tsx` (nuevo): detalle + acciones editor + cambio de estado.
- `src/components/coordinacion/MeetingDetailSheet.tsx` (nuevo): detalle + asistencia propia + estado + acceso a editar/minuta.
- `TaskFormDialog.tsx` / `MeetingFormDialog.tsx`: sin cambios visuales; solo se invocan desde el detalle.

## Detalles técnicos

- Realtime existente ya invalida `coord-tasks` / `coord-meetings`; los detalles leen del cache y se actualizan solos.
- `completed_at`: el trigger actual llena al entrar a `completada` y limpia al salir; se mantiene y cubre volver de `completada` a `en_pausa`.
- Confirmación de eliminar reutiliza el patrón actual de `Trash2` del form, movido al header del detalle.

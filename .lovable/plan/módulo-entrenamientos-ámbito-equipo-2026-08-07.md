# Módulo Entrenamientos (ámbito equipo)

Sesiones colectivas del equipo y una biblioteca de ejercicios reutilizable. Separado de Desarrollo (que es individual): no se toca ninguna tabla ni pantalla de Desarrollo.

## 1. Tablas nuevas

**`exercises`** — biblioteca reutilizable
club_id, team_id (nullable = ejercicio del club, visible para todos los equipos), name, description, objective, category (`calentamiento`, `tecnica`, `tactica`, `fisico`, `portero`, `recuperacion`, `otro`), duration_minutes, materials, media_path, created_by, created_at, updated_at.

**`training_sessions`** — la sesión
club_id, team_id, event_id (FK a `calendar_events`, nullable), title, objective, session_date (timestamptz), notes, created_by, created_at, updated_at.

**`session_exercises`** — el plan de la sesión
session_id, exercise_id (FK a `exercises`), phase (`calentamiento`, `principal`, `vuelta_calma`), order_index, custom_notes, duration_override.

Índices por club_id, team_id, event_id y session_id. Bucket privado `exercise-media` para imagen/video del ejercicio.

**Permisos:** lectura para cualquiera con acceso al equipo en el módulo `entrenamientos`; escritura solo para editor de ese equipo (mismas funciones de permisos que ya usan Viajes/Plantel). Si se borra la sesión se borran sus ejercicios del plan, pero nunca los de la biblioteca.

## 2. Conexión con el Calendario

- Al crear una sesión se elige: **ligar** a un evento existente de tipo `entrenamiento` del equipo, o **crear** el evento en el mismo formulario (fecha, hora, lugar). Los convocados siguen viviendo en el evento (`event_attendees`), no se duplican.
- La sesión guarda `event_id`; si hay evento, la fecha mostrada es la del evento.
- En Agenda / Mes, al abrir un evento de entrenamiento que tiene sesión, aparece el plan completo (mismo detalle de sesión en modo solo lectura). Así el jugador consulta desde su agenda qué se va a entrenar.
- Si se borra el evento, la sesión queda sin evento (no se borra).

## 3. Reutilización de ejercicios

La biblioteca es el banco maestro. Armar el plan = agregar filas en `session_exercises` que **apuntan** al ejercicio, nunca copian su texto. Cada fila lleva su fase, su orden y ajustes opcionales de esa sesión (`custom_notes`, `duration_override`). Editar un ejercicio en la biblioteca actualiza cómo se ve en todas las sesiones; los ajustes por sesión no se pierden. Un ejercicio en uso no se puede eliminar en duro (se avisa en cuántas sesiones se usa).

## 4. Interfaz

Chips del módulo: **Sesiones** y **Biblioteca**, con `TeamFilter` arriba, siguiendo el patrón de Desarrollo/Viajes.

- **Biblioteca:** tarjetas con miniatura/ícono, nombre, categoría, duración. Buscador + filtro por categoría. Editor puede crear/editar/eliminar con descripción completa, objetivo, materiales y media.
- **Sesiones:** lista separada en próximas y pasadas. Botón verde de ancho completo "Crear sesión" (solo editor). Formulario: título, objetivo, evento (ligar o crear), notas, y constructor del plan por fase con orden y notas por ejercicio.
- **Detalle de sesión** (`EntitySheet`): plan ordenado por fase, cada ejercicio con su explicación desplegable. Componente reutilizable con `readOnly` para el Calendario.

## 5. Permisos y notificaciones

- `read`: ve biblioteca y sesiones del equipo con su plan completo (jugadores y staff).
- `editor`: además crea y edita ejercicios y sesiones.
- `approver`: sin flujo propio, equivale a editor. Queda asignable en Admin y documentado como sin uso.

Notificación al equipo convocado cuando se publica el plan de una sesión próxima (aviso único, no en cada edición menor).

## 6. Detalles técnicos

- Alta de `entrenamientos` en `src/lib/modules.ts` (scope `team`) y en el mapa de páginas de `src/lib/rolePages.ts` (página Mi Club).
- Hook nuevo `src/hooks/useEntrenamientos.ts` con las consultas y mutaciones; componentes en `src/components/entrenamientos/`; ruta `src/routes/_authenticated/m.entrenamientos.tsx`.
- El detalle de sesión se monta también desde `DaySheet`/detalle de evento del calendario.
- No se modifica ningún archivo del módulo Desarrollo.

Confírmame y lo construyo.

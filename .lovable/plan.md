# Reporte + Plan: Mi Perfil, Agenda e Inicio

## 1. Mi Perfil — fuga de permisos (CONFIRMADA)

Lo que hoy hace `mi-perfil.tsx`:

| Sección | Condición actual | Veredicto |
|---|---|---|
| Cabecera + Datos personales + Contacto de emergencia | siempre | Correcto (son datos propios) |
| Rol y categorías | siempre, solo lectura | Correcto |
| Datos deportivos | solo si existe fila en `player_profiles` | Correcto (aplica a la persona) |
| **Mi salud** | solo si la persona tiene `player_profiles.team_id` — **no consulta permisos** | **Fuga**: un miembro con ficha de jugador ve su expediente médico aunque su permiso en Salud sea `sin_acceso` |
| **Mi desarrollo** | **sin ninguna condición** | **Fuga clara**: se muestra a admin, técnico, médico y staff que no tienen acceso a Desarrollo, e incluso a quien no es jugador |
| Documentos asignados | siempre | Correcto: son documentos propios asignados por el club (la RLS de `documents` ya limita) |
| Mi nutrición | no existe | Falta (se agrega condicionada) |

Causa: estas dos secciones se escribieron como "bloques del jugador" y nunca se conectaron a `getModuleAccess`, que es la fuente de verdad que ya usan todos los módulos.

## 2. Mi Perfil — vista y funciones

Ya cumple lo pedido en lo esencial: cabecera con foto, secciones etiqueta-valor con `DetailSection`/`DetailField`, edición limitada a foto (con recorte vía `AvatarUploadField`), correo, teléfono, contacto de emergencia y contraseña. Rol, categorías y datos deportivos son solo lectura con la nota de que solo Admin→Usuarios los cambia.

Menú del avatar: ya es exactamente Mi Perfil + Mis Solicitudes (solo jugador) + Cerrar sesión. No se toca.

## 3. Agenda — verificación

La RLS de `calendar_events` (política `calendar_events_select`) resuelve por tipo de evento y hereda el permiso del módulo de origen:

- médico → solo el jugador de la cita o quien tiene acceso a Salud de ese equipo
- junta → `can_view_meeting`
- viaje (con `trip_id`) → `can_view_trip_new`; evento de tipo viaje → módulo Viajes de ese equipo
- partido → `can_view_match_ops`, o Agenda del equipo si el partido no está ligado a torneo
- entrenamiento → `can_view_training` del equipo
- resto → asistente citado, o Agenda del equipo; los club-wide (`team_id` null) exigen Agenda en cualquier equipo

Conclusión: el aislamiento por club (`has_club_access`) y por categoría está correcto y no hay fuga detectada. No se propone cambio de RLS. Lo único a validar en vivo (con la cuenta del usuario) es que los eventos de entrenamiento y partido de SU categoría sí aparezcan; si falta alguno, el origen sería el permiso del módulo de origen, no la Agenda.

## 4. Inicio — verificación

Los cuatro bloques existen y leen de los hooks ya filtrados:

- Próximo evento + Próximos: `useUpcomingEvents` (mismo filtro RLS de arriba, ventana desde ahora, límite 4)
- Por atender: se **oculta a propósito** cuando no hay nada pendiente (solicitudes por aprobar donde uno es aprobador y no es el solicitante, tareas asignadas sin completar, comunicados sin leer)
- Comunicados: `useAnnouncements` con la RLS de `announcements`

Por lo tanto, "Inicio se ve vacío" es comportamiento correcto cuando no hay eventos futuros, pendientes ni comunicados para esa persona; no hay bug de carga a la vista. Se añade la verificación en vivo para distinguirlo con datos reales.

## Plan de arreglos (mínimo, solo lo que está mal)

1. `src/routes/_authenticated/mi-perfil.tsx`
   - Leer `getModuleAccess` de `useApp()` y condicionar cada bloque personal:
     - Mi salud → `canRead(getModuleAccess("salud"))` **y** ficha de jugador con equipo
     - Mi desarrollo → `canRead(getModuleAccess("desarrollo"))` **y** ficha de jugador (deja de mostrarse a quien no es jugador)
     - Mi nutrición → nueva tarjeta, con `canRead(getModuleAccess("nutricion"))` **y** ficha de jugador, abriendo la ficha personal de nutrición existente en modo consulta
   - Mover la consulta de `player_profiles` que hoy vive dentro de `MiSaludSection` al nivel de la página para que salud, desarrollo y nutrición compartan la misma comprobación de "soy jugador" (sin duplicar consultas ni romper el orden de hooks).
2. No se toca: RLS, menú del avatar, sheet de edición, Agenda, Inicio ni ningún módulo.
3. Verificación posterior: recorrer en vivo Mi Perfil con la cuenta actual, más Agenda e Inicio, y reportar qué se muestra realmente (eventos por tipo y bloques de Inicio) para cerrar los puntos 3 y 4 con evidencia.

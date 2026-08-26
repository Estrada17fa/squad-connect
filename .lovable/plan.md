# Agenda → Viajes: una sola vista para todos

Confirmado: en la pestaña Viajes de Agenda **todos** (jugador, DT, staff, médico, admin,
editor) abren la misma vista de pasajero `MyTripView`, con su propio pase de abordar
arriba y el viaje completo debajo. La gestión sigue viviendo en Coordinación → Viajes.

## Cómo queda

- **Agenda → Viajes** (solo lectura, para cualquiera con acceso al módulo):
  - Arriba **Mi información**: mi citación, mis vuelos con el botón "Ver mi pase de
    abordar", mi transporte, mi hospedaje, mis comidas y mi material.
  - Debajo **Información del viaje**: chips Ida / Regreso / General con toda la
    logística, visible para todos y sin acciones de edición.
  - Sin botón de editar y sin vista de gestión en esta pestaña.
- **Editor sin asignaciones**: "Mi información" muestra el estado ya existente
  "Todavía no tienes asignaciones en este viaje" y debajo sigue viendo el viaje
  completo. Nada se rompe.
- **Coordinación → Viajes** (`/m/viajes`): sin cambios. Ahí el editor sigue creando
  vuelos, asignando transportes/hoteles, subiendo pases y editando con
  `TripDetailSheet`.

## Detalle técnico

- `src/routes/_authenticated/agenda-viajes.tsx`: se elimina la bifurcación
  `detail && canEditTeam(detail.team_id) ? <TripDetailSheet …> : <DetailSheet>` y queda
  únicamente el `DetailSheet` con `<MyTripView trip={detail} userId={user.id} />`.
  Se quitan los imports de `TripDetailSheet` y `useTeamAccess` que dejan de usarse.
- `src/components/viajes/MyTripView.tsx`: sin cambios de lógica; ya cubre el caso vacío
  (`hasMine`) y ya renderiza `<TripTabs trip={trip} canEdit={false} />` para todos.
- Sin migración, sin cambios de RLS ni de permisos. El pase de abordar sigue filtrado
  por la RLS de dueño existente.

# Vista "Mi viaje": info general visible para todos + chips Ida/Regreso/General

Confirmado: se restauran los chips **Ida / Regreso / General** visibles (sin acordeones,
sin restricción por rol), con toda la logística del viaje; **mi info personal** se
mantiene destacada arriba; y lo único privado sigue siendo el **pase de abordar**
(cada quien el suyo, con la RLS de dueño ya existente, que no se toca).

## 1. Cómo queda la vista (pestaña Viajes de Agenda, solo lectura)

### Arriba — MI INFO (se mantiene)

- **Mi citación**: hora y punto de reunión.
- **Mi vuelo** (ida y regreso): aerolínea, código, ruta `SJD → BJX`, horarios, puerta y
  asiento, con el botón destacado **"Ver mi pase de abordar"** (abrir a pantalla completa
  y descargar). Si no hay pase: "Tu pase aún no está disponible".
- **Mi transporte** asignado.
- **Mi hospedaje** (mi cuarto y con quién lo comparto).
- **Mis comidas** y **material a mi cargo**.

### Debajo — Chips Ida / Regreso / General (restaurados, visibles)

El mismo bloque de pestañas que ya usa el detalle del viaje, en modo lectura:

- **Ida** y **Regreso**: transportes con sus pasajeros, vuelos con sus pasajeros, y el
  contador de pases del tramo.
- **General**: hoteles con ocupantes, comidas, equipaje/material y documentos del viaje.

Todo visible para cualquiera que entre a la vista. Sin "ver más", sin acordeones.

## 2. Qué se quita del cambio anterior

- La prop `detail: "player" | "full"` y todo el cálculo de nivel de detalle.
- Los acordeones "Quiénes van al viaje", "Ver todos los vuelos" y "Ver logística general".
- El bloque duplicado de documentos (ahora vive dentro de la pestaña General).

## 3. Detalle técnico

- `src/components/viajes/MyTripView.tsx`: conserva la sección "Mi información" tal cual y
  sustituye la sección "Resto del viaje" por `<TripTabs trip={trip} canEdit={false} />`.
  Se elimina la prop `detail` y el bloque propio de documentos.
- `src/components/viajes/mi/TripFoldedSections.tsx`: se borra.
- `src/routes/_authenticated/agenda-viajes.tsx`: se elimina `detailLevel`, el uso de
  `isPlayerView`/`getModuleAccess` para ese cálculo y la prop `detail`. La bifurcación
  actual con `TripDetailSheet` para staff editor se conserva.
- `TripTabs` con `canEdit=false` no expone ninguna acción de edición; los pases siguen
  filtrados por la RLS de dueño.
- Sin migración, sin cambios de RLS ni de datos.

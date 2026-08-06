# Sin equipo activo global: elegir al crear, filtrar al ver

## Qué cambia

Se elimina el "equipo activo" del header. Ningún módulo vuelve a pedir "selecciona un equipo".

- **Al crear** contenido de equipo (evento, viaje, jugador): un selector de equipo obligatorio dentro del formulario, con solo los equipos a los que el usuario tiene acceso (club-wide = todos los del club). Si solo tiene uno, queda preseleccionado y visible.
- **Al consultar** (Plantel, Agenda, Mes, Viajes): se muestra el contenido de todos los equipos accesibles junto, cada elemento con su etiqueta de equipo, y arriba una fila de chips "Todos · Primera · Sub-20…" para acotar la vista. "Todos" por defecto; el filtro no persiste como contexto, es solo visualización.
- Módulos de ámbito club (Coordinación, Solicitudes, Inventario, Compras, Documentos, Usuarios): sin cambios.
- Permisos y RLS: sin cambios de fondo.

## Componente nuevo

**Filtro de equipo (chips)** — `src/components/squad/TeamFilter.tsx`: fila horizontal scrolleable con "Todos" + un chip por equipo accesible, mismo estilo que los chips de estado ya usados en Solicitudes/Viajes. Estado local de cada página (no global, no persistido).

**Etiqueta de equipo** — badge discreto reutilizable dentro de las tarjetas (nombre/categoría del equipo). Se oculta automáticamente cuando el usuario solo tiene un equipo, para no ensuciar la vista.

## Módulos que se tocan

| Archivo | Cambio |
|---|---|
| `src/components/squad/AppLayout.tsx` | Quita el selector del header, el estado `activeTeamId`, su persistencia y `setActiveTeamId` del contexto. Se agrega `teamOptions` al contexto (lista de equipos accesibles). Los permisos efectivos pasan a usar la unión de membresías (que es lo que ya ocurre para quien ve todo el club); para jugadores, la unión de sus equipos. |
| `src/routes/_authenticated/m.plantel.tsx` | Roster de todo el club (equipos accesibles) + chips de filtro; cada miembro ya trae `teamName`, se muestra como badge. Alta de jugador con selector de equipo. |
| `src/routes/_authenticated/m.agenda.tsx` y `m.mes.tsx` | Consulta en modo club (todos los eventos accesibles) + chips de filtro; cada evento con etiqueta de equipo. El botón de crear abre el formulario con selector de equipo. |
| `src/routes/_authenticated/m.viajes.tsx` | Viajes de todos los equipos accesibles + chips de filtro; tarjeta con badge de equipo. |
| `src/components/calendar/EventFormDialog.tsx` | Nuevo campo "Equipo" obligatorio (reemplaza el `teamId` fijo por prop). Los invitados se recargan al cambiar de equipo. |
| `src/components/plantel/PlayerFormDialog.tsx` | Nuevo campo "Equipo" obligatorio; en edición se muestra fijo. |
| `src/components/viajes/TripFormDialog.tsx` | Nuevo campo "Equipo" obligatorio; el selector de partido asociado depende del equipo elegido. |
| `src/components/calendar/DaySheet.tsx` | Etiqueta de equipo en cada evento del día. |
| `src/routes/_authenticated/index.tsx` (Home) | Próximo evento, conteo de plantel y próximo viaje dejan de filtrar por equipo activo: se calculan sobre todos los equipos accesibles, mostrando el equipo de cada dato. |
| `src/routes/_authenticated/mi-perfil.tsx` | El subtítulo deja de usar el equipo activo (muestra el club y los roles por equipo). |
| `src/components/squad/ModuleTabs.tsx`, `src/lib/prefetch.ts` | Prefetch sin `teamId`: precarga en modo club. |
| `src/hooks/useAccess.ts` | Se conserva `teamOptions` (ya calcula los equipos accesibles); sin cambios de consulta. |

## Selector de equipo en los formularios: solo donde se puede editar

- La lista de equipos del formulario NO es la de consulta: se calcula con los equipos donde el usuario tiene nivel `editor` (o superior) **en ese módulo**. Quien ve Primera y Sub-20 pero solo edita Sub-20, al crear un evento únicamente puede elegir Sub-20.
- Si queda un solo equipo editable: preseleccionado y mostrado fijo (píldora con el nombre, sin dropdown). Si no queda ninguno, el botón de crear no aparece.
- RLS sigue rechazando la escritura en un equipo sin permiso de editor, así que la restricción de la interfaz es coherente con el servidor.
- Al cambiar de equipo en el formulario se recargan las listas dependientes:
  - Evento: invitados = miembros de ese equipo.
  - Jugador: candidatos = miembros de ese equipo aún sin ficha en él.
  - Viaje: convocatoria = miembros de ese equipo, y el selector de partido asociado consulta los partidos de ese equipo (la selección previa se limpia si ya no aplica).
- Implementación: un helper compartido `useEditableTeams(moduleKey)` sobre `permissionsByTeam` de `useAccess`, usado por los tres formularios y por la visibilidad del botón/FAB de crear.

## Detalles técnicos

- `useRoster(clubId, teamId)` y `calendarEventsQueryOptions` ya soportan modo club (`teamId = null` / `mode: "club"`); las páginas pasan a ese modo y el filtro por chips se aplica en memoria sobre el resultado, evitando refetch al cambiar de chip.
- Viajes: `tripsQueryOptions(clubId, teamId)` gana una variante por club (`teamId = null`) que trae los viajes de los equipos accesibles; el realtime pasa a suscribirse por `club_id`.
- Para jugadores (acceso solo a sus equipos), la lista de equipos y el filtrado usan `teamOptions`; RLS sigue siendo el límite real, así que no hay riesgo de fuga entre clubes.
- Se limpia la clave `squad.activeTeamId` de localStorage.
- Sin cambios de base de datos.

## Verificación

Como admin: Plantel, Agenda, Mes y Viajes cargan sin pedir equipo, con chips "Todos · Primera División · Sub-20" y badges por elemento; crear un evento, un jugador o un viaje exige elegir el equipo en el formulario; el header solo muestra club, notificaciones y avatar.

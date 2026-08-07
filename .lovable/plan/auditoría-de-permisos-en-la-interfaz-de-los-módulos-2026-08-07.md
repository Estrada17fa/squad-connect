# Auditoría de permisos en la interfaz de los módulos

## Qué encontré (verificado en el código)

**Plantel — sí falta control de nivel, pero no como se esperaba**
- `m.plantel.tsx` (la lista/roster) no tiene ningún botón de crear jugador: hoy no existe alta de jugador desde ahí, solo navegación a la ficha. Es decir, no hay una acción de escritura filtrada mal, hay una acción que no existe.
- `m.plantel.$playerId.tsx` sí muestra "Editar" con `canEdit = getModuleAccess("plantel")` — un nivel **global (unión de todas las membresías)**. Un usuario editor en Sub-20 y lector en Primera ve el botón Editar también en jugadores de Primera. Este es el bug real de la petición 1.

**Mismo patrón global en módulos de ámbito equipo**
- `m.viajes.tsx`: `canEdit` global se pasa a `TripDetailSheet` para cualquier viaje, sin importar el equipo del viaje.
- `m.agenda.tsx` y `m.mes.tsx`: `canEdit` global habilita editar cualquier evento, incluso de equipos donde el usuario solo lee. El botón de crear ya está bien resuelto (`useEditableTeams`).

**Módulos de ámbito club — consistentes, sin cambios**
- `coordinacion_interna`, `solicitudes`, `compras_facturas`, `documentos`, `inventario` ya calculan `canEdit`/`canManage` desde el nivel del módulo y ocultan crear/editar/eliminar en `read`. Al ser ámbito club, el nivel global es el correcto.

## Qué voy a cambiar

1. **Nuevo helper `useTeamAccess`** (junto a `useEditableTeams`): dado un `moduleKey` y un `teamId`, devuelve el nivel efectivo de ese equipo (`permissionsByTeam[teamId] ?? permissionsByTeam.club`, super admin siempre `approver`) y un `canEditTeam(teamId)` booleano.

2. **Plantel**
   - Ficha del jugador: `canEdit` pasa a evaluarse con el `team_id` del jugador. Un lector en ese equipo ve la ficha completa sin "Editar".
   - Roster: añadir el botón "Agregar jugador" estándar (verde, ancho completo, bajo los chips) visible solo si hay equipos editables en `plantel`, con `TeamSelectField` para elegir el equipo destino — cierra el hueco de que no exista alta.
   - `PlayerFormDialog` se abre solo desde rutas ya filtradas; añado además un guard defensivo que deshabilita el guardado si el equipo no es editable.

3. **Viajes**: `TripDetailSheet` recibe `canEdit` calculado con `trip.team_id`, no el nivel global. `agenda-viajes` sigue `readOnly`.

4. **Agenda y Mes**: el click de edición y la interactividad de cada tarjeta se calculan con el `team_id` del evento; los eventos de equipos donde solo hay lectura se abren en modo consulta.

5. Sin cambios de lógica de negocio, sin cambios de RLS ni de datos.

## Reporte sobre `approver` (documentación, no error)

- **Uso propio real**: `solicitudes` (aprobar/rechazar, vía `useMyApproverTypes`), y las aprobaciones de material/compra/médica que se disparan desde Solicitudes hacia Inventario/Compras.
- **Sin uso propio — solo cuenta como acceso equivalente a editor**: `plantel`, `viajes`, `agenda`, `mes`, `coordinacion_interna`, `documentos`, `inventario`, `compras_facturas`, `usuarios`. Es el comportamiento esperado: la aprobación vive en Solicitudes. Lo dejaré escrito como comentario en el helper de permisos para que no se lea como bug.

## Detalles técnicos

- Archivos tocados: `src/hooks/useTeamAccess.ts` (nuevo), `src/routes/_authenticated/m.plantel.tsx`, `m.plantel.$playerId.tsx`, `m.viajes.tsx`, `m.agenda.tsx`, `m.mes.tsx`, `src/components/plantel/PlayerFormDialog.tsx`.
- Regla única de niveles: `read` → ver; `editor`/`approver` → ver + escribir; super admin → todo.
- Resolución por equipo: override de equipo > permiso de rol de equipo > permiso club-wide.

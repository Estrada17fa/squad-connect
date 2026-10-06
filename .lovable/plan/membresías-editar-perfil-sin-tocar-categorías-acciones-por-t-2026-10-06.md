# Membresías: editar perfil sin tocar categorías + acciones por tarjeta

## Diagnóstico
Hoy, al guardar el perfil de un miembro (Editar), el servidor llama a `syncMemberships`, que hace `DELETE FROM team_memberships WHERE user_id = ...` y vuelve a insertar todo. Por eso editar nombre o teléfono puede borrar o rehacer categorías y cargos.

## Cambios

### 1. Guardar perfil ya no toca membresías ni datos por categoría
- `src/lib/members.helpers.ts`
  - Se elimina `syncMemberships`.
  - `insertInitialMemberships(admin, userId, role, assignments, clubJobTitle)`: solo INSERT, sin DELETE previo. Solo al crear.
  - `ensurePlayerRow(admin, userId, teamId, player)`: crea (o desarchiva) la fila de `player_profiles` de UNA categoría.
  - `archivePlayerRow(admin, userId, teamId)`: archiva la fila de `player_profiles` de UNA categoría.
  - `updatePersonPlayerData(admin, userId, { preferred_foot })`: único dato de jugador que es de la persona; se aplica a sus filas activas.
- `src/lib/members.functions.ts`
  - `createClubMember`: `insertInitialMemberships` + `ensurePlayerRow` por cada categoría de jugador (con dorsal/posición iniciales).
  - `updateClubMember`: solo `profiles` (y contraseña) + pie dominante. No recibe rol, categorías, dorsal ni posición.
- `src/lib/members.schemas.ts`: `updateMemberSchema` sin `role_id`, `assignments`, `club_job_title`, dorsal ni posición.
- `src/components/usuarios/MemberForm.tsx`: en edición se ocultan rol/categorías/dorsal/posición (nota: "Se gestionan desde cada membresía en la ficha").

### 2. Nuevas funciones de servidor para membresías
En `src/lib/members.functions.ts`, con autenticación obligatoria:

- **`updateMembership({ membership_id, role_id, job_title, jersey_number?, position?, secondary_position? })`**
  - Carga la membresía por id y verifica que sea del club del actor.
  - Actualiza solo esa fila (`.eq("id", membership_id)`).
  - Cambio no-jugador -> jugador: `ensurePlayerRow` para esa categoría.
  - Cambio jugador -> no-jugador: `archivePlayerRow` para esa categoría.
  - Si sigue siendo jugador: actualiza dorsal/posición solo en la fila de esa categoría.
- **`removeMembership({ membership_id })`**
  - Borra solo esa fila (`.eq("id", membership_id)`) y, si era de jugador, archiva su fila de `player_profiles` de esa categoría, en la misma llamada al servidor.
- **`addMembership`** (reemplaza la inserción directa de `AddMembershipDialog.tsx`), con las mismas validaciones.

Validaciones en servidor (todas las anteriores):
- **Permiso del actor**: debe administrar usuarios (`authorizeMemberAdmin`, igual que hoy).
- **No escalar privilegios**: salvo super admin, el rol asignado no puede tener en ningún módulo un nivel mayor que el nivel efectivo del actor en ese módulo.
- **Autoprotección**: nadie puede quitar ni degradar su propia membresía de administrador.
- **Último admin del club**: se mantiene `assertNotLastAdmin`.
- **Sin duplicados**: se rechaza si ya existe otra membresía del mismo usuario en la misma categoría (o "Todo el club").

### 3. Ficha del miembro
- `src/components/usuarios/MemberDetailSheet.tsx`: menú (tres puntos) en cada tarjeta, visible solo con `canManage`:
  - **Editar** -> `EditMembershipDialog`.
  - **Quitar** -> `ConfirmDialog`; si es la última membresía, avisa que el usuario quedará sin acceso a ninguna categoría.
- Nuevo `src/components/usuarios/EditMembershipDialog.tsx`: rol + cargo; si el rol elegido es de jugador, muestra dorsal, posición y posición secundaria de esa categoría.
- `AddMembershipDialog.tsx` y `MembersTab.tsx`: usan las funciones de servidor y refrescan la lista.

## Garantía sobre DELETE
Ninguna operación de membresías borra por `user_id`:
- Crear: solo INSERT.
- Editar perfil: no toca `team_memberships`.
- Editar/quitar membresía: siempre por id de la membresía.

Excepción que se mantiene a propósito: **Eliminar usuario definitivamente** (`purgePersonalData`), que borra todos sus datos porque la cuenta desaparece. No se modifica.

## Archivos
- src/lib/members.helpers.ts
- src/lib/members.functions.ts
- src/lib/members.schemas.ts
- src/components/usuarios/MemberForm.tsx
- src/components/usuarios/MemberDetailSheet.tsx
- src/components/usuarios/EditMembershipDialog.tsx (nuevo)
- src/components/usuarios/AddMembershipDialog.tsx
- src/components/usuarios/MembersTab.tsx

# Membresías: editar perfil sin tocar categorías + acciones por tarjeta

## Diagnóstico
Hoy, al guardar el perfil de un miembro (Editar), el servidor llama a `syncMemberships`, que hace `DELETE FROM team_memberships WHERE user_id = ...` y vuelve a insertar todo. Por eso editar nombre o teléfono puede borrar o rehacer categorías y cargos.

## Cambios

### 1. Guardar perfil ya no toca membresías
- `src/lib/members.helpers.ts`
  - Se elimina `syncMemberships`.
  - Nueva `insertInitialMemberships(admin, userId, role, assignments, clubJobTitle)`: solo INSERT, sin DELETE previo. Se usa solo al crear.
  - Nueva `updatePlayerData(admin, userId, player)`: actualiza dorsal/posición/pie en las filas existentes de `player_profiles` del usuario (por id). No crea, no archiva, no toca membresías.
  - Nueva `ensurePlayerRows(admin, userId, teamIds, player)`: inserta fila de jugador para categorías nuevas (usada al crear y al agregar membresía de jugador).
- `src/lib/members.functions.ts`
  - `createClubMember`: usa `insertInitialMemberships` + `ensurePlayerRows`.
  - `updateClubMember`: solo actualiza `profiles` (y contraseña) + `updatePlayerData`. Ya no recibe ni procesa categorías/rol.
- `src/lib/members.schemas.ts`: `updateMemberSchema` deja de exigir `role_id` / `assignments` / `club_job_title`.
- `src/components/usuarios/MemberForm.tsx`: en modo edición se oculta el bloque de rol/categorías (con nota "Las membresías se gestionan desde la ficha") y no se envían.

### 2. Acciones por tarjeta en la ficha
- `src/components/usuarios/MemberDetailSheet.tsx`: cada tarjeta de membresía tiene un menú (tres puntos) con:
  - **Editar cargo/rol** -> diálogo con selector de rol y campo de cargo; `UPDATE team_memberships ... WHERE id = <membresía>`.
  - **Quitar membresía** -> confirmación; `DELETE ... WHERE id = <membresía>`. Si es la última, el mensaje avisa que el usuario quedará sin acceso a ninguna categoría.
  - Solo visible con `canManage` (editor de Usuarios), igual que los botones actuales. RLS existente sigue protegiendo en el servidor.
  - Si la membresía quitada era de jugador, se archiva solo su fila de `player_profiles` de esa categoría.
- Nuevo `src/components/usuarios/EditMembershipDialog.tsx` (rol + cargo).
- Se reutiliza `ConfirmDialog`. `MembersTab.tsx` refresca la lista tras cada acción.

## Garantía sobre DELETE
Tras el cambio, ninguna operación de membresías borra por `user_id`:
- Crear: solo INSERT.
- Editar perfil: no toca `team_memberships`.
- Editar/quitar membresía: siempre `.eq("id", membershipId)`.

Única excepción que se mantiene a propósito: **Eliminar usuario definitivamente** (`purgePersonalData`), que borra todos sus datos personales incluyendo membresías porque la cuenta desaparece. No se modifica.

## Archivos
- src/lib/members.helpers.ts
- src/lib/members.functions.ts
- src/lib/members.schemas.ts
- src/components/usuarios/MemberForm.tsx
- src/components/usuarios/MemberDetailSheet.tsx
- src/components/usuarios/EditMembershipDialog.tsx (nuevo)
- src/components/usuarios/MembersTab.tsx

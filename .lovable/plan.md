
## 1. Nueva página Admin (reemplaza "Yo" en la navbar del Admin)

- En `src/lib/rolePages.ts`:
  - Renombrar la 5ª página `avatar` → `admin` para el rol base **admin**, con label "Admin", icono `Shield`, ruta `/admin`.
  - Módulos que incluye: `usuarios`, `documentos`, más la entrada "Administrar clubes" (solo si `isSuperAdmin`).
  - Los demás roles (técnico, médico, staff, jugador) **pierden** la pestaña "Yo" de la navbar (su perfil se accede desde el avatar del header).
- Crear `src/routes/_authenticated/admin.tsx`: hub con `StandardCard`s para Usuarios, Documentos y Administrar clubes (esta última condicional a `isSuperAdmin`).
- Eliminar `src/routes/_authenticated/yo.tsx` (ya no se usa como pestaña).

## 2. "Ver mi perfil" desde el avatar del header

- En `AppLayout.tsx`, en el `DropdownMenu` del avatar, agregar como primera opción **"Ver mi perfil"** → navega a `/mi-perfil`.
- Crear ruta `src/routes/_authenticated/mi-perfil.tsx` accesible para **todos** los roles, que muestra:
  - **Cabecera**: avatar + nombre completo + email + rol/equipo activo.
  - **Datos personales editables** (sin permisos ni roles): foto de perfil (`avatar_url`), teléfono (`phone`), contacto de emergencia (nombre + teléfono), fecha de nacimiento, nacionalidad, lugar de nacimiento.
  - **Documentos asignados**: sección con placeholder ("Próximamente" / lista vacía) hasta que exista el módulo de documentos.
- Migración DB: agregar a `public.profiles` las columnas `emergency_contact_name TEXT` y `emergency_contact_phone TEXT` (nullable). Solo el propio usuario puede editar su fila (política RLS ya existente en `profiles`).

## 3. Plantel: mostrar todos los miembros filtrados por rol

- Reemplazar la fuente de datos de `m.plantel.tsx`: en lugar de `usePlayers` (solo `player_profiles`), listar **todos los miembros del club/equipo activo** vía `team_memberships` + `profiles` + `roles`, más el `player_profile` correspondiente si el rol es Jugador.
- Nuevo hook `useRoster(teamId, clubId)` (o extensión de `useTeamMembers`) que devuelve por miembro:
  - `avatar_url`, `full_name`, `role_name` (Admin/Técnico/Médico/Staff/Jugador), `job_title` (puesto), `birthdate`, `team_name` (categoría),
  - solo si Jugador: `jersey_number`, `position`, `availability_status`.
- Filtros de la página cambian a: buscar por nombre + filtro por **Rol** (Todos/Admin/Técnico/Médico/Staff/Jugador). Se elimina filtro por posición y disponibilidad (o se mueven a un filtro secundario visible solo cuando Rol = Jugador).
- Tarjeta de miembro (nuevo diseño, sin badges de miembro):
  - Foto de perfil + Nombre completo
  - Categoría (nombre del equipo de la membresía)
  - Cumpleaños (formato `DD MMM`)
  - Si Jugador: dorsal, posición, estado físico (StatusBadge apto/lesionado/en_duda)
  - Si no Jugador: puesto (`job_title`)
- Al tocar un miembro: si es Jugador y tiene `player_profile`, ir a `/m/plantel/$playerId`; si no, ir a `/mi-perfil` (si es el propio) o a una ficha de solo lectura (fase posterior — por ahora, no navega).

## Detalles técnicos

- **Migración SQL** (una sola):
  ```sql
  ALTER TABLE public.profiles
    ADD COLUMN IF NOT EXISTS emergency_contact_name TEXT,
    ADD COLUMN IF NOT EXISTS emergency_contact_phone TEXT;
  ```
- **Roster query**: `team_memberships` filtrado por `club_id` (via join a profiles) y `team_id IS NULL OR team_id = activeTeam.id`, con `role:roles(name, base_role)`, `profile:profiles(...)`, y left join manual a `player_profiles` por `user_id + team_id` cuando `base_role='jugador'`. Deduplicar por `user_id` conservando la membresía del equipo específico si existe.
- **rolePages.ts**: agregar `PageKey = "admin"` como alias del slot 5 para admin, dejando `avatar` para los demás roles pero omitiéndolo de la navbar (renderizar solo pages 1-4 cuando no es admin). Alternativamente: la pestaña "Yo" simplemente no se muestra para no-admin y "Admin" solo para admin — un solo slot que decide su contenido según `activeBaseRole`.
- **Sin código muerto**: eliminar `yo.tsx` y las referencias en `rolePages` a la agrupación `avatar` ahora que el perfil vive en `/mi-perfil` y el admin hub en `/admin`.

## Archivos afectados

- Crear: `src/routes/_authenticated/admin.tsx`, `src/routes/_authenticated/mi-perfil.tsx`, `src/hooks/useRoster.ts`.
- Modificar: `src/lib/rolePages.ts`, `src/components/squad/AppLayout.tsx`, `src/routes/_authenticated/m.plantel.tsx`.
- Eliminar: `src/routes/_authenticated/yo.tsx`.
- Migración: agregar `emergency_contact_name`, `emergency_contact_phone` a `profiles`.

## Fuera de alcance (confirmar si aplica)

- Módulo Documentos real: se deja placeholder en "Mi perfil".
- Ficha de solo lectura para miembros no-jugador desde el plantel: fase posterior.

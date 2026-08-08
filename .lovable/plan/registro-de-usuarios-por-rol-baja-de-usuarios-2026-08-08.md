# Registro de usuarios por rol + baja de usuarios

Hoy `CreateMemberDialog` es un único formulario plano: pide dorsal, posición y tallas a cualquier persona, y guarda esos campos deportivos en `profiles`. Además no existe forma de dar de baja a nadie. Esto lo corrige.

Estado verificado hoy: 5 perfiles en el club, 0 filas en `player_profiles`, 1 perfil con campos deportivos y 0 casos de "basura" (campos deportivos en alguien que no es jugador). La limpieza de datos es, por tanto, trivial y sin riesgo.

## 1. Capa base — `profiles`

Ya existen: nombre (3 campos), correo, teléfono, avatar, fecha de nacimiento, contacto de emergencia (nombre + teléfono). No hace falta añadir nada para la capa base.

Se añaden solo campos de ciclo de vida:

- `status` (enum `member_status`: `activo`, `baja`, default `activo`)
- `deactivated_at`, `deactivated_by`

Los campos deportivos que hoy viven mal en `profiles` (`jersey_number`, `position`, `shirt_size`, `pants_size`, `shoe_size`) se migran a `player_profiles` y se dejan de escribir/leer desde la app. No se borran las columnas en esta entrega (evita romper código no migrado); quedan marcadas como obsoletas y se limpian a NULL en quien no sea jugador.

## 2. Capa jugador — `player_profiles`

Se conserva lo actual (`user_id`, `team_id`, `position`, `jersey_number`, `height_cm`, `weight_kg`, `availability_status`, `notes`) y se añade:

- Deportivos: `secondary_position` (texto, nullable), `preferred_foot` (enum `derecho`/`izquierdo`/`ambos`, nullable)
- Identidad/liga: `nationality`, `birthplace`, `affiliation_number`, `id_document` (todos nullable)
- Administrativos: `joined_at` (date, nullable), `previous_club` (texto, nullable), `player_status` (enum `activo`/`baja`/`prestamo`, default `activo`)
- Archivado: `archived_at` (timestamptz, nullable) — ver cambio de rol
- Tallas: `shirt_size`, `pants_size`, `shoe_size`

`birthdate` NO se duplica: se elimina el uso de `player_profiles.birthdate` y la edad se calcula desde `profiles.birthdate` (la columna se deja como obsoleta, ya sin lecturas).

Migración de datos: para cada usuario con rol base `jugador`, se copian sus campos deportivos de `profiles` a la fila de `player_profiles` de su categoría (creándola si falta); después se limpian a NULL esos campos en `profiles` para todos.

## 3. RLS: sin tocar lo migrado

Las políticas actuales de `player_profiles` son a nivel de fila, no de columna:

- SELECT: `user_id = auth.uid() OR can_view_module(auth.uid(),'plantel',team_id)`
- INSERT/UPDATE/DELETE: `can_edit_module(auth.uid(),'plantel',team_id)`

Añadir columnas no altera ninguna de esas expresiones: los campos nuevos heredan automáticamente la misma regla. La migración solo hace `ALTER TABLE ... ADD COLUMN` y `UPDATE`; no se crea, borra ni modifica ninguna política de `player_profiles`, ni ninguna función de permisos. Crear/editar/dar de baja usuarios sigue exigiendo editor de `usuarios` (o super admin), validado en el servidor igual que hoy.

## 4. Formulario dinámico por rol (rediseño visual)

Un solo componente `MemberForm` usado para alta y edición, dentro de un sheet, organizado en tarjetas/secciones con título y separación (no un formulario plano corrido). Se elimina el wizard de 2 pasos.

- **Datos básicos** — nombre / apellidos, correo, contraseña (solo alta), teléfono, foto, fecha de nacimiento, contacto de emergencia.
- **Rol** — un único selector de rol por persona (Admin, Técnico, Médico, Staff, Jugador…). Se sustituye la lista de membresías multi-rol actual.
- **Categorías y puesto** — lista de las categorías del club con casilla por categoría; al marcar una aparece a su lado un campo de texto libre "Puesto" (ej. "DT" en Sub-20). Se guarda en `team_memberships.job_title`. Oculta cuando el rol es Admin (se crea una membresía club-wide sin categoría).
- **Datos deportivos** — visible SOLO con rol Jugador, con subsecciones: Deportivos (dorsal, posición, posición secundaria, pie hábil), Físicos (altura, peso), Identidad/liga (nacionalidad, lugar de nacimiento, afiliación, CURP/documento), Administrativos (fecha de ingreso, club de procedencia, estatus). Se guarda una fila de `player_profiles` por categoría marcada.

Validaciones: Jugador exige al menos una categoría; Admin no admite categorías; dorsal único por categoría (aviso, no bloqueo duro).

## 5. Cambio de rol jugador ↔ no jugador (en edición)

- Deja de ser jugador → sus filas de `player_profiles` se marcan con `archived_at = now()` en vez de borrarse. Dejan de aparecer en Plantel y en el formulario.
- Vuelve a ser jugador → se restaura la fila archivada de esa categoría (`archived_at = NULL`) con sus datos previos; si no existía, se crea vacía.
- Todas las consultas de Plantel/roster filtran `archived_at is null`.

## 6. Eliminar usuarios — recomendación: baja suave por defecto

**Baja suave (predeterminada).** `profiles.status = 'baja'`: pierde acceso, desaparece de listas activas, selectores y convocatorias, y sus membresías se desactivan; su historial (solicitudes, préstamos, gastos, asignaciones, notas médicas, viajes) queda intacto y sigue mostrando su nombre. Es reversible ("Reactivar"). Lo que se pierde: nada de datos; solo deja de poder entrar y de ser seleccionable.

El corte de acceso se hace en el servidor: la función de permisos devuelve "sin acceso" para usuarios en baja y el guard de rutas los expulsa a la pantalla de acceso con un mensaje; adicionalmente se revocan sus sesiones activas al darlo de baja.

**Borrado duro (excepción).** Solo se ofrece cuando el usuario no tiene ningún dato ligado; el servidor comprueba las tablas donde aparece como autor/participante y, si encuentra cualquier referencia, rechaza el borrado y propone la baja. Si procede, se elimina la cuenta y el perfil de forma irreversible.

Salvaguardas en ambos casos: diálogo de confirmación escribiendo el nombre, nunca sobre uno mismo, nunca sobre el último Admin activo del club, y solo para editor de `usuarios` o super admin.

## 7. Detalles técnicos

- Migración SQL: enums `member_status`, `preferred_foot`, `player_status`; `ALTER TABLE profiles/player_profiles ADD COLUMN`; backfill de campos deportivos a `player_profiles`; limpieza a NULL en `profiles`. Sin cambios de políticas.
- Servidor (`src/lib/members.functions.ts`): se amplía `createClubMember` (rol único + categorías con puesto + bloque jugador) y se añaden `updateClubMember`, `deactivateClubMember`, `reactivateClubMember` y `hardDeleteClubMember`, todas con `requireSupabaseAuth` y la misma verificación de editor de `usuarios` que ya existe.
- Front: nuevo `src/components/usuarios/MemberForm.tsx` (secciones) reutilizado por alta y edición; `MembersTab.tsx` gana filtro Activos/Bajas y acciones Editar / Dar de baja / Reactivar / Eliminar; `usePlayers`/`useRoster` filtran archivados y leen los campos nuevos; la ficha de jugador muestra las secciones nuevas.

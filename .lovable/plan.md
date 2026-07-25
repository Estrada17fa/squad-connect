# Plan: Roles simplificados + puesto informativo

## Objetivo

Reducir los roles del sistema a **5 buckets** que controlan permisos, y añadir un campo **"puesto"** puramente informativo que describe qué hace la persona (utilero, kinesiólogo, auxiliar, preparador físico, etc.). El puesto NO afecta permisos: es solo etiqueta visible en el perfil y en las listas de miembros.

## 1. Cambio conceptual

**Antes:** el rol mezclaba permisos y descripción del puesto → cada club terminaba creando "Utilero", "Kinesiólogo", "PF"… duplicando la matriz de permisos.

**Ahora:**

- **Rol** = grupo de permisos. 5 opciones fijas de sistema:
  1. **Admin** — acceso total al club.
  2. **Técnico** — cuerpo técnico (permisos deportivos amplios).
  3. **Médico** — cuerpo médico (Salud, Plantel lectura, etc.).
  4. **Staff** — apoyo operativo (utilería, logística, multimedia…). Permisos base mínimos; el admin sube lo que necesite por override.
  5. **Jugador** — vista de jugador.
- **Puesto** (`job_title`) = texto libre por membresía. Ej. "Utilero", "Kinesiólogo", "Auxiliar técnico", "Portero". Se muestra en el perfil y en la tarjeta del miembro. No lo lee `useAccess` ni ninguna RLS.

El admin sigue pudiendo crear roles personalizados si algún club de verdad necesita otro bucket de permisos — no se elimina esa capacidad, solo cambian los defaults.

## 2. Migración de base de datos

Una sola migración:

1. **Renombrar rol "Utilero" → "Staff"** en `roles` (para todos los clubes existentes, filtrando `is_system_default = true`). Sus `role_permissions` y `team_memberships` se conservan automáticamente porque el `id` no cambia.
2. **Añadir columna `job_title text NULL`** a `team_memberships`. Nullable, sin default. Ningún índice.
3. **Actualizar el seed** en `handle_new_user` / lugar donde se crean roles de sistema: reemplazar la lista `[Admin, Técnico, Médico, Utilero, Jugador]` por `[Admin, Técnico, Médico, Staff, Jugador]`. (En `src/routes/_authenticated/admin.clubs.tsx` línea 245 y en el texto de la línea 293.)

No se toca `profiles.position` (esa es la posición futbolística del jugador — sigue existiendo separada).

## 3. Server function `createClubMember`

- Añadir `job_title` opcional a cada item del array `memberships` en el schema Zod (`z.string().trim().max(60).optional().nullable()`).
- Al insertar en `team_memberships`, incluir `job_title`.
- Nada más cambia (auth, validaciones y forzado de `club_id` quedan igual).

## 4. UI

### `CreateMemberDialog`

En la sección **Membresías**, cada fila añade un tercer campo bajo Rol+Equipo:

```
[ Rol ▾ ]   [ Equipo ▾ ]
Puesto: [___________________]  (opcional, ej. Utilero, Kinesiólogo, Portero)
```

### `MembersTab` — lista de miembros

Debajo del nombre, además del rol, mostrar el puesto cuando exista:

```
Emilio Estrada
Admin · Director deportivo
```

### `AddMembershipDialog` (añadir membresía a miembro existente)

Añadir el mismo input "Puesto" opcional junto al selector de rol/equipo.

### Detalle de miembro / perfil

En la sección de membresías, mostrar el puesto junto al rol y equipo.

### Ningún otro módulo cambia

`useAccess`, `AppLayout`, `getModuleAccess`, la matriz de permisos y todos los módulos (Calendario, Plantel, Coordinación) siguen leyendo únicamente `role_id` + overrides. `job_title` es texto informativo, invisible para la lógica de permisos.

## 5. Compatibilidad

- Membresías existentes quedan con `job_title = NULL` → la UI simplemente no muestra la línea del puesto. Nada se rompe.
- Miembros con rol "Utilero" pasan a mostrarse como "Staff" automáticamente porque solo se renombró la fila.
- Roles personalizados que algún club ya haya creado se mantienen intactos.

## 6. Fuera de alcance

- No se recalculan los `role_permissions` de los roles renombrados (Staff hereda los que ya tenía Utilero). Si quieres afinar los defaults de Staff, lo hacemos en un paso aparte.
- No se toca `useCoordinacion.ts` (el filtro "excluye Jugador" sigue funcionando porque ese nombre no cambia).
- No se toca el flujo de invitación por email.

## Pregunta abierta

¿Quieres que además en esta misma tanda actualice los **defaults de permisos** que se siembran para "Staff" (hoy son los que tenía "Utilero" — probablemente `read` en varios módulos)? Si sí, dime qué debería ver Staff por defecto y lo incluyo; si no, lo dejo tal cual y cada admin lo ajusta con overrides.

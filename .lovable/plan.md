## Objetivo
Rediseñar el flujo de creación de miembros: primero se define(n) la(s) membresía(s) (rol + categoría + puesto), y luego el formulario personal se adapta al rol de mayor prioridad. Además, separar el nombre en tres campos y añadir "Lugar de nacimiento".

## Cambios en base de datos
Migración que:
- Añade a `profiles`: `first_name text`, `paternal_last_name text`, `maternal_last_name text`, `birthplace text`, `name_completed boolean default false`.
- Mantiene `full_name` (compatibilidad); al insertar nuevos miembros se rellena como `first_name + paternal + maternal`.
- Marca todos los perfiles existentes con `name_completed = false` (aviso "Completar nombre" en la ficha del miembro).
- Sin cambios en RLS ni en roles/permisos existentes.

## Server function `createClubMember`
- Validador Zod:
  - `first_name`, `paternal_last_name`, `maternal_last_name` (requeridos).
  - `birthplace` opcional.
  - Campos "de jugador" (`jersey_number`, `position`, `shirt_size`, `pants_size`, `shoe_size`) solo aceptados si al menos una membresía usa el rol **Jugador**; si no, se ignoran/normalizan a null.
  - `position` limitado al enum `Portero | Defensa | Mediocampista | Delantero`.
- Al guardar el `profile`, calcula `full_name` concatenado y marca `name_completed = true`.
- Sigue soportando **varias membresías mezclando roles** (respuesta del usuario).

## Rediseño de `CreateMemberDialog`
Wizard de 2 pasos dentro del mismo diálogo, para no romper nada de estilo:

1. **Paso 1 — Membresías (primero)**
   - Igual que hoy pero movido al inicio: filas de Rol → Categoría → Puesto.
   - Botón "Añadir membresía" y validación de al menos una completa.
   - Se calcula el "rol dominante" para el paso 2 con prioridad: Jugador > Admin > Técnico > Médico > Staff.

2. **Paso 2 — Datos del miembro** (campos condicionales según rol dominante)
   - Comunes a todos los roles: Email, Contraseña, Nombre, Apellido Paterno, Apellido Materno, Fecha de nacimiento, Nacionalidad, Lugar de nacimiento, Teléfono (opcional).
   - **Solo si Jugador**: Dorsal, Posición (Select con las 4 opciones), Tallas (playera / inferior / calzado).
   - **Admin, Técnico, Médico, Staff**: se ocultan dorsal/posición/tallas.

Navegación: botones "Atrás" / "Siguiente" / "Crear miembro". Reset al cerrar.

## Ficha del miembro (`MembersTab`)
- Mostrar nombre como `first_name paternal_last_name maternal_last_name` cuando `name_completed = true`; si no, mostrar `full_name` con un badge `Completar nombre`.
- Sin cambios en la lista de membresías (ya muestra `Rol · Puesto`).

## Fuera de alcance (no se toca)
- Matriz de permisos y roles del sistema.
- `AddMembershipDialog` existente (sigue permitiendo añadir membresías después).
- Módulos Calendario / Plantel / Coordinación.
- Migración automática de `full_name` de miembros antiguos (quedan marcados como incompletos).

## Detalles técnicos
- Nuevo enum TS `PlayerPosition = 'Portero' | 'Defensa' | 'Mediocampista' | 'Delantero'` en `src/lib/members.functions.ts`; el campo `profiles.position` sigue siendo `text` para no romper datos previos, validación en el server.
- `MembersTab` recibe helper `displayName(profile)` local para centralizar la lógica de nombre.
- Nada se toca de `useAccess`, RLS ni server functions ajenas.

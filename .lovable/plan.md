# Módulo Usuarios — 6 niveles + rediseño de lista, detalle y filtros

Solo interfaz y reglas de visibilidad en el cliente. No se toca ninguna política RLS, función SQL ni el formulario `MemberForm` ni la matriz de roles.

## 1. Los 6 niveles en `usuarios`

Se resuelve con el nivel efectivo que ya expone el contexto (`permissions["usuarios"]`, poblado desde `effective_permission`), más super admin.

| Nivel | Resultado |
|---|---|
| Sin acceso | No aparece en navegación ni en Admin; entrar por URL muestra "Sin acceso" |
| Vista jugador | Igual que Sin acceso |
| Lector categoría | Igual que Sin acceso |
| Lector global | Ve la lista completa y la ficha, **solo lectura** |
| Editor categoría | Igual que Lector global (gestión reservada a Editor global) |
| Editor global | Gestión completa: crear, editar, baja/reactivar, eliminar, membresías, ajustes avanzados |

Dos banderas derivadas en la página:

- `puedeVer` = super admin o nivel ≥ `lector_global`.
- `puedeGestionar` = super admin o nivel = `editor_global`. Es lo que se pasa como `canEdit` a `MembersTab`, `RolePermissionsMatrix` y `UserAdvancedSettings`, así que todos los botones ya construidos se ocultan solos.

La puerta de navegación (`src/lib/rolePages.ts`, gate de Admin) pasa de "cualquier nivel de lectura" a "≥ `lector_global`", para que un lector de categoría no vea la sección. La página se protege igual por su cuenta, no solo el menú. Cuando alguien solo puede ver, la pestaña Roles se muestra en modo consulta (selectores deshabilitados) y no aparece "Nuevo rol".

## 2. Lista de usuarios (rediseño)

Deja de ser una columna de tarjetas de texto y pasa a una rejilla de **tarjetas de persona** legibles de un vistazo:

```text
┌────────────────────────────────────────────┐
│ (foto)  NOMBRE APELLIDO            [Activo]│
│         [Rol]  [Categoría · Puesto]        │
│         correo                             │
└────────────────────────────────────────────┘
```

- Avatar real (`avatar_url`) con iniciales de respaldo.
- Nombre con jerarquía fuerte; correo secundario y discreto.
- Badges: rol(es) (color por rol base: admin, técnico, médico, staff, jugador), estado (Activo / Baja) y "Completar nombre" cuando aplique.
- Puesto y categoría como badge suave (`Sub-15 · Portero`).
- Para poblar rol/categoría/puesto sin una consulta por usuario, se cargan todas las membresías del club en una sola consulta y se agrupan por `user_id` (hoy solo se consultan al seleccionar a alguien).
- En móvil, una tarjeta por fila; en pantallas anchas, dos columnas.

## 3. Detalle en sheet (patrón único de la app)

Hoy el detalle vive en un panel lateral incrustado. Pasa a `DetailSheet`, igual que el resto de módulos:

- Abre siempre en **lectura**: foto grande, nombre, badges de estado y rol, y secciones etiqueta‑valor (Contacto, Membresías, Datos deportivos si es jugador, Ajustes avanzados plegados).
- Botón "Editar" en la cabecera solo con `puedeGestionar`; abre el `MemberForm` existente (sin rehacerlo).
- Acciones de Dar de baja / Reactivar / Eliminar y "Añadir membresía" quedan en la cabecera de la sheet, solo para Editor global.
- Con permiso de solo lectura la sheet no muestra ninguna acción ni selectores de rol; las membresías se ven como badges.
- Fechas (alta, baja) con el formato/locale del club ya establecido.

## 4. Filtros

Un solo bloque compacto sobre la lista, sin chips sueltos:

- Buscador (nombre o correo) siempre visible.
- Segmentos **Activos / Bajas** al lado (dos estados, es lo principal).
- Botón "Filtrar" con contador de filtros activos que abre un panel ordenado con: Rol, Categoría/equipo y Puesto. Dentro, "Limpiar filtros".
- Debajo, una línea de resumen con el conteo ("18 miembros").

## 5. Detalles técnicos

- `src/routes/_authenticated/m.usuarios.tsx`: calcula `puedeVer` / `puedeGestionar` y bloquea la página cuando no hay nivel; pasa `canEdit = puedeGestionar`.
- `src/lib/rolePages.ts`: el gate de Admin exige nivel ≥ `lector_global` en `usuarios`.
- `src/lib/permissions.ts`: helper `canManageUsers(level)` (solo `editor_global`) y `canSeeUsers(level)` (≥ `lector_global`), para una sola fuente de verdad.
- `src/components/usuarios/MembersTab.tsx` se divide para no crecer: `MemberCard.tsx` (tarjeta), `MembersFilters.tsx` (buscador + segmentos + panel) y `MemberDetailSheet.tsx` (ficha en `DetailSheet`). `MembersTab` queda como orquestador.
- Consulta nueva `club-memberships-all` (una por club) para rol/categoría/puesto en la lista; se invalida junto con `club-members` tras cualquier cambio.
- Sin migraciones, sin cambios de RLS ni de funciones SQL. `MemberForm`, `RolePermissionsMatrix`, `UserAdvancedSettings` y `ApproverTypesEditor` se reutilizan tal cual (solo reciben `canEdit`).

## 6. Cómo verificamos

- Sesión de Editor global: ve todo y todas las acciones.
- Rol con `lector_global` en `usuarios`: ve lista y ficha, cero botones de gestión, y los guardados de la matriz de roles deshabilitados.
- Rol con `lector_categoria` o `vista_jugador`: no ve Admin ni la página; entrar por URL da "Sin acceso".
- Recorrido en navegador con sesión real revisando lista, filtros y sheet, sin errores de consola.

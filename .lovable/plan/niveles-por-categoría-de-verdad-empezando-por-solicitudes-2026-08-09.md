# Niveles por categoría de verdad — empezando por Solicitudes

Dos entregas: una regla general de interfaz (todos los módulos muestran los 6 niveles) y el primer módulo que de verdad respeta "por categoría": **Solicitudes**.

## 1. Todos los niveles, en todos los módulos

Hoy los módulos de ámbito club (Coordinación, Solicitudes, Compras, Usuarios) solo ofrecen 4 opciones. Pasan a ofrecer siempre los 6, tanto en la matriz de roles como en la configuración avanzada por usuario:

Sin acceso · Vista Jugador · Lector Categoría · Lector Global · Editor Categoría · Editor Global

Sin catalogar por ámbito, sin recortes. Los textos de ayuda por nivel se conservan.

## 2. Solicitudes con categoría real

Hoy una solicitud no guarda a qué equipo pertenece, así que "Lector Categoría" no puede filtrar nada. Se añade la categoría al registro.

- Cada solicitud se crea con **Categoría/equipo**, o con **Todo el club** cuando no pertenece a una categoría concreta.
- Valor por defecto al crear: el equipo activo del filtro si hay uno; si la persona solo tiene una categoría, esa; si es global, "Todo el club".
- Las solicitudes existentes quedan como "Todo el club" (no se inventa categoría).
- La tarjeta y la ficha muestran un badge con la categoría (o "Todo el club").
- Los filtros ganan Categoría dentro del panel de filtros ya existente.

Qué ve y qué puede cada nivel en Solicitudes:

| Nivel | Ve | Puede |
|---|---|---|
| Sin acceso | nada | — |
| Vista Jugador | solo sus propias solicitudes | crear las suyas |
| Lector Categoría | las de sus categorías + las de "Todo el club" + las suyas | nada más |
| Lector Global | todas las del club | nada más |
| Editor Categoría | las de sus categorías + "Todo el club" + las suyas | crear, editar y **aprobar/rechazar** solo dentro de sus categorías |
| Editor Global | todas | gestión y aprobación en todo el club |

Regla que se mantiene: nadie aprueba su propia solicitud.

## 3. Detalles técnicos

**Base de datos** (una migración):
- `requests.team_id uuid null references teams(id)` (NULL = todo el club) + índice.
- `can_view_request` y `can_approve_request_type` pasan a evaluar `effective_permission(user,'solicitudes', requests.team_id)`: los niveles `*_categoria` exigen `has_team_scope(user, team_id)` y aceptan las filas con `team_id IS NULL`; los `*_global` siguen viendo todo el club. `vista_jugador` queda limitado a `requester_id = auth.uid()`.
- Se reescriben las policies SELECT/INSERT/UPDATE de `requests` (y las de `request_comments` / `request_status_history`, que cuelgan de `can_view_request`) contra esas funciones. Sin cambios en otras tablas.

**Frontend**:
- `src/lib/permissions.ts`: `levelOptionsFor` devuelve siempre los 6 niveles; `coerceLevelFor` deja de recortar. `RolePermissionsMatrix` y `UserAdvancedSettings` no cambian (ya consumen ese helper).
- `src/hooks/useRequests.ts`: `team_id` en lectura, creación y edición; filtro por categoría.
- `src/components/solicitudes/RequestFormDialog.tsx`: campo `TeamSelectField` con opción "Todo el club".
- `src/components/solicitudes/RequestDetailSheet.tsx`: badge de categoría; botones de decisión visibles solo si el nivel efectivo **en esa categoría** es editor.
- `src/routes/_authenticated/m.solicitudes.tsx`: usa `useTeamAccess('solicitudes').levelForTeam(row.team_id)` para decidir vista y acciones fila por fila.

## 4. Cómo verificamos

- Un rol con `lector_categoria` en solicitudes: ve solo las de su categoría y las de "Todo el club", sin botones.
- Un rol con `editor_categoria`: aprueba las de su categoría y no ve acciones en las de otra.
- Un `editor_global`: todo igual que hoy.
- Recorrido en navegador con sesión real, y consulta directa a la base para confirmar el `team_id` guardado.

## 5. Después

Con el patrón validado en Solicitudes, se replica igual en Coordinación (tareas y juntas), Compras y facturas, e Inventario.

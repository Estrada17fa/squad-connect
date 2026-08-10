# Solicitudes — vista tipo Monday, filtros limpios y "Pedir más información"

Se conserva intacto el selector de tipo (`RequestTypePicker`), los formularios por tipo y la lógica híbrida de aprobadores. Cambia la presentación, los filtros, la matriz de permisos en pantalla y se añade un estado nuevo.

## 1. Vista agrupada por estado

La lista deja de ser una rejilla plana y pasa a grupos con encabezado colapsable, en este orden:

```text
Por aprobar (solo si me toca)   3
Pendientes                      5
Requieren información           1
Aprobadas                       8
Rechazadas                      2
Completadas                     4
```

- "Por aprobar" solo aparece para quien es aprobador de ese tipo, con alcance válido y no es el solicitante. Muestra acciones rápidas en la propia tarjeta: Aprobar, Rechazar, Pedir info.
- "Requieren información" se muestra arriba para el solicitante (es lo que él debe atender).
- Cada encabezado lleva el conteo y se puede plegar; el estado plegado se recuerda mientras dure la sesión de la página.

Cada solicitud como fila escaneable: ícono del tipo, resumen automático (`requestSummary`), badge de categoría o "Todo el club", avatar + nombre del solicitante, fecha con el formato del club, monto si aplica y `StatusBadge`. Sin párrafos largos.

## 2. Filtros

Se eliminan las tres filas de chips. Queda el patrón de Usuarios/Coordinación:

- Segmented control arriba: **Mis solicitudes / Todas** (se oculta "Todas" en Vista Jugador, que solo tiene alcance propio).
- Buscador (título, resumen, solicitante) + botón "Filtrar" con contador, que abre un panel con **Tipo**, **Estatus** y **Categoría**, más "Limpiar filtros".
- Debajo, una línea de resumen con el conteo.

## 3. Permisos en pantalla

Todos los niveles pueden crear solicitudes y editar solo las suyas mientras estén **pendientes** o en **requiere información**. Una vez aprobada/rechazada/completada/cancelada, nadie edita el contenido.

| Nivel | Ve | Aprueba |
|---|---|---|
| Sin acceso | nada | no |
| Vista jugador | solo las suyas | no |
| Lector categoría | las suyas + su(s) categoría(s) + "Todo el club" | no |
| Lector global | las suyas + todo el club | no |
| Editor categoría | las suyas + su categoría + "Todo el club" | sí, en su categoría y si está designado para ese tipo |
| Editor global | todo el club | sí, si está designado para ese tipo |

Nadie aprueba lo propio (ya lo garantiza la base).

## 4. "Pedir más información"

Nuevo estado **requiere_info**:

- El aprobador (editor + designado + alcance) escribe una nota y la solicitud pasa a `requiere_info`.
- El solicitante ve la solicitud destacada, puede editarla y **reenviarla**, lo que la devuelve a `pendiente`.
- Historial: cada paso queda registrado como hoy (`request_status_history`), con la nota.
- Transiciones permitidas: `pendiente → requiere_info`, `requiere_info → pendiente` (solo el solicitante), `requiere_info → aprobada/rechazada/cancelada`.

## 5. Notificaciones

Con el sistema existente (`notify_users`), sin push nuevo:

- Pedir info → aviso al solicitante ("Te piden más información sobre tu solicitud …", con la nota).
- Reenvío del solicitante → aviso a los aprobadores de ese tipo (`request_type_approver_ids`).
- Aprobada/rechazada al solicitante: ya existe, se conserva.

## 6. Detalles técnicos

**Base de datos** (una migración):
- Nuevo valor `requiere_info` en el enum `request_status`.
- `requests_status_guard`: añadir las transiciones de arriba; `requiere_info → pendiente` solo por el solicitante; `pendiente/requiere_info → aprobada|rechazada` mantiene el bloqueo de auto-aprobación y sella `decided_at/by`.
- `notify_request_decided`: añadir el caso `requiere_info` (avisa al solicitante) y el caso `requiere_info → pendiente` (avisa a los aprobadores vía `request_type_approver_ids`).
- Policy UPDATE de `requests`: el solicitante puede editar su fila mientras esté en `pendiente` o `requiere_info`.

**Frontend**:
- `src/lib/requestTypes.ts`: `requiere_info` en labels, variante de color, orden y grupos.
- Nuevo `src/components/solicitudes/RequestFilters.tsx` (buscador + segmentos + panel), calcado del patrón de `CoordFilters`.
- Nuevo `src/components/solicitudes/RequestCard.tsx` y `RequestGroupList.tsx` (grupos colapsables + acciones rápidas del aprobador).
- `RequestDetailSheet.tsx`: botón "Pedir más información" con diálogo de nota, aviso visible cuando la solicitud está en `requiere_info`, y botón "Reenviar" para el solicitante.
- `m.solicitudes.tsx`: se limpia (quita `Chips` y `RequestList`), aplica la nueva matriz de permisos y orquesta grupos y filtros.
- Sin tocar `RequestTypePicker`, `RequestFormDialog` (salvo permitir edición en `requiere_info`) ni `useRequestApprovers`.

## 7. Cómo verificamos

- Un aprobador ve "Por aprobar" con acciones rápidas y puede pedir info; el solicitante recibe la notificación y puede reenviar.
- Un `lector_categoria` ve solo su categoría y "Todo el club", sin acciones.
- Vista jugador solo ve las suyas y no tiene el segmento "Todas".
- Recorrido en navegador con sesión real y consulta a la base para confirmar estados e historial.

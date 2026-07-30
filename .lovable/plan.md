## Objetivo

Eliminar por completo el campo "Título" de los formularios de solicitud (creación y edición, los 8 tipos) y sustituirlo por un **resumen automático** derivado de los campos propios de cada tipo, reutilizable en tarjeta, detalle y cualquier lugar que necesite nombrar la solicitud.

## 1. Base de datos

Sin cambios de esquema. La columna `title` sigue siendo obligatoria y se llena **siempre** con el resumen calculado por el sistema, tanto al crear como al editar (se recalcula en cada guardado). Nunca se captura a mano ni se muestra como campo.

## 2. Función de resumen (reutilizable)

Nueva función pura en `src/lib/requestTypes.ts`: `requestSummary(request)` → texto.

| Tipo | Resumen |
|---|---|
| material | `Balones ×5` |
| compra | qué comprar (recortado ~60 caracteres) |
| pago_proveedor | `Proveedor · $1,200.00` |
| reembolso | `Concepto · $450.00` |
| medica | tipo de atención (+ nombre del jugador si se especificó) |
| permiso | `Médica · 12 mar–14 mar` |
| cortesias | `4 boletos · Jornada 5 vs Cimarrones` |
| otro | primeras palabras del detalle |

Reglas:
- Solo se unen con ` · ` las partes con valor; nunca aparece `· $` ni separadores sueltos.
- Si no hay ningún dato utilizable, se devuelve la etiqueta del tipo (ej. "Compra") como respaldo.
- Montos con el formateador de moneda existente; fechas con el formateador local del módulo.

## 3. Formularios (`RequestFormDialog`)

- Se elimina el input "Título", su estado y su validación, en creación y edición, para todos los tipos.
- Al guardar (crear o editar) se calcula `requestSummary(...)` con los valores del formulario y se envía como `title`.
- El resto del formulario (campos dinámicos, foto, artículo, notas) queda intacto.

## 4. Tarjeta en la lista (`m.solicitudes.tsx`)

La tarjeta muestra:
- Ícono del tipo + nombre del tipo como encabezado
- Resumen automático como línea principal
- Avatar + nombre de quien la hizo
- Fecha y monto (si aplica)
- StatusBadge

Se retira el desglose campo-por-campo que hoy repite lo que ya dice el resumen; el detalle completo sigue en la ficha lateral.

## 5. Detalle y otros usos

- `RequestDetailSheet`: el encabezado usa el resumen; el resto del contenido no cambia.
- Cualquier otro lugar que nombre la solicitud (línea "Aprueban", futuros avisos) usa la misma función.

## Fuera de alcance

Sin cambios en la lógica de aprobadores, permisos, ni en el resto de campos de los formularios.

## Detalles técnicos

- `requestSummary(input: { type; details; amount?; currency? }): string`, pura, sin dependencias de React, exportada desde `src/lib/requestTypes.ts`; se llama tanto con la fila de la base de datos como con los valores en edición del formulario.
- Helper interno `joinParts(parts)` que filtra vacíos/`NaN` y une con ` · `.
- Avatar del solicitante en la tarjeta con el componente `Avatar` de shadcn ya disponible.

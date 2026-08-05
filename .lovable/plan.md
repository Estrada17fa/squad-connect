# Solicitudes de material ↔ Préstamos de Inventario (un solo formulario)

## Regla central

El formulario de "Registrar préstamo" de Inventario (`LoanFormDialog`) es el único que existe. Se usa igual desde Inventario (vacío) y desde una solicitud de material aprobada (pre-llenado). No se crea ningún formulario alterno.

## Cambios

### 1. Formulario de préstamo compartido

`LoanFormDialog` acepta valores iniciales opcionales: artículo, cantidad, a quién se presta, motivo, equipo y fecha esperada de devolución, más un `request_id` opcional. Sin esos valores arranca vacío exactamente como hoy.

Al guardar:
- Valida disponibilidad igual que hoy (interfaz + regla del servidor que ya rechaza excesos).
- Si viene de una solicitud: guarda el vínculo en ambos sentidos (el préstamo queda con la solicitud y la solicitud con el préstamo) y la solicitud pasa a "completada" en la misma operación. Si algo falla, no queda a medias: no se marca completada si el préstamo no se registró.

### 2. La solicitud de material pide la misma información que el préstamo

Hoy la solicitud de material pide solo artículo, cantidad y fecha de devolución. Se añaden los mismos campos que tiene el préstamo:
- Motivo (opcional)
- Equipo (opcional)

"A quién se presta" no se pide: es siempre el solicitante. Así el pre-llenado cubre todos los campos del préstamo sin capturar nada dos veces.

### 3. Acción desde la solicitud aprobada

En el detalle de la solicitud de material aprobada aparece el botón **Generar préstamo**, visible solo para quien tenga nivel editor en el módulo `inventario` (no depende de permisos de Solicitudes). Al aprobar una solicitud de material, si quien aprueba es editor de inventario, el formulario se abre de inmediato ya pre-llenado; si no, queda disponible como acción para quien sí lo sea.

Para solicitudes de material, este botón sustituye a "Marcar completada": la solicitud se completa al registrar el préstamo, no a mano.

### 4. Sincronización visible en ambos lados

- Detalle de la solicitud: muestra el préstamo asociado (artículo, cantidad, saldo pendiente, a quién, fechas) con acceso a su detalle.
- Detalle del préstamo: indica que se originó de una solicitud, con acceso a esa solicitud.
- Si la solicitud ya tiene préstamo, el botón "Generar préstamo" desaparece — no se puede duplicar.

## Detalles técnicos

- `src/components/inventario/LoanFormDialog.tsx`: nueva prop `initial?: { item?, quantity?, borrowerUserId?, notes?, teamId?, expectedReturnAt? }` y `requestId?: string | null`; `presetItem` se absorbe en `initial.item`. Tras insertar el préstamo con `request_id`, si hay `requestId` actualiza `requests` con `related_loan_id` y `status: 'completada'` (transición permitida por el guard existente para tipo material) e invalida las queries de solicitudes.
- `src/lib/requestTypes.ts`: `loanDraftFromRequest` se extiende para devolver también `notes` (motivo capturado o "Desde solicitud …") y `team_id`; se añaden los campos `motivo` y `equipo` (nuevo tipo de campo selector de equipo) a la definición del tipo `material`.
- `src/components/solicitudes/RequestFormDialog.tsx`: renderiza el nuevo campo de equipo reutilizando `useClubTeams`; guarda `details.equipo_id` y `details.motivo`.
- `src/components/solicitudes/RequestDetailSheet.tsx`: usa `useAccess` para el nivel de `inventario`, monta `LoanFormDialog` con `initial` desde `loanDraftFromRequest`, y consulta el préstamo ligado (`inventory_loans.request_id = request.id`) para el bloque de sincronización.
- `src/components/inventario/LoanDetailSheet.tsx`: bloque "Origen: solicitud" cuando `request_id` no es nulo.
- Sin cambios de base de datos: `inventory_loans.request_id` y `requests.related_loan_id` ya existen.

## Verificación

Aprobar una solicitud de material → se abre el formulario pre-llenado → al registrar: la solicitud queda completada con su préstamo visible, el préstamo aparece en Activos con toda su información, y la disponibilidad del artículo baja. Registrar un préstamo directo desde Inventario sigue funcionando con el mismo formulario, vacío y sin vínculo.

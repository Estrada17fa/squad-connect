# Estándar de sheet en las 7 fichas que quedaron planas

Solo presentación. Ninguna sheet cambia campos, condiciones, permisos ni acciones: se reordena y se reviste con las piezas ya consolidadas de `DetailSheet` (cabecera con icono/acento, `DetailSection` con icono y título en mayúsculas, `DetailField`/`DetailValue` etiqueta-valor, `DetailItemCard` para elementos repetidos, `DetailEmptyBlock` para vacíos).

## Ajuste previo (mínimo) al componente base

- Barra de acento de la cabecera: hoy es un degradado que se desvanece. Pasa a línea sólida, igual que la barra lateral de las tarjetas, para que cabecera y tarjeta hablen el mismo idioma de color.
- Añadir una pieza pequeña de "avatares en fila con nombre" reutilizable (convocados, lectores, responsables), para no repetir markup en Comunicados, Tareas y Partidos.

## Sheet por sheet

**Agenda — detalle de evento**
Cabecera con el icono y color del tipo de evento y badges (tipo, categoría, estado). Cuerpo en secciones: DETALLE (fecha, hora, duración), UBICACIÓN (sede + mapa), PARTIDO (rival con escudo, torneo, jornada) cuando aplique, CONVOCATORIA (avatares + conteo), y el bloque de origen (plan de entrenamiento / junta / viaje) como sección propia. Vacíos con icono.

**Plantel — ficha del jugador**
Pulir la cabecera: foto más grande, dorsal como pieza destacada, badges de posición y estado físico con el color del semáforo. Secciones DATOS DEPORTIVOS / PERFIL / CONTACTO en rejilla de dos columnas con etiquetas discretas; medidas (peso, talla) como mini-tarjetas con su fecha de medición.

**Comunicados**
Cabecera con acento por prioridad e icono. Secciones: COMUNICADO (cuerpo con buen interlineado), ADJUNTO (mini-tarjeta con icono de tipo de archivo), DETALLE (dirigido a / autor / fecha como campos), CONFIRMACIÓN DE LECTURA con avatares y conteo leídos/pendientes. Acción de eliminar se queda igual, al pie.

**Tareas (Coordinación)**
Cabecera con acento por prioridad, badges de estado y prioridad. Secciones: ESTADO (los mismos botones), DETALLE (alcance, fecha límite con aviso de vencida, descripción), RESPONSABLES (avatares + lista como mini-tarjetas), SUBTAREAS (cada ítem como mini-tarjeta con casilla), REGISTRO (creada / completada).

**Inventario — artículo**
Cabecera con foto del artículo y acento por disponibilidad. Secciones: DATOS DEL ARTÍCULO, STOCK (total / disponibles / prestados como campos numéricos destacados), UBICACIÓN, y PRÉSTAMOS relacionados como mini-tarjetas si la sheet ya los muestra.

**Compras y facturas — gasto**
Cabecera con el monto como dato dominante y badges de pago y estado fiscal (color fiscal como acento). Secciones: DATOS DEL GASTO, PAGO, FACTURA (archivos como mini-tarjetas), PROVEEDOR. Nada de listas planas.

**Partidos (Coordinación) — partido**
Cabecera con escudos y marcador/estado, acento por estado del partido. Secciones: INFORMACIÓN (torneo, jornada, fecha, sede), CONVOCATORIA (avatares y lista como mini-tarjetas), LOGÍSTICA (campos etiqueta-valor), NOTAS.

## Detalles técnicos

- Archivos: `src/components/squad/DetailSheet.tsx` (barra sólida + pieza de avatares), `calendar/EventDetailSheet.tsx`, `plantel/PersonDetailSheet.tsx`, `comunicados/AnnouncementDetailSheet.tsx` y `ReadReceipts.tsx`, `coordinacion/TaskDetailSheet.tsx` y `TaskChecklist.tsx`, `inventario/ItemDetailSheet.tsx`, `compras/ExpenseDetailSheet.tsx`, `partidos/MatchOpsSheet.tsx`.
- Colores desde `src/lib/accents.ts` y los tokens de `src/styles.css`; sin colores sueltos en componentes.
- Sin cambios en hooks, consultas, mutaciones ni condiciones de permiso; los mismos props y las mismas ramas condicionales.

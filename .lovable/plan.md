# Rediseño de las sheets de Salud (estándar Usuarios)

Objetivo: que todas las fichas de Salud tengan la misma jerarquía visual que la ficha de Usuarios: cabecera con avatar, nombre grande y badges de estado, acciones arriba según permiso, secciones con encabezado + icono, campos etiqueta-valor alineados, mini-tarjetas escaneables y estados vacíos con icono.

## Qué se cambia

1. Ficha del jugador (`PlayerHealthSheet` / `PlayerHealthContent`) — usada por el médico, por Mi Salud y desde Plantel/Perfil
   - Pasa a usar el contenedor estándar `DetailSheet` (mismo que Usuarios) en lugar del `EntitySheet` crudo.
   - Cabecera: avatar grande, nombre en display, y debajo badges: semáforo de salud con su color (Apto verde, En duda ámbar, En recuperación azul, Lesionado/Baja rojo) + categoría.
   - Acciones arriba (solo editor de la categoría): Lesión, Revisión, Cita, Editar perfil médico. En lectura no aparecen.
   - Bloque de cambio de estado: se mantiene como chips de semáforo, pero dentro de una sección propia "ESTADO DE SALUD" con la descripción del estado.
   - Secciones con `DetailSection` + icono: LESIONES ACTIVAS, PRÓXIMAS CITAS, REVISIONES, RECETAS, HISTORIAL DE LESIONES, PERFIL MÉDICO BASE.
   - Perfil médico base pasa de `dl` improvisado a `DetailGrid`/`DetailField` (etiqueta discreta, valor destacado), con iconos por campo.
   - Estados vacíos con `EmptyState` (icono + título + mensaje), no texto suelto.

2. Mini-tarjetas escaneables (componente interno reutilizable en el módulo)
   - Una tarjeta común para lesión / cita / revisión / receta: título, badge de estado o tipo a la derecha, línea de metadatos con fecha e icono, y nota secundaria.
   - Colores por gravedad de lesión y por estado de cita usando los tokens ya existentes de `StatusBadge` y `src/lib/salud.ts` (se añade el mapeo de variante por gravedad ahí).

3. `InjuryDetailSheet`
   - Cabecera con avatar del jugador, tipo · zona como título, badges de estado de lesión + gravedad + categoría.
   - Campos en `DetailGrid` (fecha, regreso estimado con días restantes/vencido, gravedad, estado), descripción como sección.
   - Línea de tiempo de avances como tarjetas con fecha; el formulario de nuevo avance y las acciones (alta, eliminar) solo para editor.

4. `CheckupDetailSheet`
   - Misma cabecera con avatar y badges (tipo de revisión + categoría), campos en `DetailGrid`, textos largos en secciones, recetas como mini-tarjetas con `EmptyState` cuando no hay.

5. Cita y receta
   - Se añade una sheet de lectura de cita (`AppointmentDetailSheet`) con el mismo estándar; hoy la cita abre directamente el formulario. Editar sigue abriendo `AppointmentFormDialog` y solo si es editor.
   - Las recetas se muestran como mini-tarjeta dentro de la revisión y de la ficha del jugador (no tienen entidad propia).

## Notas técnicas

- Sin cambios de datos ni de permisos: se reutilizan `useHealth`, `canEdit` por categoría y las variantes de `StatusBadge`.
- Se amplía `src/lib/salud.ts` con variantes de color por gravedad y helpers de formato ya usados.
- Todo el color sale de tokens semánticos existentes; sin emojis, iconos de lucide.

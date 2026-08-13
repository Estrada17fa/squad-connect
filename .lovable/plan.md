# Rehacer módulo SALUD

Mismo módulo, dos entradas: el jugador cae directo en "Mi Salud" (su ficha), el cuerpo médico cae en el panel de su categoría. La ficha individual es idéntica en ambos casos. No se toca la RLS ya migrada.

## Cambios de datos (mínimos, aditivos)

1. Estado de salud: se agregan `en_recuperacion` y `baja_medica` al estado de disponibilidad, conservando `apto`, `en_duda` y `lesionado`. Sigue viviendo en el mismo campo del jugador, así que Plantel refleja el estado sin ver diagnóstico.
2. Revisiones: nuevo campo "tipo" (valoración, fisioterapia, estudio, consulta externa) en la tabla de revisiones, con valor por defecto valoración.
3. Citas programadas: tabla nueva `medical_appointments` (club, categoría, jugador, fecha y hora con zona horaria, tipo, motivo, lugar, notas, estado programada/realizada/cancelada). RLS con las mismas funciones ya migradas: ver si `can_view_module('salud')` en esa categoría o si la fila es propia (`can_view_own_row`); escribir solo con `can_edit_module`. Más GRANT a `authenticated` y `service_role`.
4. Sincronización con Agenda: trigger que crea/actualiza/borra un evento de calendario privado por cada cita, con solo el jugador y el personal médico como convocados y título genérico "Cita médica" (sin motivo ni diagnóstico). Nadie más la ve en Agenda.

## Vistas

**Mi Salud (jugador, y también lo que ve el médico dentro de la ficha)**

- Bloque destacado arriba: semáforo grande con el estado actual y una línea clara ("Lesionado · regreso estimado 12 de septiembre").
- Lesiones activas con su progreso en línea de tiempo y fecha estimada de regreso.
- Próximas citas.
- Perfil médico base (sangre, alergias, condiciones, contacto de emergencia) en tarjeta destacada.
- Historial: lesiones recuperadas, revisiones y recetas, plegado por secciones.
- Tono claro y tranquilizador, no tabla de base de datos.

**Panel (lector/editor)**

- Resumen arriba: "18 aptos · 3 lesionados · 1 en recuperación · 1 baja médica" en tarjetas compactas clicables que filtran.
- Lista de jugadores con avatar, categoría, semáforo y dato clave ("Esguince tobillo · regreso ~2 sem").
- Filtros estándar tipo Usuarios: buscador + embudo (estado, categoría). Agrupación por categoría cuando hay varias.
- Al tocar un jugador: la ficha completa.

**Ficha individual (sheet, lectura primero)**

- Secciones: estado, lesiones activas, citas, perfil médico, historial.
- Botón "Editar" arriba solo si es editor de esa categoría; abre acciones para cambiar estado, registrar lesión, progreso, revisión, receta, cita y editar perfil médico.
- Lector no ve ningún botón de acción.

## Permisos en la interfaz

Se resuelven por categoría con el hook de acceso ya existente:

- Sin acceso: el módulo no aparece.
- Vista jugador: la ruta abre directamente su ficha, sin lista ni filtros ni acciones.
- Lector categoría/global: panel y fichas, sin botones de edición.
- Editor categoría/global: todo lo anterior más registro y edición dentro de su alcance.

La interfaz nunca es la barrera principal: los datos que no corresponden simplemente no llegan desde la base.

## Detalles técnicos

- `src/hooks/useHealth.ts`: se amplía con citas (`useAppointments`, alta/edición/cancelación), tipo de revisión, mutación de estado de salud y un `usePlayerHealth` unificado que alimenta tanto Mi Salud como la ficha del médico.
- `src/lib/salud.ts` nuevo: metadatos de estado (etiqueta, color, icono), tipos de revisión, severidades y formato de "regreso en ~X".
- `src/lib/plantel.ts`: se agregan los dos estados nuevos a `AVAILABILITY_META` para que Plantel los pinte igual.
- Componentes en `src/components/salud/`: `HealthStatusBadge`, `HealthSummaryBar`, `HealthFilters`, `PlayerHealthCard`, `PlayerHealthSheet` (ficha unificada, sustituye a `PlayerMedicalSheet`), `MySaludView`, `AppointmentFormDialog`, `HealthStatusDialog`; se conservan y reestilizan `InjuryFormDialog`, `InjuryProgressDialog`, `CheckupFormDialog`, `MedicalProfileDialog`, `InjuryDetailSheet`, `CheckupDetailSheet`.
- `src/routes/_authenticated/m.salud.tsx`: reescritura; decide entre Mi Salud y Panel según el nivel efectivo, sin sub-chips de "Revisiones/Lesiones" sueltas (todo cuelga del jugador).
- Fechas con los helpers existentes de `calendar-utils`; iconos de lucide, sin emojis.

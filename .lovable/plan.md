# Módulo SALUD (ámbito equipo)

## Tablas nuevas

1. `player_medical_profile` — un registro por jugador+equipo: `club_id`, `team_id`, `player_user_id`, tipo de sangre, alergias, padecimientos crónicos, contacto de emergencia (nombre y teléfono), notas. Único por (jugador, equipo).
2. `medical_checkups` — revisiones: `club_id`, `team_id`, `player_user_id`, fecha, motivo, hallazgos, diagnóstico, notas, `created_by`, `request_id` (opcional, liga a la solicitud médica).
3. `medical_prescriptions` — recetas: `checkup_id` (opcional), `player_user_id`, `club_id`, `team_id`, medicamento/tratamiento, dosis, duración, indicaciones, `prescribed_by`, `prescribed_at`.
4. `injuries` — lesiones: `club_id`, `team_id`, `player_user_id`, tipo, zona del cuerpo, gravedad (`leve|moderada|grave`), fecha de ocurrencia, retorno estimado, estado (`activa|en_recuperacion|recuperada`), descripción, `created_by`.
5. `injury_progress` — evolución: `injury_id`, nota, fecha, `created_by`.

Enums nuevos: `injury_severity`, `injury_status`. La disponibilidad sigue viviendo en `player_profiles.availability_status` — Salud la actualiza y Plantel la refleja tal cual.

## Privacidad y RLS

Función `public.can_access_health(_user_id, _team_id)`: super admin, o acceso al módulo `salud` del club/equipo (misma resolución rol + override que ya usan los otros módulos). Función `public.can_edit_health(_user_id, _team_id)`: nivel `editor` o `approver` en `salud` para ese equipo.

Reglas en las cinco tablas:

- Lectura: `can_access_health(auth.uid(), team_id)` **O** `player_user_id = auth.uid()`. El jugador solo ve sus propias filas; el personal solo dentro de su club y equipo. Nadie más lee nada.
- Escritura (insertar/editar/borrar): solo `can_edit_health`. El jugador no escribe su propio expediente.
- `medical_prescriptions` e `injury_progress` heredan el permiso vía su revisión/lesión (chequeo por `EXISTS` sobre la tabla padre).
- Aislamiento por club y equipo en todas las políticas, más `GRANT` a `authenticated` y `service_role`.
- El técnico/utilero NO recibe ninguna política sobre estas tablas: en Plantel sigue leyendo únicamente `player_profiles.availability_status`, que es un campo aparte y no expone diagnóstico. El detalle médico nunca sale de las tablas de Salud.

## Interfaz

Sub-chips en Salud: **Plantel médico**, **Revisiones**, **Lesiones**, con filtro de equipo (`TeamFilter`) igual que Plantel y Viajes.

- **Plantel médico**: tarjetas de jugadores del equipo con badge de disponibilidad (apto verde, en duda ámbar, lesionado rojo) e indicador de lesión activa. Al abrir: ficha médica con datos base, revisiones, recetas y lesiones.
- **Revisiones**: lista y formulario (fecha, motivo, hallazgos, diagnóstico, notas) con recetas asociadas en el mismo flujo.
- **Lesiones**: alta de lesión, notas de evolución hasta "recuperada", y cambio de disponibilidad del jugador desde ahí. Aviso visual cuando el retorno estimado está próximo o vencido.
- **Vista del jugador**: en su ficha de Plantel y en Mi Perfil, su expediente completo en solo lectura (mismos componentes, sin acciones).

## Conexión con Solicitudes médicas

Una solicitud tipo `medica` aprobada muestra en su detalle el botón "Registrar revisión", visible solo para editor de `salud`. Abre el formulario de revisión pre-llenado con jugador y motivo de la solicitud; al guardar, la revisión queda con `request_id` y la solicitud pasa a `completada`. Si ya existe revisión con ese `request_id`, el botón no aparece. Mismo patrón que material→préstamo y compra→gasto.

## Los tres niveles

- **read**: ve fichas, revisiones y lesiones del equipo. Sin botones de crear/editar (y bloqueado también en RLS).
- **editor**: registra y edita revisiones, recetas, lesiones, evolución y disponibilidad.
- **approver**: todo lo de editor y además aprueba/rechaza solicitudes tipo `medica`. Esto ya está cableado: `request_approver_module('medica')` devuelve `salud`, y `can_approve_request_type` combina rol (`role_request_approvals`) con overrides por persona. Verificaré que el rol médico tenga `medica` en sus aprobaciones y que la bandeja "Por aprobar" de Solicitudes las muestre; ajustaré el semilla si falta.
- El jugador ve lo suyo por ser dueño de la fila, sin ningún nivel en `salud`.

## Notificaciones

Al registrar revisión, receta o cambiar disponibilidad se notifica al jugador con `notify_users` (triggers en base de datos, igual que en Viajes e Inventario).

## Detalles técnicos

- Migración: 5 tablas + 2 enums + funciones `can_access_health` / `can_edit_health` + políticas + grants + triggers `set_updated_at` y de notificación.
- Frontend: `src/hooks/useHealth.ts`, ruta `src/routes/_authenticated/m.salud.tsx` (+ sub-vistas), componentes en `src/components/salud/` (`MedicalRosterCard`, `PlayerMedicalSheet`, `CheckupFormDialog`, `PrescriptionFields`, `InjuryFormDialog`, `InjuryProgressDialog`), enganche en `RequestDetailSheet.tsx` y en Mi Perfil / ficha de jugador.
- Permisos por equipo resueltos con `useTeamAccess` (ya existente); sin cambios en la matriz de Admin, que ya lista `salud`.

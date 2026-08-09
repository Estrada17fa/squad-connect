# Configuración del club — Identidad, Ubicaciones, Categorías y Preferencias

Se mejora la sección Configuración del club (Admin) con el mismo estándar visual del módulo Usuarios: tarjetas escaneables, filtros limpios, sheets en modo lectura con botón Editar, solo iconos. Torneos/Ligas queda fuera de esta entrega.

## Acceso

- Solo Editor Global entra a Configuración del club (hoy basta con cualquier nivel editor). Sin ese nivel: "Acceso restringido".
- La pestaña de Admin se oculta para quien no cumpla.

## 1. Identidad

- Nombre del club editable.
- Logo: subida de archivo restringida a PNG (se rechaza cualquier otro formato con aviso claro), con vista previa del logo actual y del recién subido.
- Se eliminan los campos de color primario y secundario de la interfaz (las columnas quedan en la base sin uso).

## 2. Ubicaciones

- Lista en tarjetas: mini-mapa con pin, nombre y dirección; sin mapa cuando la ubicación no tiene coordenadas.
- Buscador tipo Usuarios sobre el catálogo (nombre/dirección) además del buscador de mapa Nominatim, que se conserva tal cual.
- Crear y editar en un diálogo (no formulario siempre abierto): buscador de mapa, nombre, dirección y pin arrastrable.
- Eliminar: antes de borrar se cuenta el uso en eventos, juntas, hoteles de viaje y puntos de reunión. Si está en uso se bloquea el borrado y se indica dónde se usa; si está libre, se pide confirmación.

## 3. Categorías

- Alta, renombrado y eliminación de categorías del club, en tarjetas con conteo de miembros y jugadores.
- Renombrar: solo cambia la etiqueta; todos los módulos referencian la categoría por id, así que los datos se conservan. Se verifica revisando que ningún módulo guarde el nombre de la categoría como texto.
- Eliminar: bloqueado si hay algo asignado. Se revisan miembros, jugadores, eventos, documentos, solicitudes, viajes, sesiones y ejercicios de entrenamiento, salud y desarrollo; la advertencia enumera qué está asignado y cuántos registros. Solo se borra si está totalmente vacía.

## 4. Preferencias

- Zona horaria, moneda, formato de fecha y, nuevo, primer día de la semana (lunes/domingo).
- Moneda: ya se consume en compras y solicitudes al crear; se completa para que los importes mostrados usen la moneda del club cuando el registro no trae una.
- Zona horaria y formato de fecha: ya se aplican en los formateadores globales; se verifica que las vistas usen esos formateadores.
- Primer día de la semana: se aplica a la vista de Mes y a las cabeceras de días del calendario.
- Cada preferencia lleva una nota corta de dónde se aplica.

## Detalles técnicos

- Migración: `clubs.week_start` (smallint, 1 = lunes por defecto). Sin otros cambios de esquema.
- `useClubSettings.ts`: añadir `week_start` a `ClubRow` y a `useClubPrefs`; `calendar-utils.ts` gana `setClubWeekStart` y `monthGrid`/cabeceras pasan a respetarlo (`m.mes.tsx`).
- `ClubIdentityTab.tsx`: quitar colores, validar `file.type === "image/png"` antes de subir.
- `LocationsTab.tsx`: reescribir con `StandardCard` + `LocationMap`, diálogo de alta/edición y verificación de uso vía conteos en `calendar_events`, `meetings`, `trip_hotels`, `trips`.
- `CategoriesTab.tsx`: ampliar la verificación de borrado con conteos por `team_id` en las tablas de los módulos.
- `admin.configuracion.tsx` y `ModuleTabs.tsx`: guard por nivel `editor_global`.

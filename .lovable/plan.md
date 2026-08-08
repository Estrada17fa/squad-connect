# Configuración del club (Admin)

`/admin/configuracion` pasa a ser el centro de ajustes y catálogos del club, con 5 pestañas: Identidad, Ubicaciones, Categorías, Torneo/Liga y Preferencias. Solo admin/editores del club pueden entrar y escribir; el resto ve "Acceso restringido".

## 1. Identidad del club
- Editar nombre, logo (subida de imagen), color primario y secundario del club del usuario.
- El logo se sube a un bucket público nuevo `club-logos`, ruta `{club_id}/logo.{ext}`, y se guarda la URL en el club.
- Vista previa del logo y de los colores antes de guardar.

## 2. Ubicaciones
- El gestor actual de ubicaciones (crear/editar/eliminar, buscador de mapa, aviso si el lugar está en uso) se queda aquí tal cual. Ya no aparece en Usuarios ni en Agenda.

## 3. Categorías / Equipos
- El gestor de categorías/equipos se mueve desde Usuarios sin cambios de funcionalidad (crear, editar, eliminar con validación de miembros/jugadores asignados).
- Usuarios queda solo con Roles y Miembros.

## 4. Torneo / Liga
- Solo configuración: nombre de la liga (ya existe) y temporada actual (campo nuevo, texto libre, ej. "2026 Apertura").
- No incluye tabla de posiciones ni partidos.

## 5. Preferencias
- Zona horaria del club, moneda y formato de fecha, elegidos de listas.
- La moneda se usa como valor por defecto en montos de Compras, Solicitudes y reembolsos, y en el formato de importes ya mostrados.
- La zona horaria y el formato de fecha se usan al mostrar fechas en la app.

## Columnas nuevas en `clubs`
Ya existen: `name`, `logo_url`, `primary_color`, `secondary_color`, `league_name`.
Se agregan:
- `current_season` (texto, opcional)
- `timezone` (texto, por defecto `America/Mazatlan`)
- `currency` (texto, por defecto `MXN`)
- `date_format` (texto, por defecto `dd/MM/yyyy`)

Sin cambios en tablas de ubicaciones ni equipos.

## Detalles técnicos
- Migración: `ALTER TABLE public.clubs ADD COLUMN ...` con los 4 campos; política de UPDATE en `clubs` para admin del club (y super admin), manteniendo el SELECT existente. Bucket `club-logos` creado con la herramienta de storage + políticas de `storage.objects` (lectura pública, escritura para admin del club en su carpeta).
- Nuevo hook `src/hooks/useClubSettings.ts`: `useClub(clubId)` + `useUpdateClub()` (invalida `["club", id]`), y `useClubPrefs()` que expone `{ currency, timezone, dateFormat }` con defaults.
- `src/routes/_authenticated/admin.configuracion.tsx`: se amplía a 5 `TabsTrigger`/`TabsContent`. Nuevos componentes en `src/components/admin/`: `ClubIdentityTab.tsx`, `ClubLeagueTab.tsx`, `ClubPreferencesTab.tsx`. `LocationsTab.tsx` ya está ahí.
- `CategoriesTab.tsx` se mueve de `src/components/usuarios/` a `src/components/admin/` (mismo código, solo cambia el import) y se elimina su pestaña de `m.usuarios.tsx`.
- Consumo de preferencias: `formatMoney` en `src/lib/expenses.ts` y `src/lib/requestTypes.ts` ya aceptan `currency`; los defaults hardcodeados `"MXN"` en `ExpenseFormDialog.tsx` y `RequestFormDialog.tsx` pasan a leer `useClubPrefs().currency`. El formateo de fechas usa `timeZone` de las preferencias en los helpers de `src/lib/calendar-utils.ts`.
- Todo filtrado por `profile.club_id`; escritura condicionada a admin/super admin.

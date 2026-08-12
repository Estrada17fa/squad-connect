# Rehacer módulo Plantel (solo consulta)

Plantel pasa a ser una vista de **consulta**: muestra el equipo de trabajo completo de cada categoría, agrupado y escaneable. Toda alta o edición vive en Usuarios.

## Lista principal (/m/plantel)

- Se elimina el botón "Agregar jugador" y el diálogo de alta desde este módulo.
- Filtros estándar tipo Usuarios: buscador + botón "Filtrar" (popover) con categoría, posición y tipo de persona (Jugador / Cuerpo técnico / Médico / Staff). Contador de resultados.
- Contenido agrupado por **categoría** (Primera, Sub-20, …). Dentro de cada categoría:
  1. **Jugadores**, subagrupados por posición: Porteros, Defensas, Mediocampistas, Delanteros y "Sin posición" al final.
  2. **Cuerpo técnico y staff** de esa categoría.
- Tarjeta de jugador: foto, dorsal destacado, nombre, posición y un dato clave (pie hábil o nacionalidad). Badge de disponibilidad solo cuando no está apto.
- Tarjeta de staff: foto, nombre y puesto (job_title, o el nombre del rol si no hay puesto).
- Sin emojis: cumpleaños y demás señales pasan a iconos de lucide-react (o se quitan si no aportan).

## Bug "Todo el club"

La tarjeta hoy imprime el scope de la membresía. Se corrige así:
- Un jugador se muestra en la categoría de su ficha deportiva (`player_profiles.team_id`), no en la de su membresía; debajo del nombre va su **posición**, nunca el scope.
- Las personas con membresía club-wide (admin, staff general) aparecen en un grupo final **"Todo el club"** —una sola vez— en lugar de repetirse con esa etiqueta dentro de cada categoría; su tarjeta muestra su puesto.

## Ficha de detalle (sheet, solo lectura)

Se sustituye la página `/m/plantel/$playerId` como formulario por un **sheet de lectura** abierto desde la tarjeta (mismo estándar visual que Usuarios/Viajes).

- Jugador: cabecera con foto grande, dorsal, nombre, posición y estado; luego secciones con badges/datos clave — posición y secundaria, pie hábil, altura/peso, nacionalidad, lugar y fecha de nacimiento, categoría. Resumen, no volcado de campos (tallas, documentos y notas quedan en Usuarios).
- Staff: foto, nombre, puesto, categoría y contacto básico (correo, teléfono).
- Accesos a Salud y Desarrollo se conservan con sus permisos actuales.
- Botón "Editar en Usuarios" arriba, visible **solo** si el usuario puede editar el módulo `usuarios`; navega a Usuarios con esa persona abierta. Desde Plantel no se edita nada.

## Permisos (`plantel`, escala de 6 niveles)

- `sin_acceso`: no ve el módulo.
- `vista_jugador` y `lector_categoria`: solo las categorías donde tienen acceso.
- `lector_global` / `editor_global`: todas las categorías del club.
- `editor_categoria`: sus categorías; "editor" aquí solo puede habilitar el botón hacia Usuarios (y este además exige permiso de edición en `usuarios`).

El filtrado por categoría se resuelve en el cliente con `useTeamAccess("plantel").canReadTeam(teamId)`. **No se toca la RLS ni ninguna función de base de datos.**

## Detalles técnicos

- `src/hooks/useRoster.ts`: devolver también `teamId`, `preferredFoot`, `nationality` y datos de contacto; asignar al jugador la categoría de `player_profiles` y no duplicar filas por membresía.
- Nuevos componentes en `src/components/plantel/`: `PlantelFilters.tsx`, `PlayerCard.tsx`, `StaffCard.tsx`, `PersonDetailSheet.tsx`, más un helper de agrupación por posición.
- `src/routes/_authenticated/m.plantel.tsx`: reescritura de la vista (grupos, filtros, sheet); se retira `PlayerFormDialog` y `useEditableTeams`.
- `m.plantel.$playerId.tsx`: se mantiene como ruta que redirige/abre la ficha en lectura, sin formulario de edición.

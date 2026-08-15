# Cuatro ajustes: matriz de permisos completa, icono de Partidos, orden en Coordinación y limpieza de Configuración

## 1. Matriz de permisos: qué falta de verdad (verificado)

La matriz (por rol y el override por usuario) ya se construye desde el catálogo `MODULES`, así que **visualmente ya lista los 19 módulos** con los 6 niveles, incluidos torneo, comunicados, nutrición y multimedia (una sola entrada, sin duplicar).

El hueco real está en la base: consultando los permisos guardados, existen filas para 18 módulos y **falta por completo `partidos`**. Ningún rol tiene fila para ese módulo, así que su nivel efectivo hoy es "Sin acceso" para todos salvo super admin, aunque la pantalla lo muestre.

Coincidencia matriz ↔ RLS: revisé qué `module_key` usan realmente las funciones de la base y coinciden exactamente con las claves del catálogo (`partidos` en `can_view_match_ops` / `can_edit_match_ops`, `multimedia` en `can_view_media_post` / `can_edit_team_media`, `comunicados`, `nutricion`, `torneo`, `viajes`, `compras_facturas`, etc.). **No hay desajustes de nombres que corregir.**

Acciones:

- Migración que inserta las filas faltantes de `partidos` para los roles existentes de todos los clubes, con el valor por defecto de cada rol base (Admin editor global, Técnico editor de categoría, Médico/Staff lector de categoría, Jugador vista jugador), sin tocar ninguna fila ya existente.
- Añadir la misma verificación como red: al abrir la matriz de un rol, cualquier módulo sin fila se muestra en "Sin acceso" y al guardar se crea la fila (hoy ya se guarda por `upsert`, se confirma el comportamiento).
- Agrupación visible por sección, tal como la pediste: Agenda / Mi Club / Coordinación / Admin. Para eso, en el mapa de páginas Partidos y Multimedia (gestión) ya caen en Coordinación; se revisa que ningún módulo quede fuera de grupo.

Sobre **Configuración del club**: hoy no es un módulo con permiso propio, es una pestaña de Admin visible solo para quien es Editor global en `usuarios`. Propongo dejarlo así (evita crear un permiso nuevo y tocar la RLS de club, ubicaciones y categorías). Si prefieres que sea una fila propia en la matriz, dilo y lo agrego como módulo `configuracion` con su RLS.

## 2. Icono de Partidos

Cambio el icono de espadas por `Volleyball` de lucide, que es el balón redondo estilo fútbol disponible en la librería (no existe un balón de fútbol exacto). Se aplica en el catálogo de módulos, así que cambia en navegación, pestañas y matriz a la vez.

## 3. Orden de módulos en Coordinación

Orden fijo en la página Coordinación para todos los roles (mostrando solo los que la persona puede ver):

Coordinación · Solicitudes · Inventario · Compras y Facturas · Partidos · Viajes · Multimedia

Multimedia sigue siendo su propio módulo dentro de la página, al mismo nivel, no subpestaña.

## 4. Quitar Torneo / Liga de Configuración

Se elimina la pestaña "Torneo / Liga" de Configuración del club y su componente. Toda la gestión de torneos queda solo en Admin → Torneos. Los campos de liga y temporada del club dejan de editarse desde ahí (no se borra ningún dato de la base).

## Detalles técnicos

- `src/lib/modules.ts`: icono de `partidos` → `Volleyball`.
- `src/lib/rolePages.ts`: constante de orden canónico para la página Coordinación aplicada tanto en `resolvePagesForUser` como en `groupModulesByPage`, para que navegación y matriz muestren el mismo orden.
- Migración: `INSERT ... SELECT` de las filas de `partidos` en `role_permissions` por rol base, con `ON CONFLICT DO NOTHING`; se rellena `level` y el equivalente grueso en `access_level`.
- `src/routes/_authenticated/admin.configuracion.tsx`: se quita la pestaña "liga"; se elimina `src/components/admin/ClubLeagueTab.tsx`.

## Cómo verificamos

- Consulta a la base: los 19 módulos con filas para cada rol y `partidos` con el nivel por defecto correcto.
- Asignar Editor de categoría en Partidos a un rol y comprobar que el módulo aparece y permite convocar; bajarlo a Lector y comprobar que ya no edita.
- Recorrido de la página Coordinación con un rol de staff: orden exacto pedido.
- Configuración del club sin pestaña de Torneo/Liga y el resto de pestañas intactas.

## Fuera de alcance

No se cambian los permisos ya funcionando de los demás módulos ni sus políticas de seguridad.

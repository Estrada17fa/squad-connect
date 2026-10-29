# Arreglar "se queda cargando y no entra"

## Qué pasa
Al entrar, la app pide tu perfil junto con el nombre del club. Desde el cambio de permisos existe una tabla nueva ("Todas las categorías") que también conecta personas con clubes. Ahora la base de datos ve dos caminos posibles entre perfil y club, no sabe cuál usar y rechaza la consulta (respuesta 300 "ambigua"). Sin perfil, los permisos nunca terminan de cargar y la pantalla se queda en "Cargando...".

Lo comprobé abriendo la app con tu sesión: la consulta del perfil devuelve ese error en cada intento; las demás (categorías, membresías) responden bien.

## Arreglo
1. En la carga de permisos al entrar, indicar explícitamente el camino directo perfil → club (`clubs!profiles_club_id_fkey`), para que la consulta deje de ser ambigua.
2. Revisar otras consultas que unan perfiles con clubes o con roles de la misma forma ambigua y fijarles el camino explícito (hoy solo apareció esta; las demás ya usan nombres explícitos o no pasan por esa tabla).
3. Para que un error así no vuelva a dejar la pantalla congelada: si la carga de permisos falla, mostrar un mensaje con botón "Reintentar" en lugar del "Cargando..." infinito.

## Verificación
- Abrir la app con tu sesión y confirmar que entra al inicio y que la consulta del perfil responde 200.
- Entrar a Usuarios y a un módulo (p. ej. Agenda) para confirmar que cargan.

## Detalle técnico
- `src/hooks/useAccess.ts`: `club:clubs(name)` → `club:clubs!profiles_club_id_fkey(name)`.
- `src/components/squad/AppLayout.tsx`: rama `isError` del query de acceso con botón que llama `refetch()`.
- Sin cambios en la base de datos ni en permisos.

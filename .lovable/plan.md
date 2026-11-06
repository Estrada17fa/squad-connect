# Limpieza de Administración

## 1. Quitar "Ver versión actual"
Se elimina de: portada de Administración, Usuarios (menú), Torneos (lista y ficha), Club y la página genérica de módulos. También se quita el campo `legacy` de los datos de la portada. (El "Ver versión actual" de Coordinación no se toca.)

## 2. Redirecciones (conservando parámetros)
| Vieja | Nueva |
|---|---|
| /admin | /administracion |
| /m/usuarios | /administracion/usuarios (los `?tab=` / `?filtro=` ya se traducen allí) |
| /admin/torneo | /administracion/torneos |
| /admin/configuracion | /administracion/club |
| /admin/clubs | se mantiene, solo super admin, enlazada desde "Clubes" |

Las rutas viejas quedan como archivos mínimos que solo redirigen (sin pantalla). /m/usuarios debe seguir existiendo como redirección; si se borrara, la ruta genérica /m/<módulo> la capturaría.

## 3. Enlaces a cambiar
- Menú de páginas por rol (botón "Admin" → /administracion).
- Pestañas de módulo (Configuración → /administracion/club, Torneo → /administracion/torneos).
- Coordinación/Torneo: enlace "administrar torneo" → /administracion/torneos.
- Ficha de persona en Plantel: botón a Usuarios → /administracion/usuarios.
- Navegación/avatar/Mi perfil/Inicio/prefetch y enlaces guardados en notificaciones: se revisan; cualquier `/admin`, `/admin/torneo`, `/admin/configuracion` o `/m/usuarios` se cambia. Las notificaciones viejas ya guardadas funcionarán igual por las redirecciones.

## 4. Lo que se va a eliminar
Pantallas (su contenido; el archivo queda como redirección):
- Admin portada vieja, Admin › Torneo, Admin › Configuración, /m/usuarios.

Componentes que quedan sin uso tras lo anterior (se confirma con búsqueda antes de borrar):
- `components/usuarios/MembersTab`, `MemberDetailSheet`
- `components/admin/TournamentFormDialog`, `TournamentDetailSheet`
- `components/admin/LocationsTab`, `CategoriesTab`, `ClubIdentityTab`, `ClubPreferencesTab` (solo si el nuevo Club no los importa)

Se conservan (los usa la nueva Administración): `RolePermissionsMatrix` (Roles), `UserAdvancedSettings` (Permisos de la ficha), `admin.clubs`, el contenedor de /admin, todos los hooks compartidos y la base de datos.

## 5. Portada
- "Atención": se ocultan las filas en 0; si todas son 0, se oculta la sección.
- Tarjetas "Administrar": el dato pasa a segunda línea si no cabe, sin cortarse.

## Prueba
- Abrir cada ruta vieja (con parámetros) y confirmar que llega a la nueva.
- Búsqueda final sin enlaces a rutas viejas; revisión de compilación sin errores de TypeScript.
- Captura móvil de la portada con Atención y tarjetas.

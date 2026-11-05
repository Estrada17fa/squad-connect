# Club de Administración (conectado, nuevo look)

Nueva página `/administracion/club` con el estilo de Usuarios y Torneos. `/admin/configuracion` sigue igual y se llega con "Ver versión actual".

## Qué vas a ver
Una sola página con secciones tipo ajustes del iPhone (título gris pequeño, filas en tarjeta con valor gris y flecha).

1. **Identidad**: logo completo sin recortar, nombre, liga y dos círculos de color. "Editar" abre una hoja con logo, nombre, liga y los dos colores (selector + campo hexadecimal).
2. **Categorías**: nombre, "N jugadores · N staff", estrella en la principal. Se reordenan arrastrando y el orden se usa en toda la app. "+ Agregar categoría" (nombre y tipo) avisa "Se asignó automáticamente a las N personas con Todas las categorías". Al tocar una: renombrar, marcar principal o eliminar. Eliminar usa la revisión que ya existe y muestra por qué se bloquea ("Tiene 38 jugadores y 1 torneo"). Si a esa revisión le falta algún dato (por ejemplo torneos), lo reviso en la pantalla y te aviso.
3. **Ubicaciones**: Sede arriba con etiqueta y las demás debajo, con nombre y dirección corta. "+ Agregar ubicación" con la búsqueda en mapa que ya existe o captura manual. Al tocar una: ver en mapa, editar, marcar como Sede o eliminar con confirmación.
4. **Preferencias**: temporada, zona horaria, formato de fecha, primer día de la semana y moneda. Cada una se edita en una hoja pequeña.
5. **Seguridad**: "Contraseña del club" en verde "Configurada" o ámbar "Falta configurar", con la nota de seguridad. Nunca se muestra la contraseña.
6. **Clubes**: "Administrar clubes ›" solo para super admin.
7. **Portada de Administración**: la tarjeta Club muestra el número real ("2 categorías").

## Único cambio en la base de datos (aprobado por ti)
Agregar en el club un dato para guardar cuál ubicación es la Sede (`clubs.home_location_id`, opcional; si se borra la ubicación, la Sede queda vacía). No se toca nada más ni ninguna regla de permisos.

## Pruebas y entrega
Las capturas se toman a 375 × 667: página completa, edición de identidad con colores, categorías reordenando, intento de borrar una categoría con datos, una ubicación en mapa y una preferencia en edición. Para probar se crean una categoría y una ubicación que se eliminan al final. Después se confirma que Primer Equipo, Equipo Juvenil (con su orden) y las ubicaciones reales quedaron sin cambios. Si se reordena durante la prueba, se deja el orden original.

## Detalles técnicos
- Nueva ruta `src/routes/_authenticated/administracion.club.tsx` y componentes en `src/components/admin/club/*`. Reutilizan las consultas y cambios de ClubIdentityTab, CategoriesTab, LocationsTab y ClubPreferencesTab (`categoryUsage`, reordenar con `display_order`, `is_primary`, búsqueda de lugares, `useClubLogoUrl`).
- Migración: `ALTER TABLE clubs ADD COLUMN home_location_id uuid REFERENCES locations(id) ON DELETE SET NULL`. Usa la regla de actualización que ya existe para clubs y después se regeneran los tipos.
- `getClubPasswordStatus` para Seguridad e `is_super_admin` para la fila Clubes.
- Regla en AGENTS.md: el nuevo Club vive en /administracion/club y /admin/configuracion se mantiene.

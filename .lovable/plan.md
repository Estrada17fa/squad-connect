# Permisos predefinidos por rol

Fijar la matriz que definiste como los valores por defecto de los 5 roles del sistema (Admin, Técnico, Médico, Staff, Jugador), tanto en la base (lo que ya tiene cada club) como en el catálogo de defaults que usan los botones "Valores por defecto" y la creación de roles.

## Qué cambia

1. **Defaults en código** (`src/lib/permissions.ts`, tabla `DEFAULT_ROLE_LEVELS`): se reescribe con tu matriz. Es la fuente que alimenta el botón "Valores por defecto" de la matriz de roles y los defaults al crear un rol nuevo.
2. **Datos actuales** (migración de datos sobre `role_permissions`): se actualizan los 19 módulos de los 5 roles existentes (1 club, 19 filas por rol) para que coincidan con la matriz. Se escribe `level` y, por compatibilidad, la cubeta vieja `access_level`.
3. **No se toca nada más**: los 15 overrides por usuario (`user_permission_overrides`) quedan intactos y siguen ganando sobre el rol; las designaciones de aprobador por tipo (`role_request_approvals`) tampoco se tocan.

## Diferencias respecto a lo que hay hoy (resumen)

- Jugador: Solicitudes pasa de Lector global a Vista jugador; Viajes y Documentos a Sin acceso.
- Técnico: Salud y Nutrición quedan Sin acceso / Lector categoría según tu matriz; Torneo baja a Lector categoría; Solicitudes y Coordinación quedan Editor categoría; Inventario, Multimedia, Viajes, Documentos Lector categoría.
- Médico: Coordinación y Solicitudes suben a Editor categoría; Inventario baja a Lector categoría; Desarrollo Sin acceso.
- Staff: Inventario, Compras, Solicitudes pasan de Editor global a Editor categoría; Multimedia y Coordinación a Editor categoría; Nutrición a Lector categoría.

## Módulos que tu matriz no nombra

- **Mes**: es la vista de calendario de la misma Agenda, así que hereda el mismo nivel que Agenda en cada rol.
- **Tácticas**: módulo aún sin contenido; se alinea con Entrenamientos (Técnico EC, Médico/Staff LC, Jugador VJ, Admin EG).
- **Configuración del club**: no es un módulo de la matriz; vive en Admin y se gobierna por el módulo Usuarios (solo Editor global) más super admin. Con Usuarios en "—" para Técnico, Médico, Staff y Jugador, ninguno de esos roles llega a Configuración.

## Sigue siendo editable

Sí. La matriz de roles en Admin > Usuarios > Roles y permisos escribe directo en `role_permissions` por rol, y los overrides por usuario siguen disponibles por persona. Esta migración solo fija el punto de partida: cualquier cambio posterior desde la interfaz lo sobreescribe y no se vuelve a aplicar solo.

## Nota

Los roles del club actual ya fueron personalizados en algunos módulos; aplicar la matriz reemplaza esos ajustes por los nuevos defaults (que es justo lo que pides). Si prefieres conservar alguno, dímelo antes de aplicar.

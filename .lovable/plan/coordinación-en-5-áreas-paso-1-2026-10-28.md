# Coordinación en 5 áreas (paso 1)

Reorganiza la página Coordinación en 5 áreas usando las pantallas que ya existen. Mi Club, Agenda e Inicio no cambian. Tampoco se tocan get_my_access, effective_permission, las reglas de la base de datos, las tablas, los permisos guardados ni la escala de 6 niveles.

## 0. Arreglo previo: Compras
- `canAccessExpensesModule` pasa a exigir lector_global o más. Hoy pide lector_categoria, y por eso salen listas vacías.
- En `m.compras_facturas.tsx`, canEdit queda solo para super admin o editor_global.
- Los comentarios citan `can_view_compras` y `can_edit_compras` como la fuente de la regla.

## 1. Mapa de áreas
Un archivo nuevo, `src/lib/coordAreas.ts`, con `COORD_AREAS` en este orden fijo. Cada área tiene clave, nombre, icono, subtítulo y lista de módulos, y cada módulo puede llevar una etiqueta propia. Para sumar un módulo después basta con agregar una línea.
1. Técnica (Whistle/ClipboardList): plantel, entrenamientos, partidos, desarrollo ("Evaluaciones") y torneo.
2. Médica (Stethoscope): salud y nutrición.
3. Operacional (Plane): viajes e inventario.
4. Administrativa (Briefcase): compras_facturas y documentos.
5. General (Megaphone): coordinacion_interna ("Tareas y juntas"), comunicados, multimedia_gestion ("Multimedia") y solicitudes.

También va una función `isCoordModuleVisible(key, level, isSuperAdmin)`:
- Por defecto, un módulo se ve con lector_categoria o más; vista_jugador nunca alcanza.
- Compras usa `canAccessExpensesModule`.
- Viajes usa `canManageTripsModule`.
- Multimedia sigue con su regla actual.
- Super admin ve todo.

Los niveles salen solo de get_my_access, a través de `useApp().permissions` y `getModuleAccess`.

## 2. Rutas
- `/coordinacion` (`coordinacion.index.tsx`) y `/coordinacion/$area` (`coordinacion.$area.tsx`) solo redirigen a la primera opción válida según `COORD_AREAS`. Si no hay ninguna, muestran el aviso "Sin acceso a Coordinación". `coordinacion.tsx` pasa a ser el contenedor con `<Outlet />`.
- Cada pantalla se mueve a su propio archivo de componente, por ejemplo `src/components/viajes/ViajesPage.tsx`. Los archivos de ruta solo exportan `Route`, y tanto `/m/<módulo>` como la ruta de Coordinación importan el mismo componente. Así no se duplica código ni se rompe la división del código.
- Cada módulo tiene su propio archivo de ruta en Coordinación, por ejemplo `coordinacion.operacional.viajes.tsx` o `coordinacion.general.solicitudes.tsx`. Son 16 archivos, uno por módulo del mapa.
- Cada ruta usa el mismo `validateSearch` que su versión `/m/`. El esquema se comparte desde un archivo común (`src/lib/searchSchemas.ts`) para no duplicarlo. Así se conservan el tipado y la validación de `?open=`, `?task=` y los demás parámetros.
- El componente lee los parámetros que recibe por props desde la ruta que lo monta, sin `strict: false`.
- Redirecciones de enlaces viejos: `/m/<módulo>` lleva a `/coordinacion/<área>/<módulo>` conservando la URL completa. Aplica a viajes, inventario, compras_facturas, documentos, coordinacion_interna, solicitudes y multimedia_gestion. Se hace en el `beforeLoad` de cada ruta.
- `/m/<módulo>` sigue igual en Mi Club para plantel, entrenamientos, partidos, desarrollo, torneo, salud, nutrición y comunicados.
- `/agenda-viajes` no cambia.
- Se revisan los enlaces internos que apuntan a `/m/viajes`, `/m/solicitudes`, `/m/coordinacion_interna` y los demás de esa lista: notificaciones, Inicio, avatar y prefetch. Pueden seguir funcionando con la redirección, pero los que son de Coordinación se cambian directo a la ruta nueva.

## 3. Quién ve qué
- AppLayout arma `coordAreas`, que son las áreas con al menos un módulo visible.
- La pestaña Coordinación de la barra aparece solo si hay al menos un área. La deciden los permisos, no el rol.
- Se quitan de `coordinacion.tsx` y de `rolePages.ts` el caso especial del jugador y la variante "jugador-solicitudes".
- "Mis solicitudes" del menú del avatar se mantiene con `needsSolicitudesShortcut`. Se ajusta su condición para que dependa de que Solicitudes no aparezca en Coordinación.
- Admin no cambia: Usuarios, Configuración, Torneos y Administrar clubes.

## 4. Diseño
- Arriba va `PageHeader` con "Coordinación · <Área>" y el subtítulo del documento.
- Debajo, las áreas como pastillas con icono y nombre. La activa usa el mismo verde de "Tareas / Juntas". En móvil se desplazan en horizontal. Si el usuario tiene una sola área, no se muestran.
- Después, `ModuleTabs` con solo los módulos del área. Cuando la pantalla está dentro de Coordinación, ModuleTabs usa los módulos del área y enlaces a `/coordinacion/...`. Fuera de ahí, Mi Club y Admin se comportan igual que hoy.
- Para evitar que las pestañas salgan dos veces, las pantallas no pintan su propio ModuleTabs dentro de Coordinación.
- Todo usa los componentes y colores existentes, sin estilos nuevos.

## 5. Pruebas
Las 8 pruebas del documento se hacen con "Ver como" y con sesión real (Admin, Técnico, Médico, Staff y Jugador). Incluyen el enlace viejo `/m/viajes?open=<id>`, el de una tarea y el de una solicitud, y Staff con editor_categoria frente a editor_global en Compras. Al final entrego los archivos modificados, el resultado de cada prueba y capturas de Coordinación para Admin, Técnico, Médico y Staff.

## Nota técnica
El documento usa `?trip=` como ejemplo, pero la pantalla de Viajes hoy usa `?open=`. Se conserva cualquier parámetro tal cual, así que ambos funcionan.

AGENTS.md suma una regla: la visibilidad de Coordinación sale de COORD_AREAS más los niveles de get_my_access, nunca del rol.

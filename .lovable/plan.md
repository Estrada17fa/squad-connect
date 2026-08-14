# Mover Multimedia: módulo propio dentro de la página Coordinación

Hoy la gestión de Multimedia vive como una tercera pestaña (Tareas / Juntas / Multimedia) dentro del módulo Coordinación interna. Debe vivir como módulo hermano, con su propia entrada en la navegación de la página Coordinación, junto a Solicitudes, Compras, Inventario, Viajes y Partidos.

## Qué cambia

- Se quita la pestaña "Multimedia" del módulo Tareas y Juntas.
- Aparece una entrada "Multimedia" en la navegación de la página Coordinación (gestión: subir, editar, eliminar publicaciones), con el mismo panel que ya existe.
- El feed tipo Instagram sigue igual en Mi Club.
- Permisos, base de datos, subida de archivos, notificaciones y lógica: sin cambios. Solo cambia dónde está la entrada de navegación.

## Detalle técnico

1. `src/routes/_authenticated/m.coordinacion_interna.tsx`: eliminar el tab `multimedia`, su `TabsTrigger`/`TabsContent`, el `useTeamAccess("multimedia")` local y el import de `MediaManagerPanel`. El estado de tab vuelve a `"tareas" | "juntas"`.
2. Nueva entrada de navegación `multimedia_gestion` (alias de navegación, no un permiso nuevo):
   - `src/lib/modules.ts`: agregar la clave con label "Multimedia", icono `Images`, scope `team`.
   - `src/lib/rolePages.ts`: mapearla a la página `coordinacion` en `DEFAULT_PAGE_FOR_MODULE` y añadirla a los mapas de rol admin/tecnico/staff/medico junto a los demás módulos de Coordinación; `multimedia` (feed) se queda en `club`.
3. Resolución de permisos: `multimedia_gestion` se resuelve contra el mismo `module_key` `'multimedia'` en `AppLayout` / `useTeamAccess`, y solo es visible si el nivel no es Vista Jugador (misma regla que hoy tenía la pestaña). No se crea fila nueva en `role_permissions` ni migración.
4. Nueva ruta `src/routes/_authenticated/m.multimedia_gestion.tsx` con `PageHeader`, `ModuleTabs` (hermanos de Coordinación) y `MediaManagerPanel`, siguiendo el patrón de los otros módulos de Coordinación, más su propio `head()`.
5. Verificar que la pantalla de permisos (`/m/usuarios`) siga mostrando un solo módulo "Multimedia" y no el alias de navegación.

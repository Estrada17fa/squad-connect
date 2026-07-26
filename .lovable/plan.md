## Objetivo
Que la navbar (inferior en móvil y superior en desktop) solo muestre las páginas que tienen al menos un módulo activo para el usuario. Si desactivas todos los módulos de "Coordinación" o "Admin", esa página desaparece del navbar y las restantes se recorren para ocupar el espacio (el `flex justify-around` ya reparte el ancho automáticamente).

## Diagnóstico
`src/components/squad/AppLayout.tsx` construye `visiblePages` con `resolvePagesForUser(effectiveBaseRole, effectiveModules)` y lo pasa a `BottomNav` y `DesktopNav`. El filtrado real vive en `src/lib/rolePages.ts`:

- **Home**: se agrega siempre (línea 119) — correcto, es el dashboard.
- **Agenda**: solo si el usuario tiene `calendario` — correcto.
- **Club / Coordinación**: solo si `perPage[key].length > 0` — correcto.
- **Admin**: se agrega cuando `role === "admin"` **sin importar si tiene módulos** (línea 124-127). Este es el bug principal: un admin al que le desactivan `usuarios` y `documentos` sigue viendo "Admin" en la navbar.

Además, el caso `coordinacion` para `jugador` (línea 128-136) siempre empuja la página aunque `perPage.coordinacion` esté vacío. Mismo problema si se le desactivan `solicitudes` al jugador.

## Cambios

### `src/lib/rolePages.ts` — `resolvePagesForUser`
- **Admin**: cambiar `if (role === "admin") out.push(...)` por `if (role === "admin" && perPage.admin.length > 0) out.push(...)`.
- **Coordinación (jugador)**: solo empujar la página cuando `perPage.coordinacion.length > 0`; si está vacío, no aparece "Mis Solicitudes".

Nada más. `Club` y `Coordinación` (no-jugador) ya respetan el filtro. `Agenda` ya depende de `calendario`. `Home` se conserva siempre.

### Nada que tocar en AppLayout / BottomNav / DesktopNav
El renderizado ya itera sobre `visiblePages` con `flex justify-around` (móvil) y `flex gap-1` (desktop), así que las páginas restantes se recorren solas.

## Verificación
1. Como admin, desactivar `usuarios` y `documentos` en overrides → "Admin" desaparece del navbar y quedan 4 ítems repartidos.
2. Como jugador, desactivar `solicitudes` → "Mis Solicitudes" desaparece.
3. Desactivar todo `Mi Club` → "Mi Club" desaparece (ya funcionaba, revalidar).
4. Reactivar cualquier módulo → la página reaparece en su posición fija.

## Fuera de alcance
- No se toca el cálculo de permisos (`useAccess`) ni el esquema.
- No se cambia el orden fijo de páginas (Home → Agenda → Club → Coordinación → Admin).
- Home no se oculta aunque esté "vacío" (siempre es el landing).

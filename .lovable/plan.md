## Objetivo
Que cualquier página del navbar (excepto Home) desaparezca cuando no tenga módulos activos para el usuario, y que las restantes se distribuyan uniformemente en el ancho — tanto en móvil como en desktop.

## Diagnóstico

En `src/lib/rolePages.ts` → `resolvePagesForUser`:
- `Agenda` solo aparece si el usuario tiene `calendario` ✅
- `Club` / `Coordinación` (no-jugador) filtran por `perPage[key].length > 0` ✅
- `Admin` y `Coordinación (jugador)` ya se corrigieron en el turno anterior ✅

Es decir, el filtrado ya funciona para todos los roles. Lo que falla es la distribución visual:

En `src/components/squad/AppLayout.tsx`:
- `BottomNav` (móvil) usa `flex justify-around` + `flex-1` → sí reparte espacio uniforme. ✅
- `DesktopNav` usa `flex items-center gap-1` sin `flex-1` en los Links → los ítems quedan pegados a la izquierda en vez de repartirse en el ancho del contenedor. ❌

Ese es el motivo por el que en desktop "no se recorren para llenar el espacio".

## Cambios

### `src/components/squad/AppLayout.tsx` — `DesktopNav`
- Cambiar el contenedor a `flex items-stretch justify-around gap-1` (mantener `max-w-6xl`).
- Agregar `flex-1 justify-center` a cada `<Link>` para que cada página tome una fracción igual del ancho.
- Conservar iconos, label y estado activo actuales.

### `src/lib/rolePages.ts`
Sin cambios — el filtrado por página ya cumple la regla "desaparece si no hay módulos activos, Home siempre queda".

## Verificación
1. Como Técnico, desactivar todos los módulos de `Mi Club` → desaparece "Mi Club"; Home + Agenda + Coordinación se reparten en 3 columnas iguales tanto en móvil como en desktop.
2. Desactivar además Coordinación → quedan Home + Agenda repartidos al 50/50.
3. Como Admin con todo activo → 5 columnas iguales.
4. Como Jugador sin `solicitudes` → sin "Mis Solicitudes"; las demás se distribuyen.

## Fuera de alcance
- No se toca lógica de permisos ni el orden fijo de páginas.
- Home sigue siempre visible (es el landing).

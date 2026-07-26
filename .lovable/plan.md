Quitar el "pill" verde de la navegación activa y dejar solo el ícono + texto en verde neón.

## Cambios en `src/components/squad/AppLayout.tsx`

### BottomNav (móvil)
- Quitar `bg-primary/15` del estado activo. El activo solo tendrá `text-primary` (verde).
- Quitar la barra indicadora superior (el `<span>` con `-top-px h-[2px] bg-primary`) para que no quede ningún elemento tipo pill/indicador.
- Mantener el `drop-shadow` glow en el ícono y el `font-semibold` en el texto activo para reforzar el estado sin fondo.

### DesktopNav
- Quitar `bg-primary/15`, `ring-1 ring-primary/40` y `shadow-[var(--glow-primary)]` del activo.
- Dejar solo `text-primary` (opcionalmente `font-semibold`) para que el ícono y el nombre se vean verdes.
- Mantener el hover sutil (`hover:text-foreground`) para los inactivos.

Resultado: al estar en una página, su ícono y label aparecen en verde neón, sin fondo, sin anillo, sin barra superior — mismo layout que el resto de items.
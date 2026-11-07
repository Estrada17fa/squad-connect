# Dejar claro que las tarjetas de viaje se pueden abrir

## Qué cambia
1. **Mis viajes (lista de viajes):** cada tarjeta lleva al pie un botón **"Ver viaje ›"** que abre el viaje completo. Si la persona ya tiene pase cargado, a su lado aparece el botón **"Mi pase"** (igual que en la pestaña Agenda), que abre directo el pase a pantalla completa.
2. **Agenda (tarjeta de vuelo/viaje):** en vez de cambiar un botón por otro, se muestran los dos: **"Ver viaje ›"** siempre, y **"Mi pase"** cuando ya hay pase.
3. La tarjeta completa se sigue pudiendo tocar para abrir el viaje.

Sin cambios en la base de datos ni en quién ve qué.

## Prueba
Revisión en celular con un viajero con pase y uno sin pase: ambos botones funcionan, "Mi pase" abre el visor y "Ver viaje" abre el viaje.

## Detalles técnicos
- `src/components/agenda/AgendaCards.tsx` (línea ~156): renderizar dos pastillas (`onTrip` con ChevronRight, `onPass` si `hasPass`), con `stopPropagation`.
- Tarjeta de lista en Mis viajes (`/agenda-viajes`, componente de lista en `src/components/viajes/mine/*` / ruta): añadir mismas pastillas reutilizando el visor de pase existente (`PassFullscreen`).

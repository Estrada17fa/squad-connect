# Escudos y detalles de intuición en Coordinación (solo diseño)

Sin cambios en base de datos, permisos ni rutas `/m/<módulo>`. Datos solo de ejemplo.

## 1. Escudos reutilizables
- `src/components/match/TeamCrest.tsx`: círculo sm 24 / md 36 / lg 48 px. Con imagen la muestra; si falta o falla al cargar, muestra iniciales del nombre corto ("RV") sobre fondo neutro. Nunca hueco ni imagen rota.
- `src/components/match/MatchupHeader.tsx`: local · "vs" · visitante, con fecha/hora y sede debajo. Variantes `compact` (listas) y `large` (tarjetas).
- Props pensadas para conectar después (`crest_path`/`short_name` de torneo, `logo_url` del club). Por ahora: logo de LCU que ya usa la app y iniciales para Racing.

## 2. Tarjetas protagonistas
- Técnica: MatchupHeader grande (LCU vs Racing), "Sáb 7:00 pm · Estadio Don Koll", línea de apoyo y botón compacto.
- General: escudo del rival a la izquierda de "vs Racing · Tuxtepec", debajo "En 3 días · Vie 23 oct", apoyo y botón.
- `HeroCard` acepta un encabezado opcional (escudos) sin cambiar las demás tarjetas.

## 3. Médica en violeta
- `--area-medica` y `--area-medica-soft` pasan a violeta en los tokens. El rojo queda solo para urgencia (pastillas y puntos). Revisión en capturas de que nada más se vea rojo en Médica.

## 4. Puntos en pestañas
- El punto de urgencia solo aparece en pestañas de áreas no activas.

## 5. Filas de pendientes
- Chevron gris de 16 px al final de cada fila, después de la pastilla; se mantiene el efecto al tocar.

## 6. "Ver todos"
- Abre `/coordinacion/$area/pendientes`, resuelto dentro de la página de módulo existente (caso especial "pendientes"), con ModulePageShell, título "Pendientes · <Área>" y la lista completa de ejemplo en la misma tarjeta agrupada.
- Datos de ejemplo ampliados en `coordMockData.ts` para que haya más filas que las 3 de la portada.

## Entrega
Capturas a 375 × 667: las 3 áreas, la tarjeta de Técnica con escudos y la página "Pendientes" de un área.

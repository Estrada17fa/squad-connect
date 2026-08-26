# Tres ajustes: agenda 7 días, hora falsa del viaje, torneo en Inicio

## 1. Agenda (lista): solo próximos 7 días

En `src/routes/_authenticated/m.agenda.tsx` la lista filtra desde hoy sin límite superior. Se añade el tope: desde el inicio de hoy hasta el final del día +7. La vista de Mes (`m.mes.tsx`) no se toca.

El estado vacío ya existe; se ajusta el texto para decir que no hay eventos en los próximos 7 días (y se conserva el mensaje distinto cuando hay filtros activos).

## 2. Viaje: quitar la hora del encabezado del rango

El viaje solo captura fechas, pero el encabezado usa `formatDateTime(departure_at)`, que imprime "12:00 p.m." Se cambia únicamente el rango salida → regreso a un formato de solo fecha en los tres lugares donde se muestra ese encabezado:

- `src/routes/_authenticated/agenda-viajes.tsx` (tarjeta de la lista y cabecera de la hoja de detalle)
- `src/routes/_authenticated/m.viajes.tsx` (tarjeta de la lista)

Vuelos, transportes, comidas y citación mantienen sus horas reales; ningún otro tipo de evento cambia.

## 3. Inicio: el bloque de Torneo no aparece para Admin

### Causa (verificada en datos)

El club tiene **dos torneos en curso**: "Copa Telmex" (equipo Sub-?; **cero** equipos marcados como "nuestro equipo") y "Primera Premier" (sí tiene su equipo nuestro). `useClubNextMatch.ts` toma `list[0]` de los torneos en curso que la persona puede leer.

- El jugador solo puede leer el torneo de su categoría → cae en "Primera Premier", que sí tiene equipo nuestro → se calcula la posición y el bloque se muestra.
- El admin es global y puede leer **los dos** → le toca "Copa Telmex", que no tiene ningún `is_our_team`, así que `ourTeam` es null, `standing` es null y el bloque no se renderiza.

No es que al admin le falte equipo propio: es que el hook elige el primer torneo en curso sin comprobar si ese torneo tiene un equipo nuestro.

### Corrección

En `src/hooks/useClubNextMatch.ts`, elegir el torneo con criterio en vez de `list[0]`:

1. Consultar en una sola llamada los `tournament_teams` con `is_our_team = true` de todos los torneos en curso legibles.
2. Preferir el torneo cuyo `team_id` sea uno de los equipos propios de la persona (si tiene).
3. Si no, el primer torneo en curso que **sí** tenga equipo nuestro.
4. Solo como último recurso, el primero de la lista.

Con esto el admin ve el mismo bloque que el jugador (posición y próximo partido del equipo nuestro), y cualquier rol con acceso a Torneo lo ve. No cambian permisos ni RLS: la consulta nueva lee la misma tabla ya filtrada.

## Detalles técnicos

- Ventana de agenda calculada con `startOfDay` (ya importado) y un `endOfWindow` de +7 días.
- Formateo de solo fecha reutilizando el helper de fecha existente en `src/lib/calendar-utils.ts` (sin crear formato nuevo si ya hay uno equivalente).
- La selección de torneo se resuelve en un `useQuery` ligero dentro de `useClubNextMatch.ts`, con `enabled` atado al acceso al módulo 'torneo'.

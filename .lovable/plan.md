# Inicio: resumen general del club

Confirmado: Inicio queda como **contenido general del club (próximo partido, torneo, comunicados) + mis eventos ya filtrados por permiso**. Nada personal-sensible ni por rol: fuera solicitudes por aprobar, tareas, salud, desarrollo, accesos rápidos y estadísticas. Los bloques 2, 4 y 5 son condicionales y no se renderizan si no hay contenido (no se muestran vacíos); solo el saludo y "Mis próximos eventos" (con estado vacío amable) están siempre.

## Bloques (en orden)

1. **Saludo** — "Hola, [nombre]" + una línea corta. Siempre.
2. **Próximo partido del club** — tarjeta grande destacada: escudos de ambos equipos (contain, sin recortar), rival, fecha y hora, sede, local/visitante y jornada. Toca y lleva a Torneo. Se oculta si no hay partido futuro.
3. **Mis próximos eventos** — lista corta con el mismo `EventCard` de la Agenda y su barra de color. Estado vacío: "No tienes eventos próximos". Enlace "Ver agenda" cuando la persona tiene ese módulo.
4. **Torneo (compacto)** — una fila con nuestra posición y puntos ("3° · 15 pts" de nuestro grupo), no la tabla completa. Toca y lleva a Torneo. Se oculta si no hay torneo activo o si no tiene acceso al módulo.
5. **Comunicados recientes** — los 3 últimos dirigidos a la persona, no leídos destacados con punto y prioridad. Toca y abre Comunicados. Se oculta si no hay acceso o no hay comunicados.

## Detalles técnicos

- `src/routes/_authenticated/index.tsx` se reescribe como composición de bloques; se elimina el uso de `TodoBlock` (pendientes por atender) y el hero actual `NextEventHero` se sustituye por el partido del club.
- Componentes nuevos en `src/components/home/`: `GreetingBlock.tsx`, `NextMatchHero.tsx`, `TournamentStandingBlock.tsx`. Se conservan `HomeSection.tsx`, `UpcomingList.tsx` (se le añade estado vacío) y `AnnouncementsBlock.tsx`.
- Nuevo hook ligero `src/hooks/useClubNextMatch.ts` que compone lo ya existente: `useTournaments` (torneo `activo` del club), `useTournamentTeams`, `useTournamentMatches`, `useTournamentAdjustments` y `buildStandings` de `src/lib/torneo.ts` para la posición del grupo de nuestro equipo. Sin consultas nuevas fuera de esos hooks, sin RLS ni permisos nuevos: si la persona no ve torneo, no hay filas y el bloque desaparece.
- Escudos con `useCrestUrl` y `object-contain`; iconos de lucide, sin emojis.
- Se mantiene `EventDetailSheet` en solo lectura para abrir un evento propio desde la lista.
- Se actualiza el `head()` de la ruta (título y descripción acordes al nuevo resumen).

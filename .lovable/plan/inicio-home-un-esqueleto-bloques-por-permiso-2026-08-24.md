# Inicio (Home): un esqueleto, bloques por permiso

Rehacer `/` (la pantalla de inicio dentro de la app) como un resumen de solo lectura: mismo esqueleto para todos, cada bloque relleno con lo que la persona puede ver. Nada de lógica de permisos nueva: cada bloque lee de los hooks que ya filtran bien.

## Bloques

1. **Saludo + próximo evento**
   "Hola, [nombre]" con el nombre de la persona (no el del club, como hoy) y el evento más cercano en grande: icono y color del tipo, hora, día relativo (HOY / MAÑANA / fecha), lugar y contexto. Toca y abre la ficha del evento. Sin eventos: estado vacío amable ("No tienes eventos próximos").

2. **Próximos eventos**
   Los siguientes 3 eventos (después del destacado) con el mismo `EventCard` de la Agenda, barra de color por tipo. Toca y abre la ficha. Al final, enlace "Ver agenda". Se oculta si la persona no tiene acceso a Agenda/Mes o no hay más eventos.

3. **Por atender** (condicional: si no hay nada, el bloque no se renderiza)
   Renglones compactos, cada uno con icono, conteo y destino:
   - Solicitudes por aprobar — solo si la persona es aprobadora de algún tipo.
   - Tareas asignadas pendientes — solo si tiene tareas propias sin completar.
   - Comunicados sin leer — solo si tiene alguno.

4. **Comunicados recientes**
   Los 3 últimos comunicados dirigidos a la persona, los no leídos destacados (punto y prioridad). Toca y abre el comunicado en su módulo. Solo si tiene acceso a Comunicados.

## De dónde sale cada dato (sin permisos nuevos)

| Bloque | Fuente ya existente | Por qué respeta permisos |
| --- | --- | --- |
| Próximo evento y próximos eventos | `useUpcomingEvents(clubId)` | La RLS de `calendar_events` ya limita cada fila al permiso del módulo de origen (citas médicas solo del paciente y de Salud, entrenamientos por categoría, viajes por convocatoria) |
| Solicitudes por aprobar | `useRequests` + `useMyApproverTypes` (los mismos que usa Solicitudes) | Ya combina ser editor del módulo y estar designado aprobador; excluye lo propio |
| Tareas pendientes | `useTasks` filtrando las asignadas a la persona y no completadas | RLS de `tasks` / `task_assignees` |
| Comunicados sin leer y recientes | `useAnnouncements(clubId, userId)` (ya trae `read`) | RLS de `announcements` por club/categoría |

Todo lo que ya no pasa el filtro simplemente no llega, así que un jugador nunca ve "solicitudes por aprobar" ni gastos.

## Detalles técnicos

- Se reescribe `src/routes/_authenticated/index.tsx`. Las tarjetas actuales de módulos (Calendario, Plantel, Coordinación, Inventario, Compras, Viajes y el grid de "otros") se retiran de Inicio: la navegación por módulos ya vive en la barra inferior y en los hubs.
- Cada bloque es un componente propio en `src/components/home/` (`NextEventHero`, `UpcomingList`, `TodoBlock`, `AnnouncementsBlock`), y `index.tsx` solo los ordena. Así agregar después "viaje próximo", "accesos rápidos" o "lesionados" es añadir un componente a la lista, sin rehacer la página.
- Cada bloque decide solo si se muestra (`accessibleModules` + si tiene datos); si no, devuelve `null`.
- Estándar visual ya establecido: `PageHeader`, `glass`, `AccentBar` / `EventCard`, iconos lucide, sin emojis, encabezados de sección en mayúsculas.
- Detalle del evento con el `EventDetailSheet` que ya usa la Agenda, para que tocar desde Inicio se sienta igual.
- Sin escrituras: Inicio es solo lectura (marcar leído sigue ocurriendo dentro de Comunicados).

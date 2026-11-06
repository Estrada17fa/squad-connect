<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->
- Team memberships are created/edited/removed one row at a time (by id) via server functions in members.functions.ts; profile edits never touch team_memberships — avoids wiping categories on profile save.
- Effective permissions come only from the get_my_access SQL function (wraps effective_permission); the client never recomputes levels from memberships/overrides — keeps UI and RLS in sync.
- Everything is per category: every team_membership has a team_id; "Todas las categorías" is only a per-person switch (member_all_categories) that creates one membership per category, plus a teams trigger for new categories — never a level, scope or permission rule.
- Records without a category ("Todo el club") belong to all categories: viewing needs Ver in at least one of the person's categories, editing needs Editar in ALL club categories (level_all_teams / canEditAllTeams); multi-category records need Editar in all their categories.
- UI permission levels are Sin acceso / Ver / Editar (sin_acceso / lector_categoria / editor_categoria); vista_jugador is a temporary legacy value only for the Jugador role and global levels exist only for super admins.
- New Coordinación UI lives under /coordinacion/$area/$module using src/components/coord/* and src/lib/coordAreas.ts; mock values only in src/lib/coordMockData.ts — keeps design swappable for real data later while /m/<module> stays untouched.
- New Administración UI lives under /administracion (+ /administracion/$module) with mock values only in src/lib/admin/mockData.ts; /admin and /m/usuarios stay as the current screens until each module is rebuilt — keeps legacy screens reachable during the redesign.
- New Usuarios UI lives under /administracion/usuarios (+ nuevo, $userId, $userId/editar, $userId/permisos, roles/$roleId) and reuses members.functions.ts plus the existing usuarios/* permission components unchanged — keeps /m/usuarios and the new screen on the same rules.
- Administración › Torneos (/administracion/torneos, src/components/admin/torneos/*) only sets up a tournament (data, format, points, tiebreakers, teams, point adjustments, status); calendar, results, goals, playoffs, standings and stats belong to Coordinación › Técnica › Torneo — keeps setup and match-day work apart. "Próximo" is derived (en_curso with no played matches), never stored.
- New Club UI lives at /administracion/club (src/components/admin/club/*), reusing club/teams/locations hooks; /admin/configuracion stays as the current screen. The Sede is stored in clubs.home_location_id.
- Coordinación › General › Tareas lives at /coordinacion/general/tareas (+ /$taskId) with UI in src/components/coord/tareas/*, rules in src/lib/tareas.ts and comments/evidence in src/hooks/useTaskExtras.ts; evidence photos live in the private task-evidence bucket under <task_id>/ and are removed through the storage API before their row/task is deleted — avoids orphan files since storage has no cascade.
- Juntas (Coordinación › General) live in the Juntas tab of /coordinacion/general/tareas (?tab=juntas) plus /coordinacion/general/juntas/{nueva,$meetingId,$meetingId/editar}, UI in src/components/coord/juntas/*, rules in src/lib/juntas.ts; agenda is stored as readable "☐/☑ point" lines in meetings.agenda so Agenda still shows it; agreements are tasks with tasks.meeting_id. Places use src/components/location/{LocationPicker,LocationCard}.tsx — one reusable place UI.
- Viajes management UI lives under /coordinacion/general/viajes (+ nuevo, $tripId?tab=, $tripId/editar) in src/components/coord/viajes/*, rules in src/lib/viajes.ts; /m/viajes and trip notices resolve by canManageTripsModule (managers → Coordinación ficha, others → /agenda-viajes?open=) — one rule for every trip link.

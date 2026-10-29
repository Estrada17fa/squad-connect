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

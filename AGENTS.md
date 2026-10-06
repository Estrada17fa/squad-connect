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

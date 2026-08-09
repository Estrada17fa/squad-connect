# Puesto también para el rol Admin (y cualquier rol global)

Hoy el campo "Puesto" solo aparece cuando marcas categorías. Como Admin es global (sin categorías), no hay dónde escribir su puesto y su ficha queda sin él. El puesto ya se guarda en la membresía (`job_title`), así que basta con capturarlo también en la membresía de "Todo el club".

## Qué cambia

- En el formulario de miembro, cuando el rol es Admin (alcance global), la sección "Categorías y puesto" deja de ser solo un texto informativo y muestra un campo **Puesto (opcional)** — ej. "Director deportivo", "Presidente", "Gerente".
- Al guardar, ese puesto se escribe en la membresía global del usuario (la de "Todo el club").
- Al editar, el campo se rellena con el puesto guardado.

## Dónde se ve

Sin trabajo extra, porque esas vistas ya leen `job_title`:

- Tarjeta de la lista de usuarios: "Todo el club · Director deportivo".
- Ficha del miembro: el puesto bajo "Todo el club" en Membresías.
- Filtro por Puesto en Usuarios: los puestos de admin aparecen en la lista.

Y queda disponible para mostrarlo en cualquier otro módulo más adelante, igual que el de los demás roles.

## Detalles técnicos

- `src/components/usuarios/MemberForm.tsx`: nuevo estado `clubJobTitle`; se precarga desde la membresía con `team_id = null`; se limpia en `reset()`. Se envía en el payload.
- `src/lib/members.schemas.ts`: campo opcional `club_job_title` en el esquema de crear/actualizar miembro.
- `src/lib/members.helpers.ts`: `syncMemberships` acepta ese valor y lo usa en la fila global (`team_id: null`) en lugar de `null` fijo.
- `src/lib/members.functions.ts`: pasa el nuevo campo a `syncMemberships`.
- Sin migraciones ni cambios de permisos: la columna `job_title` ya existe en `team_memberships`.

## Cómo verificamos

- Crear/editar un Admin con puesto, reabrir el formulario y confirmar que se conserva.
- Ver la tarjeta y la ficha del admin con el puesto visible, y que aparece en el filtro por puesto.

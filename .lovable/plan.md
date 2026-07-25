# Plan: Crear miembros desde el panel de Admin

## Objetivo

Permitir que un Admin de club cree un miembro (email + contraseña + datos personales) y le asigne una o más membresías en un solo formulario, sin tocar la lógica existente de permisos, RLS ni módulos.

## 1. Base de datos (migración corta)

Añadir a `profiles` los campos opcionales que faltan (no rompe nada porque son nullables):

- `birthdate date`
- `nationality text`
- `phone text` *(útil para contacto; si no lo quieres lo quito)*
- `shirt_size text`, `pants_size text`, `shoe_size text`
- `jersey_number int`, `position text`

`profiles` ya se lee filtrado por `club_id` y los admins del club ya pueden hacer UPDATE — no se requieren nuevas policies. `player_profiles` queda como está (para métricas físicas: altura, peso, disponibilidad, lesiones). No se duplica info: dorsal/posición si los edita el admin de plantel se seguirán editando ahí (o los movemos aquí — ver pregunta abierta abajo).

## 2. Server function `createClubMember` (única pieza sensible)

Nueva `src/lib/members.functions.ts` con `createServerFn` + `requireSupabaseAuth`:

1. Autoriza al llamador: debe ser super_admin **o** tener `editor`/`approver` en el módulo `usuarios` **de este club** (verificado con `context.supabase`, no con admin client).
2. Recién entonces hace `await import("@/integrations/supabase/client.server")` para usar `supabaseAdmin`.
3. `supabaseAdmin.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { full_name } })`.
4. El trigger `handle_new_user` ya crea la fila en `profiles` — luego hace UPDATE para llenar `club_id` (forzado al club del admin, nunca el que venga del cliente) + campos del formulario.
5. Inserta las membresías recibidas (`{ team_id | null, role_id }[]`) validando: cada `role_id` pertenece al club; `team_id`, si viene, también; si `team_id` es NULL el rol debe tener `allows_club_wide = true`.
6. Devuelve `{ userId }`. Errores tipados: email duplicado, sin permisos, rol/team inválido.

Validación con Zod (email, password mínima 8, longitudes máximas, nacionalidad ISO opcional, etc.).

## 3. UI — nuevo diálogo "Crear miembro"

En `MembersTab` (arriba, junto a "Añadir miembro existente" actual):

- Botón **"Crear miembro"** que abre `CreateMemberDialog`.
- Formulario en 3 secciones colapsables/scrolleables (móvil-first, mismo patrón responsive que ya establecimos):
  1. **Cuenta**: email, contraseña (con toggle mostrar/ocultar y medidor simple de fuerza), nombre completo.
  2. **Datos personales** (todos opcionales salvo lo que marques): cumpleaños, nacionalidad, tallas (playera/inferior/calzado), dorsal, posición.
  3. **Membresías** (mínimo 1): lista repetible con `+ Añadir otra`. Cada fila: `Select rol` → `Select equipo` (filtra "Todo el club" según `allows_club_wide` del rol elegido, misma regla que ya implementamos en `AddMembershipDialog`).
- Botón "Crear" llama al server function, muestra toast, cierra diálogo, invalida `club-members` y abre el detalle del nuevo miembro para que el admin pueda personalizar permisos si quiere.

Después de creado, el admin sigue usando el flujo actual (añadir/quitar membresías, `OverridesDialog`) — no se cambia nada de eso.

## 4. Seguridad — checklist

- Contraseña nunca viaja a un endpoint público: server function con auth middleware.
- `club_id` se toma del perfil del admin en el servidor; se ignora cualquier `club_id` que mande el cliente → un admin nunca puede crear un usuario en otro club.
- `supabaseAdmin` solo se importa **después** de confirmar autorización.
- Zod valida todo el payload; email se normaliza a lowercase.
- Toast genérico ("No se pudo crear el miembro") + log server-side con detalle; no se filtran mensajes crudos de Supabase Auth al cliente.
- Se pide activar HIBP en Supabase Auth para bloquear contraseñas filtradas (una sola llamada a `configure_auth`, sin tocar signup público).

## 5. Fuera de alcance (no se toca)

- Módulos existentes (Calendario, Plantel, Coordinación).
- `useAccess`, `AppLayout`, `getModuleAccess`, overrides.
- Flujo de invitación por email (`club_invitations`) — sigue disponible en paralelo si lo necesitas después.
- Policies RLS existentes.

## Pregunta abierta

Dorsal y posición: ¿los guardo en `profiles` (como pediste, disponibles para todo miembro) **o** los mantengo solo en `player_profiles` cuando el miembro tiene rol Jugador? Voy con `profiles` porque así lo pediste, pero avísame si prefieres separarlos.

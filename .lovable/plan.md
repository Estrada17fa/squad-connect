# Plan: móvil + categorías + membresías

## 1. Responsive móvil (prioridad alta)

**Problema concreto en Miembros:** cada fila de membresía usa `flex flex-wrap` con un `Select` de 160px, botón "Personalizar" con texto, e ícono de basura. En 393px se apila feo y el título se corta.

**Arreglos puntuales:**
- `MembersTab`: reestructurar la fila de membresía en móvil como una tarjeta de 2 niveles (equipo + rol arriba, controles abajo alineados a la derecha); en `sm:` volver a la fila horizontal. Usar el patrón `grid-cols-[minmax(0,1fr)_auto] + min-w-0 + truncate` de las reglas del proyecto. En móvil, "Personalizar" pasa a icon-only con tooltip; el `Select` toma ancho completo del renglón inferior.
- Header de detalle del miembro: mismo patrón (nombre trunca, botón "Añadir membresía" se convierte en icon-only `+` en móvil).
- Pasada rápida por otros headers con el mismo patrón para verificar: `PageHeader`, `RolesTab` (lista de roles + acciones), `PermissionsMatrix` (fila de módulo con `Select` de 140px), tabs de Coordinación, roster de Plantel, header del Calendario. Aplicar el mismo grid + truncate donde detecte apilamiento.
- Regla nueva para toda la app: encabezados con texto + widget usan `grid-cols-[minmax(0,1fr)_auto] sm:flex`, textos largos con `truncate` (una sola línea) y solo hacen wrap cuando pasan de ~40 caracteres.

No introduzco tokens ni componentes nuevos — solo reordeno layout con utilidades Tailwind existentes.

## 2. Categorías (teams) gestionadas por el Admin del club

Hoy la tabla `teams` existe pero no hay UI para que un admin de club cree/edite/elimine categorías. Los super-admins lo hacen en `/admin/clubs`, pero un admin de un club normal no tiene acceso.

**Cambios:**
- Nueva pestaña **"Categorías"** dentro de `/m/usuarios` (junto a "Roles y permisos" y "Miembros"), visible cuando el usuario tiene `editor`/`approver` en el módulo `usuarios` o es super-admin del club.
- Lista de categorías del club con `StandardCard` (nombre + categoría/rama). Acciones: crear, renombrar, eliminar (con confirmación si tiene miembros o jugadores asignados — se avisa y se bloquea).
- Formulario simple: nombre (ej. "Primer equipo", "Sub-15 Varonil"), categoría/rama opcional (ej. "Varonil", "Femenil", "Fuerzas básicas").
- RLS: políticas de `teams` ya permiten a admins del club; verifico que INSERT/UPDATE/DELETE estén cubiertos y añado los que falten en una migración corta.
- Al crear/eliminar una categoría, `useAccess` ya escucha `team_memberships`; añado invalidación de `club-teams-min` para que aparezcan de inmediato en el selector de "Añadir membresía".

## 3. Aclarar cómo funcionan las membresías

Hoy hay una sola opción "Todo el club" que se usa tanto para "admin que ve todo" como (por confusión) para gente que en realidad pertenece a una sola categoría. Propongo el siguiente modelo — **necesito tu confirmación antes de implementarlo**:

**Regla:**
- Una membresía = **un equipo/categoría + un rol específico**. Un usuario puede tener N membresías.
- "Todo el club" (team_id NULL) se reserva para roles con alcance real de club (Admin, super staff médico del club, dirección deportiva). Para restringirlo, marco los roles con un flag `is_club_wide_allowed` (o reutilizo `is_system_default` + una lista pequeña) — solo esos roles pueden asignarse a "Todo el club" en el diálogo de añadir membresía.
- Un jugador de Sub-15 → membresía { team: Sub-15, role: Jugador }. Nunca "Todo el club".
- Un DT que también es Auxiliar en Sub-15 → dos membresías: { Primer equipo, DT } y { Sub-15, Auxiliar }. El selector del header cambia el contexto y `getModuleAccess` ya usa los permisos del equipo activo. Esto ya funciona; solo falta impedir el mal uso de "Todo el club".

**UI:**
- Diálogo "Añadir membresía": el select de equipo muestra "Todo el club" **solo** si el rol elegido lo permite; si no, obliga a elegir una categoría concreta.
- En la lista de membresías del miembro, "Todo el club" se etiqueta con un `StatusBadge` "Alcance club" para que se lea claro.
- Texto de ayuda visible en la pestaña Miembros que explique la regla en dos líneas.

**Pregunta abierta:** ¿prefieres (a) que yo decida qué roles pueden ser "club-wide" (Admin y cualquier rol marcado como sistema), o (b) que el admin del club marque manualmente por rol si acepta alcance club? Voy con (a) por defecto si no dices lo contrario.

## Orden de implementación
1. Migración: (si hace falta) flag/política para `teams` + regla club-wide en roles.
2. UI Categorías (pestaña nueva).
3. Refactor responsive de `MembersTab` + pasada rápida por otros headers.
4. Diálogo de membresía con la nueva regla + etiqueta "Alcance club".

## Fuera de alcance
- No toco módulos de contenido (Plantel, Calendario, Coordinación) más allá de arreglos de layout puntuales si detecto apilamiento.
- No cambio el modelo de permisos ni los overrides.

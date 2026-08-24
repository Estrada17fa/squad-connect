# Tres correcciones de recta final

## 1. Cargo/título por equipo

Confirmado: el cargo es **texto descriptivo** y **no afecta permisos**. Los permisos seguirán viniendo del rol del usuario y de sus overrides; el cargo solo se muestra.

Estado actual verificado: la membresía de equipo (`team_memberships.job_title`) **ya guarda un cargo por equipo** y el formulario de Usuarios ya permite escribir uno distinto por cada equipo asignado. El problema es de **visualización**: la lista de Plantel colapsa a una sola fila por persona, así que de alguien con dos equipos solo se ve un cargo, y el perfil propio no siempre lo muestra con claridad.

Qué se hará:

- Plantel: una persona de staff con membresía en varios equipos aparecerá en la sección de cuerpo técnico de **cada** equipo, con el cargo que tiene en ESE equipo (Auxiliar Técnico en Primer Equipo, Director Técnico en Piloto). Con equipo activo seleccionado se muestra el cargo de ese equipo.
- Ficha de la persona (Plantel y Usuarios): bloque "Equipos y cargos" listando cada equipo con su cargo.
- Mi Perfil: misma lista de equipos con cargo por equipo.
- Si una membresía no tiene cargo: se muestra un genérico según el rol ("Cuerpo técnico", "Médico", "Staff"), nunca vacío feo.
- Etiqueta clara en el formulario: "Cargo en este equipo (descriptivo, no cambia permisos)".

## 2. "Mis Solicitudes" del jugador

Causa encontrada: en el mapa de páginas del rol jugador, la página Coordinación incluye `partidos` **y** `solicitudes`. El atajo al avatar solo se activa cuando lo ÚNICO accesible es Solicitudes; como el jugador también tiene Partidos, aparece la página suelta, etiquetada "Mis Solicitudes" pero conteniendo Partidos.

Qué se hará:

- Para el rol jugador, Solicitudes deja de ocupar lugar en la navegación **siempre**: su único acceso es el menú del avatar → "Mis Solicitudes".
- Partidos deja de colgar de esa página para el jugador (se queda en Mi Club, donde ya vive su consulta de partidos/torneo).
- La vista de Solicitudes del jugador muestra únicamente sus solicitudes (crear y ver las suyas), sin chips ni pestañas de otros módulos.
- Se revisa que la navegación se recorra sin huecos ni pestañas fantasma.

## 3. Nacionalidad y lugar de nacimiento

Recomendación: **para todos los usuarios**, no solo jugadores. Son datos de persona (útiles para viajes, documentos y pases de abordar), y la base ya tiene esas columnas tanto en el perfil como en la ficha deportiva; hoy el formulario solo llena la ficha deportiva del jugador, por eso el perfil de un no-jugador las muestra vacías y sin forma de editarlas.

Qué se hará:

- Nacionalidad y lugar de nacimiento pasan a la sección de **datos personales** del formulario de crear/editar usuario (Admin → Usuarios), visibles para cualquier rol.
- Se guardan en el perfil de la persona. Para jugadores se mantiene sincronizada la ficha deportiva para no romper Plantel.
- Mi Perfil: el propio usuario puede editar esos dos campos (junto con teléfono y contacto de emergencia); Admin también puede desde Usuarios.
- Las fichas leen el perfil como fuente principal, con la ficha deportiva como respaldo.

## Detalles técnicos

- `src/hooks/useRoster.ts`: dejar de deduplicar staff por usuario; devolver una entrada por membresía de equipo (jugadores siguen igual) y exponer `memberships[]` con `{teamId, teamName, jobTitle}`.
- `src/components/plantel/PersonCards.tsx` y `PersonDetailSheet.tsx`: mostrar cargo por equipo y bloque de equipos.
- `src/routes/_authenticated/mi-perfil.tsx` y `src/components/usuarios/MemberDetailSheet.tsx`: lista equipos + cargo, con genérico por rol.
- `src/lib/rolePages.ts`: quitar `solicitudes` (y `partidos`) del mapa `coordinacion` del rol jugador; `needsSolicitudesShortcut` seguirá activando el atajo del avatar.
- `src/components/usuarios/MemberForm.tsx`: mover `nationality`/`birthplace` a datos personales; `src/lib/members.schemas.ts` + `members.functions.ts`/`members.helpers.ts`: aceptarlos en el esquema base y escribir en `profiles` (y espejo en `player_profiles` para jugadores).
- Sin cambios en RLS ni en el cálculo de permisos.

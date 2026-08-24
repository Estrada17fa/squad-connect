# Recta final: escudo en cabecera, autor con foto y quitar el "+"

Solo presentación. No se tocan permisos, RLS ni consultas de datos nuevas.

## 1. Escudo del club en la cabecera

La cabecera hoy tiene: logo de Squad a la izquierda, y a la derecha el nombre del club (solo desktop), campana y avatar.

- El escudo del club se muestra **centrado** en la barra superior, entre el logo de Squad y la zona de campana/avatar.
- Se usa el escudo ya guardado en la identidad del club (Configuración del club). El logo vive en un bucket privado, así que se muestra con la URL firmada que ya existe para eso.
- Sin escudo: se muestra un círculo neutro con las iniciales del club; si tampoco hay nombre, no se muestra nada.
- En móvil solo el escudo (círculo de ~32px). En desktop, escudo + nombre del club al lado, con truncado.
- El nombre del club deja de estar duplicado a la derecha (pasa al centro junto al escudo).
- Estructura de tres zonas de ancho equilibrado para que el centro quede realmente centrado y nunca se encime con los controles.

## 2. Comunicados: foto del autor

- En la **tarjeta de la lista** y en la **ficha de detalle**, el nombre del autor se acompaña de su avatar (foto de perfil) en pequeño; si no tiene foto, iniciales.
- Los datos del autor (nombre y avatar) ya vienen en la consulta de comunicados, así que no hay cambios de datos.
- Se conserva el mismo estilo de "chip" que ya se usa, sustituyendo el icono de persona por el avatar cuando existe.

## 3. Quitar el "+" flotante

- Se elimina el FAB global de la cabecera/layout y se borra su componente.
- Se revisa que cada módulo mantenga su botón propio de crear (Comunicados, Solicitudes, Viajes, Entrenamientos, etc.). No se toca ninguno.
- Se recupera el espacio inferior que el FAB ocupaba (la barra inferior de navegación no cambia).

## Detalles técnicos

- `src/components/squad/AppLayout.tsx`: el `Header` recibe también `clubId` y `logoPath` desde los datos ya cargados del club; se reestructura el grid del header en tres zonas; se elimina `<FAB />`.
- Nuevo `src/components/squad/ClubCrest.tsx`: usa `useClub` / `useClubLogoUrl` de `src/hooks/useClubSettings.ts` para resolver la URL firmada y renderiza avatar + fallback de iniciales.
- `src/components/comunicados/ComunicadosPieces.tsx`: el chip de autor acepta un `avatarUrl` opcional y renderiza `Avatar`/`AvatarFallback`.
- `src/routes/_authenticated/m.comunicados.tsx` y `src/components/comunicados/AnnouncementDetailSheet.tsx`: pasan `a.author.avatar_url` al chip.
- Se borra `src/components/squad/FAB.tsx`.

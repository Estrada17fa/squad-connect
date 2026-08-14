# Multimedia: el partido del post, solo lectura con escudo

En el feed de Mi Club, la línea "vs Rival · Jornada N" es hoy un enlace que abre Partidos. Pasa a ser información de solo lectura, con el escudo del rival.

## Qué cambia

- La línea del partido deja de ser un enlace: sin clic, sin hover, sin navegación.
- Se muestra el escudo del equipo rival a la izquierda del texto (mismo componente de escudo que usa Torneo, respetando transparencia y sin recorte; si no hay escudo, el icono genérico de escudo).
- Texto igual que ahora: "vs Rival · Jornada N" (o "Amistoso" cuando no hay jornada).
- Mismo estilo de chip suave, sin apariencia de botón.

## Detalles técnicos

- `src/hooks/useMultimedia.ts`: añadir `crest_path` a los equipos local/visitante en la consulta y exponer `rivalCrest` en `MediaMatchInfo`.
- `src/components/multimedia/MediaFeedCard.tsx`: sustituir el `<Link to="/m/partidos">` por un `<span>` no interactivo con `TeamCrest` (`@/components/torneo/TeamCrest`) en lugar del icono `Swords`.
- Sin cambios de base de datos ni de permisos.

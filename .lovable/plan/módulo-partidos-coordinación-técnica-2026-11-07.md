# Módulo Partidos (Coordinación › Técnica)

Partidos = nuestros partidos uno por uno. Comparte `tournament_matches` con Torneo: el resultado de aquí actualiza la tabla y el goleo. Reutiliza CallupPicker, CallupList, MatchOpsCard/Sheet, PlayerRow/PlayerAvatar/PositionTag/AvailabilityDot, TeamCrest y LocationPicker/LocationCard.

## Regla de visibilidad
- Todo nace en borrador: solo lo ve quien tiene Ver o Editar en Partidos.
- Convocatoria publicada: el convocado ve que está convocado, su citación, su viaje y la lista completa de convocados; el no convocado solo ve "No convocado".
- Alineación publicada: los convocados ven la cancha completa y los suplentes.
- La Agenda, la hoja del partido e Inicio preguntan el estado a una sola función de la base.

## Cambios en la base (aditivos)
1. Logística del partido: fecha de publicación de convocatoria, fecha de publicación de alineación y formación.
2. Tabla nueva de alineación (titular/suplente, puesto, orden), una fila por persona por partido, solo convocados (lo valida la base).
3. Reglas de acceso:
   - Convocatoria: Ver/Editar en Partidos siempre. Con la convocatoria publicada, los convocados ven la lista completa (nombres y posiciones); los no convocados no.
   - Logística (citación): Ver/Editar siempre; cada convocado solo si está publicada.
   - Alineación: Ver/Editar siempre; convocados solo si está publicada.
   - Escribir: solo Editar en Partidos.
   - Se reemplazan solo la función de estado anterior y la regla de lectura de convocados. Se conserva la regla que deja a los jugadores ver todos los partidos de su categoría en la Agenda.
4. Convocatorias existentes: todo partido que ya tenga convocados (pasado o futuro) queda publicado con la fecha de su convocatoria más antigua (o la fecha actual si no hay), para que los jugadores sigan viendo lo mismo, incluido su historial. Los partidos sin convocados quedan sin publicar. Reporto cuántos quedaron publicados.
5. Función `get_my_match_status(partido)`: pendiente / convocado (citación, uniforme, lugar, conteo de convocados y, si hay alineación publicada, rol y puesto) / no convocado.
6. Avisos: nada mientras sea borrador. Al publicar: "Fuiste convocado vs <rival> · Citación <hora>" a cada convocado (uno por persona). Ya publicada: aviso a quien entra, "Ya no estás convocado…" a quien sale, "Cambió tu citación…" si cambian hora o lugar. Al publicar alineación: "Ya está la alineación vs <rival>".

## Pantallas
- `/coordinacion/tecnica/partidos`: "‹ Técnica", filtro (torneo, local/visita), pestañas Próximos · Jugados, tarjetas estilo Agenda con estado de Convocatoria y Alineación; en Jugados, marcador grande.
- `/coordinacion/tecnica/partidos/$matchId?seccion=`: encabezado con marcador y pestañas:
  - **Convocatoria**: Convocados (conteo por posición) y Plantel; tocar agrega/quita; confirmación para lesionados/suspendidos; búsqueda, filtro por posición, copiar del partido anterior; barra fija "Publicar convocatoria" / "Publicada · Guardar cambios" con "Se avisará a N personas"; etiqueta de estado.
  - **Alineación** (desde 11 convocados): 4-4-2, 4-3-3, 4-2-3-1, 3-5-2, 5-3-2; cancha vertical, tocar puesto para asignar/cambiar/quitar; intercambio tocando dos puestos (arrastrar solo si sale sencillo); suplentes automáticos; copiar del anterior; botón fijo de publicar.
  - **Citación**: hora, lugar, uniforme Local · Visita · Alterno con nota, notas; si es visita, tarjeta del viaje ligado o "Crear viaje para este partido".
  - **Resultado**: marcador − / +, goleadores con cantidad + "Autogol del rival", notas, "Guardar resultado" (jugado, tabla y goleo).
- `/m/partidos` y avisos: staff → ficha nueva; jugadores → su vista actual / hoja de la Agenda.

## Vista del jugador (Agenda, hoja, Inicio)
"Convocatoria pendiente" (gris) · "Convocado" (verde) con citación, "Ver convocados (N)" y, si hay alineación, "Titular · DEF"/"Suplente" + "Ver alineación" · "No convocado" (gris) sin citación, lista ni viaje.

## Pruebas (solo datos temporales, sin avisar a nadie real, todo borrado al final)
1. Borrador: jugador temporal ve "Convocatoria pendiente"; admin temporal ve el borrador.
2. Publicar: un aviso al convocado; el no convocado no puede leer lista ni logística (consulta directa como ese usuario); el convocado sí ve la lista pero no la citación de otros.
3. Quitar uno y agregar otro: solo esos dos reciben aviso.
4. Alineación borrador invisible; publicada, el convocado ve rol y cancha.
5. Resultado con goleadores en torneo temporal.
6. Los partidos del 8 y del 14 siguen en la Agenda de un jugador temporal.
7. TypeScript sin errores; capturas 375×667.

## Detalles técnicos
- Migración en `drizzle/migrations` (columnas, `match_lineups` con grants/RLS, trigger de validación, backfill de `callup_published_at`, `get_my_match_status`, ajuste de `notify_match_callup`). `match_callup_state` queda marcada obsoleta; la política `calendar_events_select_partidos_categoria` no se toca.
- Publicar/guardar con avisos deduplicados por server function (patrón `notifyBoardingPasses`).
- UI en `src/components/coord/partidos/*`, reglas puras en `src/lib/partidos.ts` con pruebas.

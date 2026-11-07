# Módulo Partidos (Coordinación › Técnica)

Partidos = nuestros partidos uno por uno. Comparte `tournament_matches` con Torneo: el resultado de aquí actualiza la tabla y el goleo. Reutiliza CallupPicker, CallupList, MatchOpsCard/Sheet, PlayerRow/PlayerAvatar/PositionTag/AvailabilityDot, TeamCrest y LocationPicker/LocationCard.

## Regla de visibilidad
- Todo nace en borrador: solo lo ve quien tiene Ver o Editar en Partidos.
- Convocatoria publicada: el convocado ve que está convocado, su citación y su viaje; el no convocado solo ve "No convocado".
- Alineación publicada: los convocados ven la cancha completa y los suplentes.
- La Agenda, la hoja del partido e Inicio preguntan el estado a una sola función de la base (no leen las tablas).

## Cambios en la base (aditivos)
1. Logística del partido: fecha de publicación de convocatoria, fecha de publicación de alineación y formación.
2. Tabla nueva de alineación (titular/suplente, puesto, orden), una fila por persona por partido, solo convocados (lo valida la base).
3. Reglas de acceso:
   - Convocatoria y logística: Ver/Editar en Partidos siempre; el jugador solo su fila y la logística si está publicada y él está convocado.
   - Alineación: Ver/Editar siempre; convocados solo si está publicada.
   - Escribir: solo Editar en Partidos.
   - Esto reemplaza las reglas temporales que puse la vez pasada (la del estado del jugador y la de convocados).
4. Función `get_my_match_status(partido)`: pendiente / convocado (citación, uniforme, lugar y, si hay alineación publicada, rol y puesto) / no convocado. Sustituye a la función de estado actual.
5. Avisos: nada mientras sea borrador. Al publicar: "Fuiste convocado vs <rival> · Citación <hora>" a cada convocado (uno por persona). Ya publicada: aviso a quien entra, "Ya no estás convocado…" a quien sale, "Cambió tu citación…" si cambian hora o lugar. Al publicar alineación: "Ya está la alineación vs <rival>". El trigger actual de convocatoria se ajusta para no avisar en borrador.

## Pantallas
- `/coordinacion/tecnica/partidos`: encabezado "‹ Técnica", filtro (torneo, local/visita), pestañas Próximos · Jugados, tarjetas estilo Agenda con estado de Convocatoria y Alineación; en Jugados, marcador grande.
- `/coordinacion/tecnica/partidos/$matchId?seccion=`: encabezado con marcador y pestañas:
  - **Convocatoria**: Convocados (conteo por posición) y Plantel; tocar agrega/quita; confirmación para lesionados/suspendidos; búsqueda, filtro por posición, "Copiar convocatoria del partido anterior"; barra fija "Publicar convocatoria" / "Publicada · Guardar cambios" con "Se avisará a N personas"; etiqueta de estado arriba.
  - **Alineación** (desde 11 convocados): formaciones 4-4-2, 4-3-3, 4-2-3-1, 3-5-2, 5-3-2; cancha vertical con puestos, tocar para asignar/cambiar/quitar; intercambio tocando dos puestos (arrastrar solo si sale sencillo); suplentes automáticos; copiar del partido anterior; botón fijo de publicar.
  - **Citación**: hora (selector de la app), lugar, uniforme Local · Visita · Alterno con nota, notas; si es visita, tarjeta del viaje ligado o "Crear viaje para este partido".
  - **Resultado**: marcador con − / +, goleadores de convocados con cantidad + "Autogol del rival", notas, "Guardar resultado" marca jugado y actualiza tabla y goleo.
- `/m/partidos` y avisos de partido: staff (Ver/Editar en Partidos) → ficha nueva; jugadores → su vista actual / hoja de la Agenda (sin tocarla).

## Vista del jugador (Agenda, hoja, Inicio)
"Convocatoria pendiente" (gris) · "Convocado" (verde) con citación, y si hay alineación "Titular · DEF"/"Suplente" + "Ver alineación" (cancha solo lectura) · "No convocado" (gris) sin citación, lista ni botón de viaje.

## Pruebas (solo datos temporales, sin avisar a nadie real, todo borrado al final)
1. Borrador: jugador temporal ve "Convocatoria pendiente" y nada más; admin temporal ve el borrador.
2. Publicar: un aviso al convocado con citación; el no convocado no puede leer lista ni logística (consulta directa como ese usuario).
3. Quitar uno y agregar otro: solo esos dos reciben aviso.
4. Alineación borrador invisible; publicada, el convocado ve rol y cancha.
5. Resultado con goleadores: jugado y goleo actualizado (en partido de prueba fuera del torneo real).
6. TypeScript sin errores. Capturas 375×667 de todas las pantallas pedidas.

## Detalles técnicos
- Migración nueva en `drizzle/migrations` (columnas, `match_lineups` con grants/RLS, trigger de validación de convocado, `get_my_match_status`, ajuste de `notify_match_callup` y triggers de cambio de logística/alineación). Se elimina el uso de `match_callup_state` en la app (la función queda, marcada como obsoleta).
- Publicar/guardar con avisos deduplicados vía server function (patrón de `notifyBoardingPasses`), calculando altas/bajas contra lo publicado.
- UI en `src/components/coord/partidos/*`, reglas puras en `src/lib/partidos.ts` con pruebas (formaciones, conteos, diferencias de convocatoria, estado).
- Para el resultado de prueba se crea un torneo temporal y se borra al final, para no tocar Primera Premier.

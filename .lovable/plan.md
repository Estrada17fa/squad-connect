# Torneos en Administración (nuevo look, conectado)

Mismo estilo que Usuarios. Sin cambios en la base de datos ni en las reglas. La pantalla actual (/admin/torneo) sigue disponible con "Ver versión actual".

## Estados (decisión tomada)
- **En curso**: estado "en curso" con al menos un partido jugado.
- **Próximo**: calculado, es un torneo "en curso" sin partidos jugados todavía.
- **Finalizado**: estado "finalizado".
- **Sin Archivados**: la base no tiene ese estado, así que no hay pestaña ni opción "Archivar".
- "Iniciar" no cambia nada guardado: un torneo pasa solo a En curso cuando se registra el primer resultado. En el menú, "Iniciar" se reemplaza por "Finalizar" y "Reabrir".

## Pantallas
1. **Lista** `/administracion/torneos`
   - Encabezado: "‹ Administración", lupa y "+".
   - Pestañas Próximos · En curso · Finalizados, con conteo.
   - Tarjetas con el logo completo sin recortar, nombre, "Temporada · Categoría" y una línea de resumen.
   - Si no hay torneos, aviso amable con "Crear torneo".
2. **Crear** `/administracion/torneos/nuevo`, en 5 pasos con barra de progreso, "Siguiente" fijo abajo y "Atrás" en texto:
   - **Datos**: logo, nombre, temporada, categoría y tipo (Liga · Copa · Amistoso; Amistoso se guarda como "otro").
   - **Formato**: todos contra todos o grupos, y liguilla, con una frase de resumen que se actualiza.
   - **Puntos**: sistemas predefinidos como tarjetas, con "Liga Premier México" preseleccionado; victoria, empate y derrota; reglas avanzadas (bonus de visita y penales); desempate reordenable con flechas.
   - **Equipos**: escudo, nombre, nombre corto y grupo; "+ Agregar equipo" y "Pegar lista". El equipo del club se agrega solo con su logo y queda como "Nuestro equipo".
   - **Resumen**: tarjetas con "Editar" por sección y el botón "Crear torneo".
3. **Editar** `/administracion/torneos/$id/editar`: mismas secciones, cada una se guarda por separado.
4. **Ficha** `/administracion/torneos/$id`
   - Portada con logo, estado y acceso "Calendario y resultados en Técnica ›" (por ahora lleva a /m/torneo).
   - Tarjetas de Formato, Puntos, Desempate, Equipos (cuadrícula editable al tocar) y Ajustes de puntos. Cada ajuste muestra equipo, puntos, motivo y su fecha de registro; hay "+ Agregar ajuste".
   - Menú "⋯": Editar, Finalizar/Reabrir y Eliminar, con la misma confirmación y revisión de partidos que hoy.
5. **Portada de Administración**: la tarjeta de Torneos muestra el número real ("1 en curso").

## Detalles técnicos
- Se reutilizan los hooks que ya existen (useTournaments, useSaveTournament, useSaveTournamentTeam, useDeleteTournament, ajustes de puntos y partidos), además de los presets y desempates de lib/torneo y el almacenamiento de escudos (tournament-crests).
- Componentes nuevos en src/components/admin/torneos/*. Se reutilizan StepProgress y StickyFooterActions de Usuarios.
- "Pegar lista" crea varios equipos de una vez al guardar.
- AGENTS.md: Administración › Torneos sirve para armar el torneo; Coordinación › Técnica › Torneo es para calendario y resultados (se hará después).

## Pruebas
- Capturas en 375×667: la lista, los 5 pasos (incluido Pegar lista), la ficha y un ajuste de puntos.
- Crear un torneo de prueba completo, editarlo y eliminarlo, confirmando que no quede ningún rastro.
- Comparar "Primera Premier" antes y después para confirmar que no cambió.

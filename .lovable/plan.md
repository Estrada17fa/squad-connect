# Vista "Mi viaje" jerarquizada + revisión de Viajes en la matriz

## 1. Principio: primero lo mío, el resto plegado

`MyTripView` (pestaña Viajes de Agenda, solo lectura) se reorganiza en dos zonas.

### Zona A — MI INFORMACIÓN (arriba, tarjetas grandes)

Solo lo que involucra al usuario, en tarjetas escaneables con icono y acento:

- **Mi vuelo** (una tarjeta por tramo, Ida y Regreso): aerolínea, código, ruta
  `SJD → BJX`, salida y llegada con fecha/hora, puerta y asiento si existen.
  Sin pasajeros de ese vuelo.
  - Botón destacado **"Ver mi pase de abordar"** dentro de la tarjeta, que abre
    el pase del usuario a pantalla completa (y permite descargarlo). Si no hay
    pase cargado: texto "Tu pase aún no está disponible", sin botón activo.
  - Se conserva el aviso de equipaje (documenta maleta / solo mano).
- **Mi transporte**: solo los transportes donde el usuario es pasajero.
- **Mi hospedaje**: su hotel, su cuarto y con quién lo comparte.
- **Mi citación**: hora y punto de reunión.
- **Mis comidas** y **material a mi cargo** se mantienen, ya son personales.

Si el usuario no tiene ninguna asignación, se muestra un estado vacío claro en
lugar de tarjetas.

### Zona B — RESTO DEL VIAJE (colapsado, cerrado por defecto)

Debajo, acordeones cerrados:

- **Ver todos los vuelos** → lista completa de vuelos con sus pasajeros.
- **Ver logística general** → transportes, hoteles y equipaje del grupo.
- **Documentos del viaje** se mantiene como está (ya es corto).

## 2. Recomendación para el punto 3 (cuánto ve un jugador)

Mi recomendación: **el jugador NO ve el manifiesto logístico completo**. Ver
todos los vuelos con sus pasajeros no le sirve y sí expone quién viaja en qué,
con qué asiento y en qué habitación.

Propuesta concreta:

- Jugador / Vista jugador: su información + un acordeón simple **"Quiénes van
  al viaje"** con nombre, foto y categoría de los convocados. Nada de asientos,
  cuartos, pases ni transportes ajenos.
- Staff con Viajes en lector/editor: además los acordeones completos
  ("Todos los vuelos" con pasajeros y "Logística general").

Se resuelve con el permiso ya existente: `vista_jugador` cae en la versión
reducida; `lector_categoria` o superior en la completa. No se crean permisos
nuevos ni se toca la RLS.

## 3. Punto 4: Viajes en la matriz de permisos — diagnóstico

Lo que verifiqué antes de escribir esto:

- En la base, `role_permissions` **sí tiene la fila `viajes`** para los 5 roles
  (Admin editor global, Técnico y Médico lector de categoría, Staff editor de
  categoría, Jugador vista jugador). No es el caso de "falta la fila" que pasó
  con `partidos`.
- Ejecuté la función que alimenta ambas matrices y **`viajes` sí está** en el
  grupo Coordinación: `coordinacion_interna, solicitudes, inventario,
  compras_facturas, partidos, viajes`. La matriz por rol y la de excepciones
  por usuario usan esa misma fuente, y ya renderizan las filas aunque la página
  esté apagada.
- `module_key` está alineado: matriz, pestaña, hooks y RLS usan `viajes`.

Es decir: con el código actual la opción debería aparecer. Por eso el primer
paso de este punto es **reproducirlo en el navegador** en la ruta exacta
(Admin → Usuarios → Roles y permisos, y también Miembros → Ajustes avanzados),
con la sesión real y en ancho móvil, para ver si la fila falta de verdad, si
queda cortada visualmente, o si lo que viste fue una versión previa en caché.
Solo después se corrige la causa concreta que muestre esa reproducción; no voy
a "arreglar" algo que hoy no puedo confirmar roto.

## 4. Diseño

Estándar visual del proyecto: tarjetas `glass`, acento de color de viaje,
iconos Lucide (nunca emojis), tipografía display en encabezados. Las tarjetas
de "Mi vuelo" son las de mayor jerarquía, con la ruta en grande
(`SJD → BJX`) y el botón del pase a ancho completo con `glow-primary`. Los
acordeones usan el estilo colapsable existente, con contador ("6 vuelos").

## 5. Detalle técnico

- `src/components/viajes/MyTripView.tsx`: se reescribe. Deja de ser una sola
  línea de tiempo y pasa a: sección "Mi información" (tarjetas por bloque) +
  acordeones. Recibe una prop nueva de nivel de detalle
  (`detail: "player" | "full"`) derivada del permiso.
- Nuevos subcomponentes en `src/components/viajes/mi/`: `MyFlightCard`,
  `MyTransportCard`, `MyStayCard`, `MyCallCard`, `TripFoldedSections`.
- `src/routes/_authenticated/agenda-viajes.tsx`: calcula `detail` con el nivel
  efectivo de `viajes` (`vista_jugador` → `player`, superior → `full`) y lo pasa
  a `MyTripView`. La bifurcación actual con `TripDetailSheet` para staff editor
  se conserva.
- Apertura del pase: se reutiliza la URL firmada de `TRIP_DOCS_BUCKET` ya
  presente; se añade botón de descarga junto al de ver.
- Sin cambios de datos ni de RLS. Sin migración.

# Pases de abordar: un solo camino, nuevo look y detección de nombres

Sin cambios en la base de datos.

## 1. Un solo camino
- Toda subida (ficha del viaje, ficha del vuelo, fila de pasajero) abre el flujo de tarjetas (`PassAssignFlow`): imagen por página, lectura de nombre/vuelo/asiento/grupo/terminal, guardado con la misma función de servidor y aviso único si el viaje está Publicado.
- Se eliminan "Repartir desde PDF" (`BoardingPassAutoMatchSheet`) y "Agregar pase" (`BoardingPassUploadDialog`), y la subida propia de `useTripBoardingPasses` (se conservan lectura/borrado).
- "Subir pase" desde una fila abre el flujo con una tarjeta y esa persona sugerida (un toque para confirmar).
- Revisión de pases viejos: se buscan los que sean PDF, no tengan imagen, pasajero o vuelo, o no se vean en Mis viajes; se corrigen (PDF→JPG, datos leídos) y se reporta cuántos.

## 2. Detección del nombre
- Se extrae el texto real del PDF de Volaris del viaje a Orizaba y se ajusta `boardingPassMatch` a ese formato (APELLIDO/NOMBRE, líneas separadas, etiquetas Pasajero/Passenger, otro orden). Viva Aerobus y Aeroméxico solo si hay ejemplos en el proyecto.
- Página sin texto → tarjeta para asignar a mano.
- Meta: 20 de 24 páginas o más con sugerencia; se reporta sin guardar nada. Pruebas unitarias con líneas de ejemplo.

## 3. Tarjetas: todos a la vista
- "¿Es otra persona?" muestra cuadrícula (4 por fila) de TODOS los pasajeros del vuelo sin pase, ordenada por parecido y luego alfabéticamente; un toque asigna.
- Los asignados desaparecen en las siguientes tarjetas.
- Campo de búsqueda pequeño arriba para filtrar.

## 4. Nuevo look de la hoja "Pases de abordar"
- Encabezado: título, vuelo en gris ("MHLRPT · SJD → PBL"), avance "24 de 24 con pase" (verde) o ámbar con "Faltan 3".
- Un botón principal: "Subir pases". Filtro "Todos · Sin pase".
- Lista sin bordes: foto, nombre corto completo, "Asiento 17F · Grupo 6" en gris, palomita verde o "Sin pase" gris. Tocar abre el visor o "Subir pase" para esa persona.
- Menú "⋯" por fila: Reemplazar (mismo flujo, una tarjeta) y Eliminar (con confirmación; borra también el archivo).

## Pruebas
1. Viaje temporal: subir 1 pase desde fila → igual que lote; el viajero temporal lo ve en Mis viajes.
2. Subir varios: la cuadrícula muestra a todos los que faltan y se reduce.
3. Reporte de detección con el PDF real de Volaris, sin guardar.
4. Borrar datos temporales; sin avisos a personas reales; TypeScript sin errores.

## Entrega
Reporte de pases viejos corregidos y detección de Volaris; capturas 375×667 de la hoja nueva, la tarjeta con cuadrícula y la subida desde fila.

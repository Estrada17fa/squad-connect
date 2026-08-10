# Viajes · Parte 3: Pases de abordar

Los pases viven dentro de cada vuelo, en su pestaña Ida/Regreso. Dos caminos: carga manual (base robusta) y auto-asignación por nombre desde un PDF con varios pases (siempre con confirmación previa).

## 1. Vista de pases por vuelo

- En la ficha del vuelo, el bloque "Pases de abordar" pasa de un contador simple a una lista escaneable de **todos los pasajeros del vuelo**: avatar + nombre, badge "Con pase" / "Sin pase", asiento si lo hay, y acciones Ver/Descargar cuando existe archivo.
- Encabezado con contador claro: "18 de 22 con pase".
- Pases sin persona asignada aparecen en un grupo aparte "Sin asignar", con selector para asignarlos.
- Ver abre el archivo (PDF o imagen) en visor con enlace de descarga, usando URL temporal firmada del bucket privado.
- El dueño ve su propio pase (ya lo permite la RLS); no se construye aún la vista de Agenda/Inicio.

## 2. Carga manual (siempre disponible)

- Botón "Agregar pase de abordar" en el vuelo (solo editores).
- Subir archivo (PDF o imagen) + elegir persona entre los pasajeros del vuelo.
- Campos opcionales: asiento, grupo de abordar, terminal/puerta, notas.
- Se pueden cargar varios, uno por persona; reasignar y eliminar desde la lista.

## 3. Auto-asignación por nombre desde PDF (con confirmación obligatoria)

Flujo en tres pasos dentro de una sheet:

1. **Subir** el PDF completo con varios pases.
2. **Analizar** en el navegador: separar por páginas, extraer texto de cada página, detectar el nombre del pasajero (y si aparecen, asiento y número de vuelo).
3. **Confirmar**: lista con una fila por página detectada — nombre extraído -> persona sugerida (badge de confianza Alta / Media / Sin match) + selector para corregir o dejar "Sin asignar". Vista previa por página para verificar.

Nada se guarda hasta pulsar Confirmar. Al confirmar, cada página se recorta a su propio PDF de una hoja, se sube al bucket privado y se inserta su registro ligado a vuelo + persona.

### Match de nombres

Comparación tolerante: minúsculas, sin acentos ni puntuación, orden nombre/apellido indiferente, iniciales y nombres parciales ("JOSE L GARCIA" contra "José Luis García Pérez"), coincidencia por tokens con similitud difusa. Alta confianza = coincidencia clara y única; Media = parcial o varios candidatos; sin match = queda sin asignar.

### PDFs escaneados (sin texto)

Si una página no devuelve texto útil, no se intenta OCR: se marca esa página como "sin texto detectado" y llega a la pantalla de confirmación sin sugerencia, para asignarla a mano. Si **ninguna** página tiene texto, se avisa que ese PDF no permite auto-detección y se ofrece: subir el PDF entero como un solo pase y repartirlo manualmente, o volver a la carga manual. Ningún error de lectura rompe el flujo.

## Permisos

- Solo editores del viaje cargan, asignan y eliminan pases.
- Lector Global ve la lista en lectura (sin botones de carga).
- Vista Jugador / Lector Categoría no acceden al módulo; el dueño conserva acceso a su propio pase por RLS.
- La RLS existente no se toca.

## Detalles técnicos

- **Librerías (cliente, no servidor):** `pdfjs-dist` para extraer texto por página y renderizar la vista previa; `pdf-lib` para recortar cada página en un PDF independiente. Ambas corren en el navegador, así que no dependen del runtime del Worker ni suben el PDF completo a ningún servicio externo.
- Migración pequeña y aditiva sobre `trip_boarding_passes`: columnas opcionales `boarding_group` y `terminal` (`text`, nulables). Sin cambios de RLS ni de grants existentes.
- Utilidad nueva `src/lib/boardingPassMatch.ts`: normalización de nombres, extracción de candidatos de nombre desde el texto de una página y puntuación de similitud.
- Extensión de `useTripBoardingPasses.ts` con una mutación de carga por lote (varios archivos + asignaciones en una sola confirmación) reutilizando el bucket `trip-documents` y la invalidación de `trip-flights`.
- Componentes nuevos en `src/components/viajes/logistica/`: `BoardingPassesSheet.tsx` (lista + contador), `BoardingPassUploadDialog.tsx` (manual) y `BoardingPassAutoMatchSheet.tsx` (análisis + confirmación). `BoardingPassDialog.tsx` actual se reemplaza por estos.
- Fechas en `timestamptz`, iconos de lucide (sin emojis), mismo patrón de sheets lectura + Editar y estilo de botones del resto de Viajes.

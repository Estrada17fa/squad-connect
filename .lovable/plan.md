# Módulo Viajes (Coordinación › General) con el nuevo look

Sin cambios a la base de datos ni a las reglas. Agenda › Viajes (vista del jugador) no se toca. El viaje real de mañana solo se abre para verlo.

## 0. Arreglo de permiso
`canManageTripsModule`: sí con Ver o Editar por categoría (y niveles globales); no con Sin acceso ni vista_jugador. Editar sigue dependiendo de Editar en la categoría del viaje.

## 1. Rutas
- `/coordinacion/general/viajes` lista
- `/coordinacion/general/viajes/nuevo` crear (página completa, botón fijo abajo)
- `/coordinacion/general/viajes/$tripId` ficha, con `?seccion=`
- `/coordinacion/general/viajes/$tripId/editar` editar (misma página de crear)
- `/m/viajes` y `/m/viajes?open=<id>` redirigen a la ruta nueva; los avisos de viajes abren la ficha nueva.

## 2. Lista
Encabezado "‹ General", "Viajes", lupa y "+". Tarjeta protagonista del próximo viaje (escudos del partido o destino, "Sale en N días · fecha", "Preparación N%", Abrir). Pestañas Próximos · Pasados; filas con escudo/avión, título, fechas, categoría, viajeros y anillo de preparación.

## 3. Crear / editar
Partido de visita opcional que prellena título, destino y fechas; título, destino, salida, regreso, categoría, punto de reunión (selector de lugar + tarjeta de lugar), notas. Viajeros: "Agregar desde convocatoria" + staff/personas a mano con nota de rol.

## 4. Ficha
Portada (escudos, fechas, cuenta regresiva, punto de reunión con Maps y Waze), "⋯" Editar/Eliminar con confirmación. Tarjeta "Preparación" con faltantes tocables ("3 sin pase de abordar", "2 sin cuarto", "1 sin transporte de regreso") o "Todo listo para viajar". Pestañas deslizables: Resumen (línea de tiempo), Viajeros (4 íconos de estado + filtro "Con pendientes"), Vuelos (tarjeta por tramo con códigos grandes, horarios, "Pases 18/24"; al abrir, pasajeros, pase, equipaje, "Subir pases"), Hotel (rooming en tarjetas con fotos + "Sin cuarto" asignable con un toque), Transporte, Comidas, Equipaje (con material prestado), Documentos. Cada sección con "+" reutilizando los formularios existentes con el nuevo estilo.

## 5. Subir pases de un jalón
Botón en la ficha y en cada vuelo. Varios PDFs, PDF de muchas páginas, o JPG/PNG; cada página o imagen es un pase. Se lee el texto, se sugiere pasajero y vuelo (por código de vuelo o fecha); imágenes sin texto quedan para asignar a mano. Revisión agrupada por vuelo: "Sin coincidencia" arriba, miniatura, "Seguro"/"Revisar", selector para cambiar, aviso si ya tiene pase (reemplazar o no). "Guardar todos" solo los confirmados con barra de avance; al final "Pases N/N" o lista de faltantes.

## 6. Portada de General
"Próximo viaje" y el mosaico de Viajes con datos reales (destino, "en N días", pendientes).

## Pruebas (solo datos temporales, sin avisar a nadie real)
1. Partido y viaje de prueba con 3 usuarios temporales: ida y regreso, hotel con 2 cuartos, un transporte, una comida.
2. Subir un PDF de 3 páginas + 1 imagen, corregir una sugerencia, guardar; queda "Todo listo".
3. Abrir el viaje real solo para verlo.
4. Staff temporal edita el viaje de prueba; Jugador temporal no ve el módulo.
5. `/m/viajes?open=<id>` abre la ficha nueva.
6. Borrar viaje, pases, archivos, partido y usuarios de prueba; sin errores de TypeScript.
Entrega: capturas en celular (375 × 667) de lista, ficha y Preparación, Viajeros, Vuelos, Hotel, revisión de pases y el viaje real.

## Detalles técnicos
- UI nueva en `src/components/coord/viajes/*`, lógica de preparación en `src/lib/viajes.ts` (con pruebas: porcentaje y faltantes).
- Reutiliza hooks `useTrip*`, formularios de `src/components/viajes/logistica/*` y `boardingPassMatch` (se añade lectura de imágenes como pase sin texto y detección de vuelo por código/fecha, sin cambiar las reglas de coincidencia de nombres).
- Notificaciones de viajes pasan a la ruta nueva en `notificationTargets.ts`.

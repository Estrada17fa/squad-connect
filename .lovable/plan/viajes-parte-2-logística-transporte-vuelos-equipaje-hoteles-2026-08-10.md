# Viajes — Parte 2: Logística (transporte, vuelos, equipaje, hoteles)

La Parte 1 ya dejó las pestañas Ida / Regreso / General y varios bloques de logística funcionando. Esta parte cierra los huecos reales que quedan, sin rehacer lo que ya sirve.

## Qué ya funciona (se conserva)

- Varios transportes por tramo, con tipo, punto de recogida, destino, hora y pasajeros asignados desde los convocados.
- Varios vuelos por tramo, con aerolínea, número, origen/destino, salida/llegada y pasajeros por vuelo.
- Hoteles con habitaciones y ocupantes en la pestaña General.
- Contenedor de pases de abordar por tramo, listo para la Parte 3.

## Cambios de esta parte

### 1. Equipaje por persona (cambio principal)

Hoy el equipaje es texto libre. Se sustituye por una lista de los convocados con dos marcas por persona:

- Maleta documentada (sí/no)
- Maleta de mano (sí/no)

Vista: lista de personas con avatar, nombre y badges "Documentada" / "Mano". Contadores arriba ("18 documentan · 22 de mano") para saber de un vistazo qué esperar en el mostrador. El editor marca/desmarca directo en la lista; el lector solo ve. Se mantiene aparte el bloque de material del club (préstamos de inventario), que no es equipaje personal.

Requiere una tabla nueva `trip_traveler_luggage` (viaje, persona, documentada, mano) con permisos: la ve quien ve el viaje, la edita quien edita el viaje, usando las mismas funciones de acceso ya existentes. El equipaje viejo de texto libre deja de mostrarse.

### 2. Punto de recogida con mapa en transporte

Hoy el punto de recogida es texto libre. Pasa a usar el selector de ubicación con mapa (el mismo de eventos y del punto de reunión del viaje), guardando la ubicación del catálogo del club; el texto libre sigue siendo válido cuando no hay ubicación guardada. En la ficha del transporte se muestra el mini-mapa y el botón "Cómo llegar".

Requiere agregar una columna de ubicación a `trip_transports` (referencia al catálogo de ubicaciones), conservando el texto actual.

### 3. Repaso de tarjetas y asignación

- Tarjeta de transporte y de vuelo: encabezado escaneable (identificador, ruta, hora), badge de tipo/tramo y conteo visible de pasajeros ("12 pasajeros") junto a los avatares.
- El selector de pasajeros ya limita a los convocados y permite importar de otro tramo; se le agrega el conteo de seleccionados y el aviso de quién ya va asignado a otro transporte del mismo tramo, para evitar duplicados.
- Hoteles: se verifica que la ubicación del hotel use el mismo componente de mapa y que la asignación de ocupantes esté visible desde la tarjeta.

## Permisos

Sin cambios respecto a la Parte 1: editar solo para editores del viaje (categoría o global), lector global solo lectura, vista jugador y lector de categoría no ven el módulo. La tabla nueva de equipaje hereda esas mismas reglas.

## Detalle técnico

- Migración: `trip_traveler_luggage` (trip_id, user_id, checked_bag bool, carry_on bool, únicos por viaje+persona, timestamps + trigger, GRANT y políticas basadas en `can_view_trip_new` / `can_edit_trip_new`); `trip_transports.pickup_location_id` (FK a `locations`, nullable).
- Hook nuevo `src/hooks/useTripTravelerLuggage.ts` con consulta, alternado optimista y realtime vía `useTripChannel`.
- `LuggageSection.tsx` se reescribe a lista por persona; se retira `LuggageFormDialog`/`LuggageItemDetailSheet` del flujo de equipaje personal.
- `TransportFormDialog` / `TransportDetailSheet` usan `LocationPicker` y `LocationDisplay`.
- Fechas siempre `timestamptz`; iconos de lucide, sin emojis.

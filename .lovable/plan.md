# Viajes — Parte 1: formulario y estructura base

Sin cambios en base de datos ni RLS: `trips`, `trip_travelers` y las tablas de logística ya existen y los 6 niveles ya están migrados. Parte 2 (transporte/vuelos/hoteles/equipaje) y Parte 3 (pases de abordar) llenarán los contenedores que deja esta parte.

## Estado actual (verificado en el código)

- `TripFormDialog.tsx` es una lista plana de campos (equipo, título, destino, partido, salida, regreso, punto de reunión, citatorio, estado, notas) y **no** permite convocar al crear: la convocatoria solo se hace después, dentro del detalle.
- `TripDetailSheet.tsx` **no** tiene pestañas Ida / Regreso / General: hoy es una sola lista cronológica más un conmutador "Mi viaje / Itinerario completo". Esta parte crea las pestañas y reubica dentro los bloques existentes.
- La ruta `/m/viajes` hoy deja ver el módulo a cualquiera con acceso (`accessibleModules`), incluida Vista jugador y Lector de categoría. Hay que endurecerlo según las reglas nuevas.

## Formulario de crear viaje (rehacer por secciones)

Mismo estándar visual que Solicitudes/Compras: secciones con título e icono, sin campos sueltos.

1. **Datos del viaje** — equipo/categoría (solo equipos donde el usuario es editor; bloqueado al editar), título, destino, partido asociado opcional (partidos del equipo, con buscador en vez de `select` nativo).
2. **Fechas** — salida (fecha y hora, obligatoria) y regreso (opcional), guardadas en `timestamptz`, validando que el regreso no sea anterior a la salida.
3. **Punto de reunión y cita** — `LocationPicker` (mapa/búsqueda ya arreglado) + hora de citación.
4. **Convocados** — el mismo patrón de convocatoria de eventos: por defecto **todo el equipo**, con opción "Personalizar" para quitar o elegir personas. Al cambiar de equipo se recalcula.
5. **Detalles** — estado del viaje (planeación / confirmado / en curso / completado) y notas.

Al guardar: se crea el viaje, se insertan los convocados elegidos (los avisos automáticos existentes se disparan solos) y **se abre el detalle del viaje recién creado** para seguir con la logística. Al editar se sincroniza la convocatoria (altas y bajas). Eliminar sigue disponible para editores.

## Detalle del viaje (estructura para Partes 2 y 3)

Modo lectura primero, botón "Editar viaje" arriba solo para editores. Cabecera con estado, equipo, destino, fechas y número de convocados.

Debajo, tres pestañas:

- **Ida** — transporte de ida, vuelos de ida y contenedor listo para pases de abordar de ida (Parte 3).
- **Regreso** — transporte y vuelos de regreso + contenedor de pases de regreso.
- **General** — punto de reunión con mapa, cronología, hoteles, comidas, equipaje, documentos, notas y convocatoria.

Cada pestaña muestra un vacío claro ("Sin transporte de ida registrado") en vez de desaparecer, para que se vea dónde entrará la logística. Los bloques ya existentes se mueven a su pestaña sin cambiar su lógica interna.

## Permisos (module_key `viajes`, ya migrado)

Este módulo es de GESTIÓN. Se resuelve en la interfaz con `useTeamAccess("viajes")` y `useEditableTeams`, sin tocar la RLS:

- Sin acceso, **Vista jugador** y **Lector de categoría**: el módulo no aparece (se quita también su chip en Coordinación y su prefetch). Regla análoga a la que ya existe para Usuarios.
- Lector global: ve todos los viajes del club en modo lectura, sin "Agregar viaje" ni "Editar".
- Editor de categoría: crea, edita y elimina viajes de sus categorías; solo ve viajes de esas categorías.
- Editor global: todo el club.

Se retira del detalle el conmutador "Mi viaje / Itinerario completo" (`MyTripView`), porque ya nadie con vista de jugador entra aquí. El componente se conserva sin borrar para reutilizarlo cuando se construya la vista personal en Agenda/Inicio.

**Ligado para Agenda/Inicio (futuro):** no se construye ninguna vista de jugador ahora. Los datos por persona siguen accesibles tal como están en la RLS (`trip_travelers`, `trip_flight_passengers`, `trip_transport_passengers`, `trip_boarding_passes`, `trip_luggage`), y los hooks de Viajes se dejan aceptando un `userId` opcional para filtrar "lo mío" cuando toque.

La lista de Viajes mantiene el filtro por categoría y suma el patrón limpio de filtros (buscador + embudo con estado y rango de fechas), igual que Usuarios/Solicitudes.

## Archivos

- Reescribir: `src/components/viajes/TripFormDialog.tsx` (secciones + convocatoria), `src/components/viajes/TripDetailSheet.tsx` (pestañas Ida/Regreso/General).
- Nuevo: `src/components/viajes/TripTabs.tsx` (contenedores de las tres pestañas) y `src/components/viajes/TripFilters.tsx`.
- Ajustar: `TripLogisticsTimeline.tsx` se divide por tramo; `src/routes/_authenticated/m.viajes.tsx` (compuerta de acceso, abrir detalle tras crear, filtros); `agenda-viajes.tsx` y el chip/prefetch de Coordinación para la nueva regla de visibilidad.
- Reutilizados sin cambios: `AttendeePicker`, `LocationPicker`, `LocationDisplay`, hooks de logística.

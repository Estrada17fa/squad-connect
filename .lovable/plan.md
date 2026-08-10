# Viajes — Parte 1: formulario y estructura base

Sin cambios en la base de datos ni en la RLS: `trips`, `trip_travelers` y `meeting_location_id` ya existen y los 6 niveles ya están migrados.

## Estado actual (verificado)

- El formulario de viaje es una sola lista plana de campos (equipo, título, destino, partido, salida, regreso, punto de reunión, citatorio, estado, notas) y **no** permite convocar a nadie al crear: la convocatoria solo se hace después, dentro del detalle.
- El detalle **no** tiene todavía pestañas Ida / Regreso / General: hoy es una sola lista cronológica (transporte ida, vuelo ida, hotel, comidas, vuelo regreso, transporte regreso, equipaje, documentos) más un conmutador "Mi viaje / Itinerario completo". Esta parte crea esas pestañas y coloca dentro los bloques que ya existen.

## Formulario de crear viaje (rehacer por secciones)

Mismo estándar visual que Solicitudes/Compras: secciones con título e icono, sin campos sueltos.

1. **Datos del viaje** — equipo/categoría (solo equipos donde el usuario es editor; bloqueado al editar), título, destino, partido asociado (opcional; lista de partidos del equipo, con buscador en vez del `select` nativo).
2. **Fechas** — salida (fecha y hora, obligatoria) y regreso (opcional). Se guardan en `timestamptz`, con validación de que el regreso no sea anterior a la salida.
3. **Punto de reunión y cita** — `LocationPicker` (mapa/búsqueda ya arreglado) + hora de citación.
4. **Convocados** — el mismo patrón de convocatoria de eventos: por defecto **todo el equipo**, con opción "Personalizar" para quitar o elegir personas. Al cambiar de equipo se recalcula.
5. **Detalles** — estado del viaje (planeación / confirmado / en curso / completado) y notas.

Al guardar: se crea el viaje, se insertan los convocados elegidos (los avisos automáticos existentes se disparan solos) y **se abre el detalle del viaje recién creado** para seguir con la logística. Al editar se sincroniza la convocatoria (altas y bajas). Eliminar viaje sigue disponible para editores.

## Detalle del viaje (estructura para Partes 2 y 3)

Modo lectura primero, botón "Editar viaje" arriba solo para editores. Cabecera con estado, equipo, destino, fechas y número de convocados.

Debajo, tres pestañas:

- **Ida** — transporte de ida, vuelos de ida y contenedor listo para pases de abordar de ida (Parte 3).
- **Regreso** — transporte y vuelos de regreso + contenedor de pases de regreso.
- **General** — punto de reunión con mapa, cronología, hoteles, comidas, equipaje, documentos, notas y convocatoria.

Cada pestaña muestra un vacío claro ("Sin transporte de ida registrado") en vez de desaparecer, para que se vea dónde se agregará la logística. Los bloques ya existentes se mueven a su pestaña sin cambiar su lógica interna.

## Permisos (module_key `viajes`, ya migrado)

Resueltos con `useTeamAccess("viajes")` y `useEditableTeams`, sin tocar la RLS:

- Sin acceso: no ve el módulo.
- Vista jugador: solo viajes de su categoría donde está convocado; abre en "Mi viaje" con su transporte, su asiento, su equipaje; sin ninguna acción.
- Lector categoría / global: ve los viajes de su alcance en modo lectura, sin botón de crear ni Editar.
- Editor categoría: crea, edita y elimina viajes de sus categorías (botón "Agregar viaje" solo si tiene al menos una).
- Editor global: todo.

La lista de Viajes mantiene el filtro por categoría y agrega el patrón limpio de filtros (buscador + embudo con estado y rango de fechas), igual que Usuarios/Solicitudes.

## Archivos

- Reescribir: `src/components/viajes/TripFormDialog.tsx` (secciones + convocatoria), `src/components/viajes/TripDetailSheet.tsx` (pestañas Ida/Regreso/General).
- Nuevo: `src/components/viajes/TripTabs.tsx` (contenedores de las tres pestañas) y `src/components/viajes/TripFilters.tsx`.
- Ajustar: `src/components/viajes/TripLogisticsTimeline.tsx` se divide por tramo en lugar de una sola lista; `src/routes/_authenticated/m.viajes.tsx` (abrir detalle tras crear, filtros) y `agenda-viajes.tsx` (misma estructura en readOnly).
- Reutilizados sin cambios: `AttendeePicker`, `LocationPicker`, `LocationDisplay`, hooks de logística.

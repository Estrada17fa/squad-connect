# Ubicaciones: guardar coordenadas siempre y mostrarlas bien en todos los módulos

Revisé el catálogo real del club: hay una ubicación llamada "Estadio Don Koll" guardada sin dirección y **sin coordenadas**, y otra "Estadio de Futbol Don Koll" **con** coordenadas correctas pero marcada como borrador (creada al elegirla en un evento), por lo que no aparece en el catálogo. El buscador de mapa sí funciona: la causa del bug es que el formulario permite guardar solo con el nombre escrito a mano, sin obligar a elegir un lugar en el mapa.

## 1. Alta y edición de ubicación (Configuración del club)

- El formulario pasa a ser guiado: primero se busca el lugar (OpenStreetMap), se elige un resultado y se ve el mini-mapa con el pin arrastrable.
- **Las coordenadas son obligatorias**: no se puede guardar sin un punto en el mapa. Si el usuario solo escribe texto, se le pide elegir un lugar o ajustar el pin.
- Después de elegir, el nombre queda editable para dejarlo corto ("Estadio Don Koll") y la dirección larga se conserva aparte.
- Al arrastrar el pin se guardan las coordenadas ajustadas.
- Se evita duplicar: si el club ya tiene ese mismo lugar (mismo place_id), se reutiliza y se sube al catálogo en vez de crear otro.

## 2. Lista y detalle

- Tarjetas con mini-mapa, nombre destacado, dirección y chip de estado, en el estándar visual de Usuarios.
- En la tarjeta y en la hoja de detalle, dos acciones claras: **Ver en mapa** (expande el mapa dentro de la app) y **Abrir en Google Maps** (abre con las coordenadas).
- Ubicaciones antiguas sin coordenadas: chip "Sin mapa" y aviso en el detalle con acción directa **Corregir ubicación**, que abre el buscador para asignarles el punto.
- Las ubicaciones creadas desde otros módulos (hoy invisibles por ser borradores) se muestran en una sección/filtro "Usadas en módulos", con la opción de sumarlas al catálogo.

## 3. Reutilización en eventos, entrenamientos y viajes

- `LocationDisplay` (nombre + dirección + Ver en mapa + Abrir en Google Maps) se vuelve el único componente de presentación de ubicación y se usa igual en Configuración y en los detalles de evento, sesión, junta, viaje y hotel.
- Verifico en la app, con datos reales, que al elegir una ubicación guardada en un evento el detalle muestre mapa y ambas acciones, no solo el nombre.

## 4. Permisos y borrado

- Crear, editar y eliminar: solo Editor Global / admin del club; el resto ve el catálogo en lectura.
- Antes de borrar se cuenta el uso en eventos, juntas, hoteles y puntos de reunión de viajes; si está en uso, el borrado se bloquea indicando dónde se usa.

## Detalles técnicos

- `src/components/admin/LocationsTab.tsx`: reescritura del `LocationForm` (búsqueda obligatoria, coords requeridas, dedupe por `place_id` con `useResolveLocation` + `usePromoteLocation`), tarjetas con acciones, filtro de catálogo/borradores y flujo "Corregir ubicación".
- `src/components/calendar/LocationDisplay.tsx`: añadir "Ver en mapa" colapsable + botón de Google Maps y estado sin coordenadas; usarlo en los sheets de detalle que hoy pintan texto plano.
- `src/hooks/useLocations.ts`: hook para listar también borradores del club (`is_catalog=false`) y reutilizar por `place_id` al promover.
- Sin cambios de esquema ni de RLS.

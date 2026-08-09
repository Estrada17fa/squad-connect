# Ficha de detalle: textos largos que nunca se encimen

El problema no es solo de Usuarios: viene de las piezas compartidas de la ficha (`DetailGrid`, `DetailField`, `DetailValue`) que se usan en todos los módulos. Se arregla ahí, y todos los detalles heredan el arreglo.

## Qué pasa hoy

- `DetailGrid` fuerza **dos columnas siempre**, incluso a 559 px de ancho. Un correo largo no cabe en media columna.
- Ninguna celda tiene `min-w-0`, así que el texto no puede encogerse: desborda su columna y se mete encima de la de al lado.
- El valor se pinta sin regla de corte, por lo que una cadena sin espacios (correo, URL) no se parte nunca.

## Regla de diseño que queda fija

Para cualquier ficha de detalle de la app:

1. Una columna en móvil, dos a partir de `sm`. Nunca dos columnas forzadas en pantallas estrechas.
2. Toda celda de texto lleva `min-w-0` para poder encogerse.
3. Los valores parten palabras largas (`break-words` / `overflow-wrap: anywhere`), no se truncan con puntos suspensivos: en una ficha se lee el dato completo.
4. Datos accionables (correo, teléfono) se muestran como enlace (`mailto:` / `tel:`) con el mismo corte.
5. Campos que por naturaleza son largos (correo, dirección, notas) pueden ocupar el ancho completo de la rejilla.

## Cambios

**`src/components/squad/DetailSheet.tsx`** (base compartida)
- `DetailGrid`: `grid-cols-1 sm:grid-cols-2`, con soporte para que un campo ocupe ancho completo.
- `DetailField`: `min-w-0`; la etiqueta ya no empuja el ancho.
- `DetailValue`: corte de palabras largas.
- Nuevo `DetailLink` para correo/teléfono, con el mismo comportamiento de corte.

**`src/components/usuarios/MemberDetailSheet.tsx`** (referencia visual)
- Correo a ancho completo y como `mailto:`; teléfono como `tel:`; alta al lado.
- La cabecera con avatar + nombre + badges pasa al patrón `min-w-0` para que un nombre largo no empuje los badges.
- Las filas de membresías: nombre de equipo/puesto que se encoge, badge de rol con `shrink-0`.

Sin cambios de datos, permisos ni RLS. Solo presentación.

## Verificación

Recorrido en navegador a 559 px y en escritorio, abriendo la ficha de un miembro con correo largo, comprobando que nada se encima y que el correo se lee completo.

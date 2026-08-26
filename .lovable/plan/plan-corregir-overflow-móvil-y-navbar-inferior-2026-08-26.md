# Plan: corregir overflow móvil y navbar inferior

## Diagnóstico confirmado

- En `/m/usuarios`, el documento mide aproximadamente **409 px** de ancho aunque el viewport útil mide **378 px** y el contenido interior solo **346 px**.
- La causa principal es la rejilla de miembros: su columna implícita conserva un mínimo basado en el contenido (`auto`), y las `MemberCard` terminan midiendo cerca de **393 px**. La fila de nombre + badge de estado y el contenido interno contribuyen a ese ancho mínimo; por eso se cortan el badge, los correos y el borde derecho de las tarjetas.
- Los correos ya usan elipsis, pero esa protección no funciona correctamente mientras sus ancestros no puedan encogerse.
- `ModuleTabs` ya permite desplazamiento horizontal interno, pero su contenedor debe aislar ese ancho para que la tira nunca ensanche el documento.
- La navbar móvil ya usa `position: fixed`; el overflow horizontal hace que se perciba desplazada. Además, hoy no incorpora `env(safe-area-inset-bottom)` y el contenido usa un padding inferior fijo que no contempla esa zona.

## Cambios

1. **Contener Usuarios al ancho móvil**
   - Cambiar la rejilla de miembros a columnas reducibles (`minmax(0, 1fr)`) y añadir `min-w-0`, `w-full`, `max-w-full` y `box-border` en los límites necesarios.
   - Hacer que la cabecera de cada tarjeta use una estructura móvil segura: área de texto reducible y badge fijo, con nombre truncado y badges secundarios con wrap.
   - Mantener correo, categoría y cargo con elipsis o salto controlado, sin permitir que definan el ancho mínimo de la tarjeta.
   - Ajustar el bloque de filtros/contador si alguna combinación de texto largo intenta forzar ancho adicional.

2. **Aislar las pestañas superiores**
   - Limitar el wrapper de `ModuleTabs` al ancho disponible.
   - Conservar scroll horizontal únicamente dentro de la tira de pestañas cuando no quepan todas, sin trasladarlo a `body` ni cortar la pestaña activa de forma inaccesible.

3. **Fijar correctamente la navbar móvil**
   - Mantenerla fija a `bottom: 0` y ancho de viewport, independiente del contenido horizontal.
   - Añadir padding inferior con `env(safe-area-inset-bottom)`.
   - Ajustar el padding inferior del layout con la altura real de la barra más el safe-area, para que el último elemento pueda verse y tocarse.
   - No alterar la navegación de escritorio.

4. **Revisar el patrón en otros módulos**
   - Auditar Plantel y las tarjetas/listas móviles que combinan texto, badges y acciones.
   - Aplicar el mismo patrón de columnas reducibles y `min-w-0` solo donde exista el mismo riesgo, sin cambiar su diseño ni funcionalidad.

## Verificación

- Probar `/m/usuarios` en el viewport móvil actual y confirmar `scrollWidth === clientWidth` para página y layout.
- Verificar nombres y correos largos, badges de estado/rol, filtros y toda la tira de pestañas.
- Hacer scroll hasta el final y confirmar que la navbar permanece visible, alineada y fuera del home indicator, y que no tapa el último elemento.
- Revisar Plantel y los módulos con tarjetas similares en móvil, además de una comprobación de escritorio para evitar regresiones.

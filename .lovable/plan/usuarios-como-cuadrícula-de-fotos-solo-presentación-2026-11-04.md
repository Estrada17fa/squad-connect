# Usuarios como cuadrícula de fotos (solo presentación)

Solo cambia el diseño de `src/components/admin/users/` y las rutas `/administracion/usuarios*`. No se tocan funciones del servidor, datos, permisos, flujos ni `/m/usuarios`.

## 1. Encabezado
- "‹ Administración", título "Usuarios" y tres íconos grises a la derecha: lupa (abre búsqueda por nombre/correo), "+" (va a Nuevo), "⋯" (menú: Roles y permisos, Actividad, Filtrar por categoría).
- Se quitan el botón flotante y el botón de crear al final.

## 2. Pestañas en la URL
- `?tab=staff|jugadores|bajas` con conteo en gris ("Staff 10"), subrayado verde igual a Coordinación.
- Staff = todos los roles no Jugador; Bajas = dados de baja.
- Roles y Actividad salen de las pestañas y pasan a páginas propias desde "⋯" (`/administracion/usuarios/roles` y `/administracion/usuarios/actividad`).

## 3. Alertas
- Líneas sin fondo con punto rojo ("N sin categoría · no ve nada en la app") o ámbar ("N aún no entran a la app") y "Ver" a la derecha; solo si hay casos.
- Cuentan todo el club; al tocar, se filtra la cuadrícula (`?alerta=sin_categoria|sin_entrar`), cambia a la pestaña adecuada (o muestra todas si hay de ambas) y la línea pasa a "Quitar filtro".

## 4. Cuadrícula
- 2 columnas en celular, 4–5 en escritorio. Tarjeta sin borde, radio 14 px, foto ~1:1 con degradado; sin foto: silueta gris con iniciales.
- Nombre corto (nombre + primer apellido) 13 px; "Rol · categoría" gris 11 px ("Admin · Todas", "Staff · 2 categorías").
- Punto en esquina: rojo sin categoría, ámbar nunca ha entrado.
- Jugadores agrupados por categoría ("PRIMER EQUIPO · 38") con pastilla de dorsal; reutilizo PlayerAvatar si encaja.
- Tocar abre la ficha como hoy.

## 5. Roles y permisos
- Lista monocroma: nombre, "Todas las categorías"/"Por categoría", número de personas y hasta 3 fotos superpuestas, flecha al detalle. "+ Crear rol" como texto verde al final (mismo diálogo actual).

## 6. Alta y edición
- Foto: círculo grande con ícono de cámara.
- Paso 1: Básicos visibles (nombre, apellidos en 2 columnas, correo, teléfono) y "Más datos (opcional)" plegable. Campos de ~44 px con etiqueta pequeña.
- Fecha de nacimiento con selector propio (calendario de la app con selección de año/mes).
- "Siguiente" fijo abajo a todo lo ancho sobre la barra inferior; "Atrás" en texto a su izquierda desde el paso 2.
- Mismo estilo en /editar.

## 7. Ficha del miembro
- Sin colores por rol, foto grande, secciones agrupadas sin borde, acciones delicadas (desactivar, eliminar, restablecer contraseña) en "⋯". Mismo contenido y lógica.

## 8. General
- Se eliminan colores por rol e íconos de color en estas pantallas; el verde queda solo para pestaña activa y acción principal.
- Enlaces: la portada de Administración pasa a usar `?alerta=sin_categoria` y `?alerta=sin_entrar`. Los enlaces viejos siguen funcionando: `?filtro=sin-categoria` / `?filtro=sin-entrar` redirigen al nuevo parámetro, y `?tab=roles` / `?tab=actividad` redirigen a sus páginas nuevas.

## Entrega
Capturas a 375 × 667: Staff con las dos alertas, Jugadores agrupado, una alerta filtrando, menú "⋯", Roles y permisos, pasos 1 (con Más datos abierto), 2 y 3 del alta. No se crea ningún miembro real para las capturas del paso 3 (se detiene antes de guardar).

## Detalles técnicos
- Nuevas rutas: `administracion.usuarios.roles.index.tsx`, `administracion.usuarios.actividad.tsx`; `validateSearch` para `tab`, `alerta`, `q`, `cat` en la lista.
- Nuevos componentes en `src/components/admin/users/`: `UsersHeader`, `UserTabs`, `AlertLines`, `PersonGrid`/`PersonTile`, `RoleRow`, `BirthDatePicker`, `StickyFooterActions`, `MoreFields`.
- Datos siguen saliendo de `useAdminUsers` y del lector de último ingreso existente.

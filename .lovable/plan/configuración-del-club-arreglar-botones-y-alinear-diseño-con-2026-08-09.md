# Configuración del club: arreglar botones y alinear diseño con Usuarios

## Por qué los botones no funcionan

Revisé las reglas de acceso reales de la base de datos y el código de las pestañas. Hay tres causas confirmadas:

1. **Guardar identidad / preferencias / liga**: la regla de escritura del club exige que la persona tenga una membresía con rol base "admin". La página, en cambio, se abre a cualquier "Editor global". Resultado: quien entra por permiso de editor global (sin rol base admin) ve el botón, lo presiona y la actualización no afecta ninguna fila; además el guardado pide una fila de vuelta y truena. Los mensajes de error casi no se ven.
2. **Crear / editar / borrar ubicaciones**: la regla de escritura de ubicaciones exige ser editor de *Agenda* o *Entrenamientos*, no editor global de configuración. Mismo desajuste: el botón existe pero la operación se rechaza.
3. **Eliminar categoría y eliminar ubicación**: usan el cuadro de confirmación nativo del navegador (`confirm`), que el preview embebido bloquea. Se cancela solo y parece que "no hace nada".

## Qué haré

### 1. Permisos (migración de base de datos)
- Permitir actualizar los datos del club a: super admin, rol base admin del club, **o** editor global del módulo Usuarios (mismo criterio con el que se abre la pantalla).
- Permitir crear/editar/borrar ubicaciones también a editor global de configuración, además de los editores de Agenda/Entrenamientos actuales.
- Categorías ya están correctas (editor de Usuarios); no se tocan.

### 2. Botones que sí responden
- Reemplazar los `confirm` nativos por un diálogo de confirmación de la app (Eliminar / Cancelar), en Categorías y Ubicaciones.
- Todos los guardados y borrados: estado de carga en el botón, mensaje de éxito y mensaje de error visible con el motivo real (incluido "no tienes permiso").
- Guardado del club deja de exigir la fila de vuelta, para no fallar por reglas de lectura.

### 3. Diseño igual al módulo Usuarios
Aplico el mismo lenguaje visual en las 4 secciones:
- **Ubicaciones**: buscador + botón "Filtrar" en panel (con contador de filtros activos) + tarjetas tipo tarjeta de persona (mini-mapa/pin, nombre, dirección truncada, chips de uso) y contador de resultados. Al tocar una tarjeta abre una hoja lateral en **modo lectura** con botón "Editar" y "Eliminar".
- **Categorías**: buscador + filtro por rama, tarjetas con chips (rama, nº de miembros), hoja lateral de detalle en lectura con Editar/Eliminar y aviso claro de qué está asignado cuando no se puede borrar.
- **Identidad** y **Preferencias**: bloques de tarjeta con encabezado e icono, campos en filas etiqueta/valor a una columna en móvil, modo lectura primero con botón "Editar" y barra Guardar/Cancelar (mismo patrón que la hoja de Usuarios).
- Sin emojis, solo iconos; chips con `StatusBadge`; fechas con el formato del club.

## Detalles técnicos
- Migración: reemplazar la política `Club admins can update their club` y ampliar `locations_insert/update/delete` con `has_module_editor_any(auth.uid(), 'usuarios')`.
- Archivos: `src/components/admin/ClubIdentityTab.tsx`, `ClubPreferencesTab.tsx`, `ClubLeagueTab.tsx`, `LocationsTab.tsx`, `CategoriesTab.tsx`; nuevo `ConfirmDialog` reutilizable en `src/components/squad/`.
- Reutilizar `DetailSheet`, `StandardCard`, `StatusBadge` y el patrón de `MembersFilters` para no duplicar estilos.

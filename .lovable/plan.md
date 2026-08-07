# Mover el gestor de ubicaciones a Admin

El catálogo de lugares del club es configuración, no algo de la agenda diaria. Se mueve el gestor completo a la zona de administración del club y se quita de donde no corresponde.

## Cambios

### 1. Agenda (`/m/agenda`)
- Se elimina el botón "Ubicaciones del club" y el estado/render del gestor.
- La agenda queda solo con "Nuevo evento", filtro de equipo y lista.

### 2. Admin — nueva pestaña "Ubicaciones"
- En la página de administración del club (`/m/usuarios`, el hub Admin con las pestañas Roles / Miembros / Categorías) se agrega una cuarta pestaña **Ubicaciones**.
- Ahí se lista, crea, edita y elimina el catálogo de ubicaciones guardadas del club (mismo gestor que existe hoy, con su buscador de mapa).
- Visible para todos los que ven la sección; las acciones de crear/editar/eliminar solo para quien tiene permiso de edición en administración (mismo criterio `canEdit` que usan Roles, Miembros y Categorías). Sin permiso, la lista es de solo lectura.

### 3. Formularios (evento, sesión, junta, viaje, hotel)
- El selector de ubicación no cambia: se mantiene la búsqueda en mapa, el catálogo y "Guardar esta ubicación en el catálogo".
- Se quita únicamente el atajo "Ubicaciones" (icono de engrane) del encabezado del selector, que abría el gestor completo dentro del formulario — ese es el acceso al gestor que ahora vive en Admin.

### 4. Verificación
- Se revisa que no quede ningún otro punto de entrada al gestor fuera de Admin.

## Detalles técnicos
- `src/routes/_authenticated/m.agenda.tsx`: quitar import de `LocationsManager`, estado `locationsOpen` y su bloque JSX (e icono `MapPin` si queda sin uso).
- `src/components/calendar/LocationPicker.tsx`: convertir `LocationsManager` en el gestor reutilizable (se mantiene exportado, se puede extraer a un componente propio para Admin con variante embebida en lugar de sheet) y eliminar el botón/estado `managerOpen` del `LocationPicker`.
- `src/routes/_authenticated/m.usuarios.tsx`: agregar `TabsTrigger`/`TabsContent` "ubicaciones" que renderiza el gestor con `clubId` del perfil y `canEdit`.
- Sin migraciones ni cambios en `useLocations.ts` ni en la lógica de resolución de coordenadas.

# Configuración del club en Admin

El catálogo de ubicaciones sale de Usuarios y pasa a una sección nueva "Configuración del club" dentro de Admin, pensada para ajustes administrativos que no son personas ni documentos.

## Cambios

### 1. Usuarios (`/m/usuarios`)
- Se quita la pestaña "Ubicaciones" y su contenido. Usuarios queda con Roles / Miembros / Categorías.

### 2. Nueva página "Configuración del club"
- Nueva página en Admin, en la ruta `/admin/configuracion`.
- Aparece como pestaña "Configuración" en la barra de pestañas del hub Admin, junto a Usuarios, Documentos y (para super admin) Administrar clubes.
- Contiene una pestaña interna "Ubicaciones" con el gestor completo del catálogo del club (listar, crear, editar, eliminar, con buscador de mapa). La estructura de pestañas deja lugar para futuros ajustes del club.

### 3. Permisos
- Solo visible para administradores del club (mismo criterio que el resto de Admin: `base_role` admin o super admin). Sin ese rol, la página muestra "Acceso restringido".
- Crear/editar/eliminar ubicaciones requiere permiso de edición; sin él, la lista es de solo lectura.

### 4. Sin otros accesos
- El gestor no queda accesible desde Agenda, Usuarios ni desde el selector de ubicación de los formularios.
- El `LocationPicker` de evento, sesión, junta, viaje y hotel no cambia: sigue buscando/eligiendo ubicación y guardando en el catálogo.

## Detalles técnicos
- `src/routes/_authenticated/m.usuarios.tsx`: quitar el `TabsTrigger`/`TabsContent` "ubicaciones" y el import de `LocationsTab`.
- Mover `src/components/usuarios/LocationsTab.tsx` a `src/components/admin/LocationsTab.tsx` (mismo componente, sin cambios de lógica).
- Nueva ruta `src/routes/_authenticated/admin.configuracion.tsx`: guard de admin/super admin como en `admin.tsx`, `PageHeader`, `ModuleTabs` con `hubKey="admin"` y `extraActiveKey="admin-config"`, y `Tabs` con "Ubicaciones" renderizando el gestor con `clubId` del perfil, `userId` y `canEdit`.
- `src/components/squad/ModuleTabs.tsx`: añadir pestaña extra "Configuración" (`/admin/configuracion`) cuando el hub es `admin`.
- Sin migraciones ni cambios en `useLocations.ts`, `LocationPicker.tsx` ni en la resolución de coordenadas.

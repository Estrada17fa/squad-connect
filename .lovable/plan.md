# Arreglar el acceso a "Configuración del club" en Admin

La pestaña de Configuración no abre porque la página `/admin` actúa como padre de sus subpáginas pero no deja espacio para renderizarlas: en cuanto se entra a `/admin/configuracion`, la página padre se ejecuta y redirige al primer módulo del hub. Además, la pestaña debe llamarse "Configuración del club".

## Cambios

### 1. Separar la página de Admin de su contenedor
- El archivo actual de Admin pasa a ser el contenido de `/admin` (la pantalla que redirige al primer módulo o muestra el acceso de super admin).
- `/admin` se convierte en un contenedor que simplemente muestra la subpágina activa, de modo que `/admin/configuracion` y `/admin/clubs` puedan abrirse.

### 2. Renombrar la pestaña
- En la barra de pestañas de Admin, la etiqueta pasa de "Configuración" a "Configuración del club".
- El título de la página ya dice "Configuración del club"; se mantiene.

### 3. Verificación
- Abrir Admin, tocar "Configuración del club" y confirmar que carga el gestor de ubicaciones.
- Confirmar que "Administrar clubes" sigue funcionando y que `/admin` sin subruta sigue redirigiendo como hoy.

## Detalles técnicos
- Mover `src/routes/_authenticated/admin.tsx` a `src/routes/_authenticated/admin.index.tsx` con `createFileRoute("/_authenticated/admin/")`, sin cambiar su lógica.
- Nuevo `src/routes/_authenticated/admin.tsx` como layout: `createFileRoute("/_authenticated/admin")` con `component: () => <Outlet />`.
- `src/components/squad/ModuleTabs.tsx`: cambiar `label: "Configuración"` por `"Configuración del club"` en la pestaña `admin-config`.
- Sin cambios de base de datos ni de la lógica de ubicaciones.

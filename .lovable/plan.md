# Corrección de 5 errores de permisos y navegación

Esto solo arregla los 5 puntos. No cambia la escala de 6 niveles, get_my_access, effective_permission, las reglas de la base de datos ni los permisos guardados.

## 1. Viajes
- canManageTripsModule acepta los niveles de lectura y de edición, tanto por categoría como globales.
- El filtro de Coordinación › Viajes sale de useTeamAccess("viajes"), y la edición sigue pasando por canEditTeam.

## 2. Compras y Facturas
- Agregar canAccessExpensesModule y usarla en la página y en AppLayout.
- canEdit queda en editor_categoria o editor_global, o super admin.
- Agregar compras_facturas a la sección Coordinación de Staff.

## 3. Documentos
- Mover Documentos de Admin a Coordinación para Admin, Técnico, Médico y Staff, justo después de Compras.
- Quitar "documentos" de la descripción de admin.index.tsx.

## 4. Tácticas
- Quitar Tácticas de MODULES, ROLE_PAGES, CLUB_ORDER, DEFAULT_PAGE_FOR_MODULE, DEFAULT_ROLE_LEVELS y admin.clubs.tsx. Se queda en el tipo solo si quitarla rompe algo.

## 5. Mes como alias de Agenda
- Mes pasa a NAV_ALIAS_MODULES y usa el permiso de agenda.
- La descripción de Agenda queda como "Lista y vista mensual de eventos".
- m.mes.tsx, agenda.tsx e Inicio usan el permiso de agenda.
- getModuleAccess y canViewModule resuelven el alias.

## Estado y verificación
Los 5 puntos ya están en el código. Al aprobar el plan:
1. Reviso cada archivo contra este documento y corrijo lo que no coincida.
2. Corro las 8 pruebas del documento en el navegador, con usuarios de cada rol.
3. Entrego la lista de archivos tocados y el resultado de cada prueba.

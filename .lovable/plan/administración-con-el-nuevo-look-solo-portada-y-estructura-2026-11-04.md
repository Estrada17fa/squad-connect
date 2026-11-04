# Administración con el nuevo look (solo portada y estructura)

No se toca: base de datos, permisos, Coordinación, ni las pantallas actuales de Usuarios, Torneos y Configuración (siguen abriendo en /admin y /m/usuarios).

## 1. Acceso
- Barra de abajo: se quita Admin; queda Inicio, Agenda, Mi Club, Coordinación.
- Menú del avatar: nuevo "Administrar club" (ícono Shield), visible con la misma condición que hoy muestra Admin.
- Ruta nueva /administracion; /admin sigue funcionando. Enlace discreto "Ver versión actual" al final de la portada.

## 2. Portada /administracion
De arriba a abajo:
1. Encabezado "‹" + "Administración".
2. Tarjeta de identidad (fondo tenue, sin borde): logo completo sin recorte, nombre del club, "Liga Premier · 2026-2027".
3. Tres datos grandes sin cajas: 60 miembros · 2 categorías · 1 torneo en curso.
4. "Atención": lista agrupada de pendientes (mismo componente que Coordinación) con las 3 filas del documento y sus urgencias (ámbar, rojo, gris).
5. "Administrar": 3 tarjetas grandes (1 columna celular, 3 escritorio): Usuarios, Torneos, Club, con ícono, línea corta y dato.
6. Al final, discreto: "Clubes" solo para super admin.

Las tarjetas abren /administracion/usuarios, /torneos, /club: página con el marco de módulo de Coordinación, estado vacío "En construcción" y "Ver versión actual" hacia la pantalla de hoy (/m/usuarios, /admin/torneo, /admin/configuracion).

## 3. Documentos
Se quita la entrada de Documentos dentro de Administración (sin borrar tabla ni datos).

## Entrega
Capturas en 375×667 y escritorio: portada, menú del avatar y barra de abajo con 4 accesos.

## Detalles técnicos
- `src/lib/admin/mockData.ts`: identidad, stats, pendientes, tarjetas (valores de ejemplo).
- Rutas: `_authenticated/administracion.tsx` (layout con Outlet), `administracion.index.tsx`, `administracion.$module.tsx`; cada una con head() propio y la misma guarda `canAccessAdmin`.
- Reutiliza `PendingList`, `ModulePageShell`, `EmptyState` de `src/components/coord`; nuevo `src/components/admin/AdminModuleCard.tsx`.
- Editar `rolePages.ts`/AppLayout para sacar Admin de la barra y agregar el ítem del avatar.
- Regla en AGENTS.md sobre la estructura de /administracion.

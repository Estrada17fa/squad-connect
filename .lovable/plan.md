# Todos los niveles disponibles en cada módulo

Hoy, en la matriz de roles y en los ajustes por usuario, los módulos de ámbito club (inventario, compras y facturas, solicitudes, coordinación interna, usuarios) solo ofrecen 4 opciones: Sin acceso, Vista Jugador, Lector Global y Editor Global. Los de categoría sí muestran los 6.

## Cambio

Todos los módulos, sin excepción, ofrecen los 6 niveles:

1. Sin acceso
2. Vista Jugador
3. Lector Categoría
4. Lector Global
5. Editor Categoría
6. Editor Global

Sin catalogar por ámbito: la misma lista en cada renglón, tanto en la matriz de roles como en la configuración avanzada por usuario. Se conservan los textos de ayuda por nivel (y el de Vista Jugador sigue adaptándose a lo que muestra ese módulo).

Nota: en un módulo de club, "Lector Categoría" y "Editor Categoría" se comportan igual que sus equivalentes globales, porque el contenido no está dividido por categorías. La opción existe para elegirla libremente, pero no cambia lo que la persona ve.

## Detalles técnicos

- `src/lib/permissions.ts`: `levelOptionsFor(key)` deja de ramificar por `scope` y devuelve siempre `PERMISSION_LEVELS`; `coerceLevelFor` queda sin recorte (cualquier nivel guardado es opción válida).
- `RolePermissionsMatrix.tsx` y `UserAdvancedSettings.tsx` no necesitan cambios: ya consumen `levelOptionsFor`.
- Sin migraciones, sin cambios de RLS ni de funciones SQL.

## Cómo verificamos

Abrir Usuarios → Roles y comprobar que inventario, compras, solicitudes, coordinación y usuarios muestran las 6 opciones; guardar `editor_categoria` en uno de ellos y ver que se persiste y se relee igual.

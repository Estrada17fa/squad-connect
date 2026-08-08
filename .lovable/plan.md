# Vista de jugador disponible en todos los módulos

Sí, tu idea funciona con lo que ya existe. No hace falta ninguna tabla nueva.

## Por qué funciona hoy

- La base de datos ya guarda `vista_jugador` como uno de los 6 niveles válidos (es un valor del tipo `permission_level`), y la columna `level` existe tanto en los permisos por rol como en las excepciones por miembro.
- Las reglas de seguridad ya interpretan `vista_jugador` como "lectura, sin editar" y, en los módulos personales, como "solo mis registros" (el chequeo de dueño ya está escrito de forma genérica).
- La única cosa que hoy limita la opción es la interfaz: el selector de nivel esconde `vista_jugador` en los módulos que no están en la lista de "personales" (`salud`, `desarrollo`, `nutricion`) y en los módulos de ámbito club.

Así que esto es un cambio de configuración y de front, no de modelo de datos.

## Qué se cambia

1. **Opción disponible en todos los módulos**
   - El selector de nivel ofrece `Vista jugador` en los 18 módulos (equipo y club).
   - Se ajustan los textos de ayuda para que expliquen qué significa en cada caso.

2. **Definir qué significa "vista jugador" por módulo**
   - Se agrega a la definición de cada módulo un campo descriptivo (`playerView`) con dos variantes:
     - `mine`: solo registros donde la persona es el sujeto (salud, desarrollo, nutrición, plantel/mi ficha, viajes donde va convocado, agenda/mes donde está convocado, solicitudes propias).
     - `team`: contenido de su categoría en modo lectura, sin datos administrativos ni de otras personas (comunicados, torneo, tácticas, entrenamientos, multimedia, documentos si aplica).
   - Esto es solo metadata en el código; sirve para que cada módulo, al construirse o revisarse, sepa a qué vista conectar.

3. **Un solo punto de verdad para los módulos**
   - `useTeamAccess` deja de depender de la lista fija `PERSONAL_MODULES` y pasa a usar el campo `playerView` del módulo, con los helpers ya existentes (`isPlayerView`, `canEdit`).
   - Los módulos que ya lo usan (Salud, Desarrollo) no cambian de comportamiento.

4. **Comportamiento por defecto y seguridad**
   - En `vista_jugador` nunca se muestran botones de crear/editar/borrar ni el FAB.
   - Los módulos que todavía no tienen vista de jugador construida muestran un estado vacío claro ("Aún no hay vista personal para este módulo") en lugar de filtrar mal o mostrar de más.
   - Los valores por defecto de los roles del sistema se mantienen como están; solo cambia lo que un admin *puede* elegir.

## Detalles técnicos

- `src/lib/modules.ts`: nuevo campo `playerView: "mine" | "team" | null` en `ModuleDef`.
- `src/lib/permissions.ts`: `levelOptionsFor` incluye `vista_jugador` siempre; `PERSONAL_MODULES` / `isPersonalModule` se derivan de `playerView === "mine"`.
- `src/hooks/useTeamAccess.ts`: `isPlayerScopedPersonal` usa `playerView` en vez de la lista fija.
- Sin migraciones SQL: enum, columnas y políticas ya soportan el nivel.

## Después de esto

Con la opción disponible en todos los módulos, se puede ir módulo por módulo (los ya construidos: Agenda/Mes, Plantel, Viajes, Solicitudes, Salud, Desarrollo, Entrenamientos, Coordinación, Inventario, Compras) adaptando la vista de jugador en pasos siguientes, sin volver a tocar el modelo de permisos.

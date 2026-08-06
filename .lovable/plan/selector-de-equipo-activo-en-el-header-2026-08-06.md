# Selector de equipo activo en el header

## Qué pasa hoy

La lista de equipos del header se arma solo con las membresías del usuario. Una membresía "todo el club" (sin equipo) produce una sola entrada llamada "Todo el club" cuyo id es nulo, así que el equipo activo queda vacío y los módulos de ámbito equipo (Viajes, Plantel, Calendario) muestran "selecciona un equipo". Además, el selector se oculta por completo para quienes ven todo el club (admin y super admin), por lo que no hay forma de elegir categoría.

## Qué se va a construir

1. **Lista real de equipos**: si el usuario tiene una membresía club-wide, la lista de opciones pasa a ser todos los equipos del club (Primera División, Sub-20, etc.). Si solo tiene membresías a equipos específicos, se listan únicamente esos. Cada opción conserva el rol/puesto que corresponde.

2. **Selector siempre visible** en el header, junto al nombre del club y el avatar, con el mismo estilo de píldora translúcida actual:
   - Varios equipos: dropdown para cambiar entre ellos.
   - Un solo equipo: se muestra fijo (sin dropdown) y queda seleccionado automáticamente.
   - Ningún equipo en el club: no se muestra nada (se mantiene el nombre del club).

3. **Selección por defecto y persistencia**: al entrar, se selecciona el primer equipo disponible; nunca queda vacío. La elección se guarda en el navegador y se restaura al volver, validando que el equipo guardado siga existiendo.

4. **Módulos**: los de ámbito equipo (Viajes, Plantel, Agenda, Mes y demás) reaccionan al cambio sin recargar, porque ya leen el equipo activo del contexto. Los de ámbito club (Coordinación, Solicitudes, Inventario, Compras, Documentos, Usuarios) siguen ignorando el selector, sin cambios.

5. **Permisos**: el cálculo de permisos no cambia de comportamiento para quien ve todo el club (sigue usando la unión de sus membresías); el selector solo define qué datos de equipo se muestran.

## Detalles técnicos

- `src/hooks/useAccess.ts`: agregar una consulta a `teams` del club del perfil y exponer `teamOptions` (equipos reales seleccionables) además de `teams` (membresías, que se sigue usando para roles/permisos). Para usuarios con membresía club-wide, `teamOptions` = todos los equipos del club; si no, los equipos de sus membresías específicas.
- `src/components/squad/AppLayout.tsx`: usar `teamOptions` para el estado `activeTeamId`, inicializando con el valor guardado si es válido y con el primer equipo en caso contrario; renderizar el selector aunque `viewsAllClub` sea verdadero, con variante fija cuando hay un solo equipo. Mantener `getModuleAccess` y `activePermissions` como están para no alterar la navegación.
- Sin cambios de base de datos.

## Verificación

Como admin con acceso a todo el club: el header muestra el selector con Primera División y Sub-20, se puede cambiar entre ellos, y Viajes y los demás módulos de equipo cargan los datos del equipo elegido en vez de pedir "selecciona un equipo".

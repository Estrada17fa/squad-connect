# Arreglar "No tienes categorías asignadas" al volver a entrar

## Qué pasa (confirmado)
- Los datos están bien: Emilio, Sebastián y Connor (Admin) tienen las 2 categorías (Primer Equipo y Equipo Juvenil) y el interruptor "Todas las categorías" encendido. No hay que asignar nada.
- El problema es de la app: al cerrar sesión, la app vuelve a pedir tus accesos justo cuando ya no hay sesión. La respuesta llega vacía (sin perfil) y la app la toma como "sin categorías". Esa respuesta vacía se queda guardada unos minutos, y al volver a entrar la app muestra esa versión vieja en lugar de preguntar de nuevo.
- Se ve en el registro del preview: a las 19:05:54 se cerró sesión y, en ese mismo segundo, la consulta del perfil salió sin sesión y regresó vacía.

## Cambios
1. Al cerrar sesión o entrar con otra cuenta, borrar por completo los accesos guardados, para que al entrar siempre se pidan de nuevo.
2. Si la consulta de accesos no encuentra el perfil (pasa cuando no hay sesión todavía), tratarlo como "cargando / reintentar", nunca como "sin categorías".
3. Mostrar "No tienes categorías asignadas" solo cuando el servidor confirma de verdad que la persona no tiene ninguna membresía. En ese caso no guardarlo: se vuelve a revisar en cada entrada.
4. En esa pantalla, añadir un botón "Volver a revisar" junto a "Cerrar sesión".

## Prueba
- Entrar como Admin, cerrar sesión, volver a entrar en la misma pestaña: debe entrar directo, sin el aviso.
- Revisar que una persona sin membresías sí vea el aviso (con un miembro de prueba que se elimina al final).

## Detalles técnicos
- `useAccess.ts`: si `profileRes.data` es null, lanzar error (reintento) en vez de devolver `empty`; el caso `forbidden` sigue devolviendo vacío pero con `staleTime: 0` para ese resultado (o `removeQueries` al detectar `noMemberships`).
- En el listener de auth de la app (SIGNED_OUT / SIGNED_IN con otro usuario): `queryClient.removeQueries({ queryKey: ["squad-access"] })` (y `clear()` al cerrar sesión), además de deshabilitar la consulta cuando no hay sesión.
- `AppLayout.tsx`: botón "Volver a revisar" que invalida `squad-access`.

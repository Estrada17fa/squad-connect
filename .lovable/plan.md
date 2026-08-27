# Sesión persistente hasta cerrar sesión manualmente

## Paso 1 — Diagnóstico (lo que encontré hoy)

**1. Cliente de autenticación**
Está correcto: `persistSession: true`, `autoRefreshToken: true` y almacenamiento persistente (localStorage en el dominio real; en el preview del editor usa un puente hacia el editor). No es la causa.

**2. Reacción a cambios de sesión**
No existe ningún listener de cambios de sesión en toda la app. Solo hay un `signOut()` manual, en el botón "Cerrar sesión" del menú de avatar. No hay cierres de sesión accidentales por código.

**3. Guardián de rutas — CAUSA MÁS PROBABLE**
El guardián (`_authenticated`) pregunta por la sesión una sola vez, al vuelo, y si en ese instante no hay sesión redirige a login de inmediato. No espera a que la librería termine de leer la sesión guardada ni a que renueve el token, y no muestra estado de carga. En arranque en frío —sobre todo en la app instalada en el celular (PWA) o con red lenta— la respuesta puede llegar vacía por un instante y el usuario acaba en la pantalla de login aunque su sesión siga siendo válida. La pantalla de login además hace una consulta a la red para decidir si te rebota de vuelta, así que si no hay red se queda en login.

**4. Renovación del token en la app instalada (segunda causa real)**
El token de acceso dura ~1 hora y se renueva con un temporizador interno. En iPhone/Android, cuando la app instalada queda en segundo plano, esos temporizadores se congelan; al volver a abrirla el token ya venció y no hay nada que fuerce una renovación inmediata, por lo que la primera comprobación falla → login. Hoy no hay ningún manejo de "volver a primer plano".

**5. Manejo de errores 401**
No hay ningún punto del código que cierre sesión al recibir un error de autorización. Descartado.

**Conclusión:** los usuarios no están perdiendo la sesión; el guardián de rutas los manda a login por estados transitorios (arranque en frío y regreso de segundo plano sin renovar el token).

## Paso 2 — Qué haré

1. **Resolver la sesión antes de decidir.** Un helper único que espera a que la sesión guardada termine de cargarse (incluye el evento de sesión inicial y un intento de renovación) y solo entonces devuelve sesión o "no hay". Con tolerancia a fallos de red: si la renovación falla por conexión, no se considera "sin sesión".
2. **Guardián con estado de carga.** El guardián usa ese helper y muestra el `LoadingState` del proyecto mientras resuelve; redirige a login únicamente cuando ya está resuelto que no hay sesión. Misma lógica en la pantalla de login para no rebotar.
3. **Renovación al volver a primer plano.** Al reactivarse la app (visibilidad / foco / reconexión) se fuerza la renovación del token, para el caso de la PWA en el celular.
4. **Un solo listener central de sesión** en la raíz: refresca el router en inicio/cierre de sesión y en actualización de usuario; ignora renovaciones de token y sesión inicial (para no provocar recargas). Nunca cierra sesión por su cuenta.
5. **Cierre de sesión ordenado** en el botón manual: cancelar consultas, limpiar caché, cerrar sesión y navegar a login reemplazando el historial. Único camino de salida.

## Detalles técnicos

- Nuevo `src/lib/session.ts`: `resolveSession()` — `getSession()` + espera de `INITIAL_SESSION` con tope de tiempo + `refreshSession()` si el token está por vencer; distingue "sin sesión" de "error de red".
- `src/routes/_authenticated/route.tsx`: `beforeLoad` usa `resolveSession()`; `pendingComponent` con `LoadingState`; redirección solo con resultado resuelto.
- `src/routes/auth.tsx`: mismo helper en `beforeLoad`, sin `getUser()` bloqueante.
- `src/routes/__root.tsx`: suscripción única a `onAuthStateChange` filtrada (`SIGNED_IN` / `SIGNED_OUT` / `USER_UPDATED`) con `router.invalidate()`; sin `invalidateQueries` en `SIGNED_OUT`.
- `src/components/squad/AppLayout.tsx`: `cancelQueries` → `clear` → `signOut` → `navigate({ to: "/auth", replace: true })`.
- Sin cambios en permisos, RLS ni lógica de módulos.

## Lo que depende del panel (no del código)

La duración del token de acceso (1 h por defecto), el tiempo de sesión inactiva y la rotación de tokens de refresco son ajustes del proveedor de autenticación que no están expuestos en este proyecto administrado; no puedo cambiarlos desde aquí. La buena noticia: con la renovación automática funcionando bien (puntos 1, 3 y 4) esos valores dejan de importar — la sesión se renueva sola indefinidamente hasta que se cierra a propósito.

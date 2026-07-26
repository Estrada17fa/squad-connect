## Diagnóstico

En los logs de red vi **más de 15 llamadas a `/auth/v1/user`** en apenas 10 segundos mientras navegabas. Cada una es un round-trip al servidor de auth y **bloquea la navegación** antes de que la página empiece a cargar sus datos. Eso es lo que se siente como "cada página tarda en cargar".

### Causa raíz

`src/routes/_authenticated/route.tsx` corre en su `beforeLoad`:

```ts
const { data } = await supabase.auth.getUser();
```

`getUser()` hace una petición HTTP al servidor de Supabase **cada vez** que se entra a una ruta bajo `_authenticated`, y también en cada **preload al pasar el cursor** por los tabs/nav (que agregamos para el prefetch). Multiplicado por hover + navegación real = decenas de llamadas.

Además, cada navegación queda esperando esos ~200–500 ms antes de que los loaders de datos (tareas, plantel, etc.) siquiera arranquen.

## Plan de arreglo (solo rendimiento, sin cambiar features)

1. **Sustituir `getUser()` por `getSession()`** en `_authenticated/route.tsx`.
   `getSession()` es **local** (lee el token de memoria/localStorage), sin round-trip. Sigue redirigiendo a `/auth` si no hay sesión.

2. **Cachear el usuario en el `context` del router** para que rutas hijas no lo vuelvan a resolver. `beforeLoad` retorna `{ user }` una sola vez y las subrutas lo leen de `useRouteContext()`.

3. **Evitar el preload de auth en hover.** Añadir `preload: false` (o gate por `loader`) al `beforeLoad` de `_authenticated` no aplica porque `beforeLoad` siempre corre en preload. La solución real es que sea instantáneo (paso 1) — ya no importa que se dispare en hover porque no toca la red.

4. **Revisar `auth-attacher.ts`**: usa `getSession()` (bien, es local), pero verificar que no haya un `getUser()` colado en otro middleware que se ejecute en cada server-fn.

5. **Verificar** con el panel de red que tras el cambio solo haya 1 llamada a `/auth/v1/user` al inicio de sesión (el refresco automático del SDK), y que la navegación entre módulos sea inmediata.

### Archivos a tocar

- `src/routes/_authenticated/route.tsx` — cambiar `getUser()` → `getSession()`.
- (Opcional) `src/routes/auth.tsx` — el `getUser()` inicial se puede dejar; solo corre una vez al montar `/auth`.

### Fuera de alcance

- No toco `admin.clubs.tsx` ni `invite.$token.tsx`: son llamadas puntuales en handlers, no en cada navegación.
- No cambio lógica de permisos, RLS, ni UI.

### Resultado esperado

Navegación entre módulos y hover sobre tabs deja de disparar `/auth/v1/user`. La carga percibida de cada página baja al tiempo real de sus queries (que ya tienen `staleTime` de 30s y skeletons).
# Navegación por rol — 5 páginas fijas

## Concepto

La navbar siempre tiene 5 páginas fijas: **Home · Agenda · Mi Club · Coordinación · Avatar**. Los 16 módulos actuales se agrupan visualmente dentro de esas páginas. Los permisos siguen siendo por **módulo** (nada cambia en `role_permissions` ni en `user_permission_overrides`); lo nuevo es **dónde** se renderiza cada módulo.

Regla base: si el usuario no tiene acceso a NINGÚN módulo de una página, la página se oculta de la navbar (excepto Home y Avatar, que siempre están).

---

## Mapping por rol de sistema

Cada rol de sistema (Admin, Técnico, Médico, Staff, Jugador) trae un mapping predefinido de qué módulos aparecen en cada página. El mapping vive en código (`src/lib/rolePages.ts`), no en la base de datos — es un default de UI, no una regla de seguridad.

| Página | Admin | Técnico | Médico | Staff | Jugador |
|---|---|---|---|---|---|
| **Home** | hub bento completo | hub del día | disponibilidad plantel | inventario | personal (mi evento, mi viaje) |
| **Agenda** | todo el club | sus equipos | sus equipos | club/equipos | sus eventos |
| **Mi Club** | Plantel, Salud, Desarrollo, Tácticas, Torneo, Comunicados, Multimedia, Uniformes | Plantel, Desarrollo, Tácticas, Torneo, Comunicados, Multimedia | Plantel (ficha médica), Salud, Comunicados, Multimedia | Plantel (básico), Comunicados, Multimedia, Uniformes | Plantel (compañeros), Mi Desarrollo, Torneo, Comunicados, Multimedia |
| **Coordinación** | Tareas, Juntas, Solicitudes, Inventario, Compras, Viajes | Tareas, Juntas, Solicitudes, Viajes | Tareas, Juntas, Solicitudes | Tareas, Juntas, Solicitudes, Inventario, Viajes | **"Mis Solicitudes"** (página distinta) |
| **Avatar** | Perfil + Administración (Usuarios, Documentos, Config) | Perfil | Perfil | Perfil | Perfil (con ficha médica propia embebida) |

**Caso Jugador — Coordinación**: en la navbar, en lugar de "Coordinación" el jugador ve "Mis Solicitudes" (mismo slot, distinto nombre y contenido: solo puede crear y seguir solicitudes propias, no ve tareas ni juntas ni gestión).

**Caso Jugador — Salud**: no aparece como módulo en "Mi Club". Su información médica personal se muestra dentro de "Avatar › Mi Perfil".

---

## Roles nuevos del club (Analista, Prensa, etc.)

Al crear un rol nuevo en `/m/usuarios`, el admin elige de qué **rol base** hereda el mapping de páginas (Admin/Técnico/Médico/Staff/Jugador). Se agrega una columna `base_role` a `roles`:
- Es solo un puntero al mapping de UI (qué módulo va en qué página).
- Los **permisos reales** (qué módulos ve y con qué nivel) se configuran normal en la matriz de permisos del rol — el rol base no otorga permisos, solo define layout.
- Si el rol nuevo activa un módulo que su rol base no tenía mapeado, ese módulo cae por defecto en la página que le corresponde según el catálogo global (ver siguiente sección).

## Catálogo global módulo → página

Además del mapping por rol, cada módulo tiene una "página destino" por defecto en `src/lib/modules.ts` (nuevo campo `defaultPage`). Sirve de fallback cuando:
- Un rol custom activa un módulo que su rol base no incluye.
- Se agrega un módulo nuevo al catálogo y aún no está en los mappings.

Defaults:
- **Mi Club**: plantel, salud, desarrollo, tacticas, torneo, comunicados, multimedia, uniformes.
- **Coordinación**: coordinacion_interna (Tareas/Juntas), solicitudes, inventario, viajes, documentos financieros.
- **Avatar**: usuarios, documentos.

## Overrides

`user_permission_overrides` sigue trabajando exactamente igual — a nivel módulo+equipo. Si un override deja a un usuario sin acceso a todos los módulos de una página, esa página se oculta automáticamente. No se agregan overrides a nivel página.

---

## Alcance de este plan

Este plan es **solo** la definición de arquitectura de navegación. No incluye construir los módulos que aún no existen (Viajes, Inventario, Compras, Documentos, Solicitudes, etc.). Cuando se construyan, ya sabrán a qué página pertenecen.

## Cambios técnicos

1. **`src/lib/modules.ts`**: agregar `defaultPage: "home" | "agenda" | "club" | "coordinacion" | "avatar"` a cada `ModuleDef`.
2. **`src/lib/rolePages.ts`** (nuevo): mapping `Record<SystemRole, Record<Page, ModuleKey[]>>` con la tabla de arriba, más helper `resolvePagesForUser(role, accessibleModules)` que combina el mapping del rol base con el catálogo global.
3. **Migración DB**: `ALTER TABLE roles ADD COLUMN base_role TEXT` (nullable; los roles de sistema se rellenan con su propio nombre en minúsculas). Sin cambios a RLS.
4. **`AppLayout.tsx` / `BottomNav`**: reemplazar la navbar dinámica actual (Home + Calendario + 2 módulos + Más) por las 5 páginas fijas. Ocultar página si su lista de módulos resultante está vacía.
5. **Rutas nuevas** (placeholders con `EmptyState` por ahora):
   - `/agenda` (envuelve el calendario existente + tipos de evento)
   - `/mi-club` (grid de módulos según rol)
   - `/coordinacion` (para Jugador: componente `MisSolicitudes`; resto: pestañas existentes + placeholders)
   - `/yo` (perfil +, para Admin, sub-sección Administración)
6. **`CreateRoleDialog`** (en `usuarios`): agregar selector "Basado en" con los 5 roles de sistema cuando se crea un rol custom.
7. **Módulos actuales** (`/m/$module`): siguen funcionando como deep-links internos; las páginas nuevas los enlazan/embeden. No se rompe nada existente.

Home, Agenda-embed-Calendario y la vista "Mi Perfil" propia del jugador (con su ficha médica) se dejan como placeholders esta iteración — se construyen en un plan siguiente.


# Reporte + Plan: pestaña Viajes en Agenda, matriz de permisos y menús que se recorren

## 1. Reporte del bug de Viajes

Lo que verifiqué antes de escribir esto:

- **La fila de permiso SÍ existe en la base.** `role_permissions` tiene `viajes` para los 5 roles (Admin `editor_global`, Técnico `lector_categoria`, Médico `lector_categoria`, Staff `editor_categoria`, Jugador `sin_acceso`). No es el caso de "falta la fila" que pasó con `partidos`.
- **La causa real de que la pestaña no aparezca:** en `src/lib/permissions.ts` existe `MANAGEMENT_ONLY_MODULES = ["viajes"]`, y `canSeeModule()` exige para ese módulo un nivel mínimo de **lector global**. Como `accessibleModules` se construye con `canSeeModule`, Viajes queda fuera para Técnico, Médico, Staff y Jugador. La pestaña "Viajes" de Agenda (`ModuleTabs`, extra `agenda-viajes`) se condiciona exactamente con `accessibleModules.includes("viajes")`, y la propia página `agenda-viajes` usa la misma condición para mostrar "Sin acceso". Resultado: solo la ve un admin / lector global. Para el Jugador se suma que su nivel por defecto es `sin_acceso`.
- **El `module_key` está alineado:** la pestaña, el hook `useTrips` y las políticas de la base usan `viajes`. No hay desalineación de clave.
- **Matriz de permisos:** ambas pantallas (permisos por rol y override por usuario) recorren todos los módulos y colocan Viajes en el grupo "Coordinación". Sin embargo, las filas de un grupo **solo se renderizan si el grupo está activo** (algún módulo con nivel distinto de "sin acceso"); con el grupo apagado no se puede elegir el nivel de ningún módulo de esa página, incluido Viajes. Eso explica que "no aparezca como opción" en roles cuya Coordinación está apagada.

## 2. Qué voy a cambiar

**A. Separar "ver mi viaje" de "gestionar viajes"**

- Quitar Viajes de la regla de módulo solo-gestión, y en su lugar distinguir por destino:
  - El módulo de gestión en Coordinación (`/m/viajes`) sigue requiriendo nivel de lector global o superior (misma regla de hoy, ahora expresada como una comprobación propia del hub de Coordinación).
  - La pestaña **Viajes en Agenda** aparece con **cualquier** nivel de lectura (`vista_jugador` incluido) o si la persona es viajero convocado.
- La pestaña de Agenda ya reparte el contenido correctamente: staff con permiso de edición del equipo ve el viaje completo (Ida/Regreso/General) y el resto ve solo su itinerario (`MyTripView`: su citación, vuelo, transporte, hotel/habitación, equipaje y pase de abordar). Se conserva `readOnly`.

**B. Nivel por defecto del rol Jugador en Viajes**

- Migración que cambia el valor por defecto de `viajes` para el rol Jugador de `sin_acceso` a `vista_jugador` en todos los clubes, respetando overrides manuales por usuario. Con eso el jugador ve su pase/itinerario en Agenda, sin acceder al módulo de gestión.

**C. Matriz de permisos siempre configurable**

- En permisos por rol y en override por usuario: cuando un grupo (página) está apagado, permitir desplegarlo para elegir el nivel de sus módulos, en lugar de ocultar las filas. Así Viajes (y cualquier módulo de una página apagada) siempre se puede configurar con sus 6 niveles.

## 3. Verificación de menús (punto 2 del pedido)

Auditoría + prueba real en el navegador, sin cambios previos asumidos:

- Revisar que barra inferior, pestañas de Mi Club, Coordinación y Admin se construyan todas desde la misma fuente (`visiblePages` + predicado de acceso), sin `display:none` ni entradas fijas.
- Probar con una cuenta de prueba quitando permisos a varios módulos y confirmar: el módulo desaparece de todo menú, las pestañas restantes se recorren sin hueco, y ninguna pestaña queda apuntando a una ruta sin acceso. Si una página se queda sin módulos, no debe ocupar lugar en la navegación.
- Reportar cualquier caso donde un módulo quitado siga apareciendo o quede hueco, y corregirlo en el mismo paso.

## 4. Detalle técnico

- `src/lib/permissions.ts`: eliminar `viajes` de `MANAGEMENT_ONLY_MODULES` y añadir un helper explícito para el acceso al módulo de gestión de viajes.
- `src/lib/rolePages.ts` / `useAccess.ts`: `viajes` entra en `accessibleModules` con cualquier nivel de lectura; el chip de Coordinación se filtra con el helper de gestión.
- `src/components/squad/ModuleTabs.tsx`: la pestaña extra `agenda-viajes` se condiciona a lectura de `viajes` (o viajero), no a `accessibleModules`.
- `src/routes/_authenticated/agenda-viajes.tsx`: misma condición de acceso; sin cambios de lógica de datos (RLS de `trips` decide qué filas llegan).
- `src/components/usuarios/RolePermissionsMatrix.tsx` y `UserAdvancedSettings.tsx`: grupo colapsable en lugar de filas ocultas.
- Migración SQL: `update role_permissions set level='vista_jugador'` para `module_key='viajes'` en roles con `base_role='jugador'` que sigan en el valor por defecto.

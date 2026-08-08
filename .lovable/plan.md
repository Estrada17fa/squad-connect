# Rediseño de Admin (Usuarios y Roles) al sistema de 6 niveles

Solo interfaz y escritura de datos. No se toca ninguna política RLS ni función SQL: ya están migradas y leen `level`. El objetivo es que la pantalla deje de hablar el idioma viejo (`read` / `editor` / `approver`) y hable el nuevo.

## Qué está viejo hoy (verificado)

- `m.usuarios.tsx` → la matriz de roles guarda con la lista `LEVELS` de 4 opciones viejas y traduce con `legacyToLevel`, así que un rol nunca puede quedar en `lector_global` ni `editor_global` desde la interfaz.
- `MembersTab.tsx` → el panel de ajustes por usuario lee y escribe `access_level` (misma escala vieja de 4 opciones) sobre `user_permission_overrides`.
- El bloque "Aprueba solicitudes de" por rol ya existe y funciona con `role_request_approvals`; los overrides por persona ya existen con `request_type_user_overrides`. Solo falta la advertencia de "no tendrá efecto si el rol no es editor" y mostrar el estado efectivo.

## Estructura nueva de la página Usuarios

Dos pestañas visibles: **Miembros** (principal) y **Roles**, y dentro de Roles la matriz queda detrás de un desplegable "Configuración avanzada de roles".

### Pantalla 1 — Crear / editar usuario

`MemberForm` ya está organizado por secciones (Datos básicos / Rol / Categorías y puesto / Datos deportivos solo para Jugador) y se conserva tal cual. Los únicos cambios aquí:

- La ficha del usuario (hoja de detalle) gana un bloque plegable **"Configuración avanzada"**, cerrado por defecto, con dos apartados: permisos por módulo y aprobador de solicitudes.
- Las acciones ya construidas de Editar / Dar de baja / Reactivar / Eliminar se mantienen en el encabezado de la ficha.

### Configuración avanzada por usuario (permisos)

Lista por módulo, agrupada por página como hoy. Cada renglón muestra:

- El nivel **"Por su rol"** como texto base (calculado desde `role_permissions.level` del rol de esa membresía).
- Un selector con los niveles válidos según el tipo de módulo.
- Si hay fila en `user_permission_overrides`, se marca **"Ajustado manualmente"** y aparece la acción **"Volver al valor del rol"**, que borra la fila.

Ámbito: el panel se abre desde una membresía concreta, así que el override se escribe con el `team_id` de esa membresía (o `NULL` para la membresía de todo el club) — igual que hoy, sin cambio de modelo.

Escritura: solo la columna `level`. `access_level` se sigue rellenando con el equivalente grueso (`sin_acceso`→none, lectores→read, editores→editor) para no dejar filas incoherentes con datos históricos, pero ninguna decisión se toma con esa columna.

### Configuración avanzada por usuario (aprobador)

Reutiliza `useMemberApprovals` / `useSetApproverOverride`. Por cada uno de los 8 tipos:

- Estado efectivo: "Aprueba por su rol", "Ajustado: sí", "Ajustado: no", "No aprueba".
- Acciones: conceder, quitar, o volver al valor del rol (borrar el override).
- Aviso cuando el nivel efectivo de la persona en el módulo del tipo no llega a editor: la designación queda guardada pero no aprueba nada.

### Pantalla 2 — Matriz de roles (avanzada)

- Chips para elegir rol arriba; debajo, los módulos agrupados por página.
- Selector de nivel por módulo, con las opciones que correspondan:
  - Módulos personales (salud, desarrollo, nutricion) y de categoría (plantel, entrenamientos, tacticas, torneo, comunicados, documentos, viajes, agenda, mes, multimedia): los 6 niveles.
  - Módulos de club (inventario, compras_facturas, solicitudes, coordinacion_interna, usuarios): solo Sin acceso / Lector / Editor, que se guardan como `sin_acceso`, `lector_global`, `editor_global` (en un módulo de club la distinción categoría/global no significa nada, y así la RLS de club lo lee correcto).
- Los niveles de edición se resaltan visualmente.
- Botones **Guardar cambios** y **Restaurar valores por defecto** (los defaults por rol base que se poblaron en la Parte 1).
- Debajo, el bloque "Aprueba solicitudes de [tipos]" del rol, con la advertencia por tipo cuando el rol no tiene nivel editor en el módulo correspondiente.

Etiquetas exactas: Sin acceso, Vista Jugador, Lector Categoría, Lector Global, Editor Categoría, Editor Global; en módulos de club: Sin acceso, Lector, Editor.

## Acceso a la pantalla

Igual que hoy: super admin o nivel de edición en el módulo `usuarios`. Sin ese nivel la página se ve en solo lectura y los guardados quedan deshabilitados.

## Detalles técnicos

- `src/lib/permissions.ts`: agrego `levelOptionsFor(moduleKey)` (6 niveles vs 3 de club) y `CLUB_LEVEL_LABEL`, para que matriz y ficha usen exactamente la misma fuente. `legacyToLevel` deja de usarse para escribir y queda solo para leer datos antiguos.
- `src/routes/_authenticated/m.usuarios.tsx`: `PermissionsMatrix` pasa a trabajar sobre `level`; desaparece la constante `LEVELS` vieja y el tipo `AccessLevel` de esta pantalla.
- `src/components/usuarios/MembersTab.tsx`: el panel de overrides consulta `role_permissions.level` y `user_permission_overrides.level`, y separa visualmente base del rol vs ajuste.
- Nuevos componentes para que los archivos no crezcan más: `src/components/usuarios/RolePermissionsMatrix.tsx`, `src/components/usuarios/UserAdvancedSettings.tsx` y `src/components/usuarios/ApproverTypesEditor.tsx` (compartido entre rol y usuario).
- Tras cualquier guardado se invalidan `squad-access`, `club-role-permissions`, `user-overrides`, `role-request-approvals` y `approver-overrides`, de modo que la navegación y los botones de los afectados se recalculan sin recargar.

## Cómo verificamos

- Guardar `editor_global` a un rol desde la matriz y confirmar en la base que la fila quedó con ese `level` exacto.
- Poner un override a una persona, ver la etiqueta "Ajustado manualmente", y que `effective_permission` devuelva ese nivel; quitarlo y que vuelva al del rol.
- Un rol sin nivel editor en salud marcado como aprobador de médicas: la interfaz avisa y `can_approve_request_type` sigue devolviendo falso.
- Recorrido con sesión real de admin y de un rol sin acceso a `usuarios`.

## Fuera de alcance

Cambios de RLS, funciones SQL o columnas nuevas. No se elimina `access_level` en esta entrega.

# Módulo Usuarios con el nuevo look

Rediseño completo de Usuarios dentro de Administración, reutilizando las funciones actuales. Sin cambios en base de datos, reglas, get_my_access ni effective_permission. /m/usuarios sigue igual, con enlace "Ver versión actual".

## Lo verificado
- Todas las funciones de members.functions.ts existen (alta, edición, baja/reactivar, eliminar, referencias, membresías, todas las categorías).
- "Restablecer contraseña" reutiliza updateClubMember (ya cambia la contraseña y marca must_change_password); no hace falta función nueva.
- membership_audit_log se puede leer con las reglas actuales por quien edita Usuarios en su club (y super admins). Quien solo tiene Ver en Usuarios verá "Actividad" vacía con aviso.

## Pantallas
1. **/administracion/usuarios?tab=miembros|roles|actividad&filtro=sin-entrar|sin-categoria**
   - Miembros: pastillas de rol con conteo, lupa y filtro (categoría, Activos/Bajas), grupos "Staff y cuerpo técnico" y "Jugadores", filas con foto/iniciales, nombre corto, categorías·rol, punto ámbar/rojo, botón "+" persona, estado vacío por filtro.
   - Roles: tarjetas por rol (personas, etiqueta "Todas las categorías"), botón crear rol.
   - Actividad: línea de tiempo agrupada por día con ícono, frase corta, autor y hora.
2. **/nuevo**: 3 pasos (Datos · Categorías · Acceso) con validación por paso, contraseña temporal generada (ver/regenerar), pantalla "Listo" con Copiar acceso, WhatsApp, Ver ficha, Crear otro. Sin datos deportivos (se conservan en la base).
3. **/$userId**: ficha a página completa con menú ⋯, portada, Llamar/WhatsApp/Correo, Datos, Categorías y rol (interruptor + filas editables + agregar), Acceso con restablecer, Permisos ("Como su rol" / "N excepciones" › Ajustar), enlace a Plantel si es jugador, últimos 5 cambios.
4. **/$userId/editar**: datos personales con el nuevo look.
5. **/$userId/permisos**: tabla de UserAdvancedSettings con nuevo look (Sin acceso · Ver · Editar, "Volver al rol").
6. **/roles/$roleId**: interruptor por defecto, matriz con control segmentado agrupada como la navegación ("Solo lo suyo (temporal)" solo donde ya exista), "Aprueba solicitudes de".
7. **Portada de Administración**: conteo real de activos, filas reales "Sin categoría" y "Sin entrar a la app" que abren la lista filtrada; "Jugadores sin ficha deportiva" sigue de ejemplo; tarjetas "Administrar" más bajas para verse sin scroll en 375×667.

## Detalles técnicos
- Nuevas rutas: `administracion.usuarios.tsx` (layout con Outlet), `.index.tsx`, `.nuevo.tsx`, `.$userId.tsx` (layout) + `.$userId.index/editar/permisos.tsx`, `.roles.$roleId.tsx`. La ruta genérica `administracion.$module` deja de cubrir "usuarios".
- Componentes en `src/components/admin/users/` (MemberRow, RolePills, StepIndicator, AccessReadyScreen, SegmentedLevel, ActivityTimeline, InfoList). La lógica de RolePermissionsMatrix, UserAdvancedSettings y ApproverTypesEditor se extrae a hooks compartidos para que ambas pantallas usen las mismas reglas; la pantalla actual no cambia visualmente.
- Única función nueva, solo lectura: `getMembersLastSignIn` (requiere ver Usuarios, filtra por club, devuelve last_sign_in_at vía API administrativa). Si falla, se usa must_change_password ("Aún no entra" / "Ya entró").
- Contraseña temporal con crypto.getRandomValues; mensaje de WhatsApp con enlace https://squadlcu.app, correo y contraseña.
- Validaciones existentes intactas (escalada, último admin, confirmaciones, revisión de referencias).

## Pruebas
Las 7 pruebas del documento con un usuario de prueba (alta, WhatsApp, primer ingreso, membresías, todas las categorías, excepción, restablecer, baja/reactivar/eliminar, filtros, matriz de rol, /m/usuarios intacta, sin errores). Capturas en celular de lista, alta (3 pasos + Listo), ficha, permisos, Roles y Actividad.

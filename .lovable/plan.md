# Plan: Homologar posición del botón "Nueva solicitud" en Solicitudes

## Objetivo
Mover el botón de agregar solicitud para que quede directamente arriba de las chips "Mis solicitudes" / "Todas", igual que en los demás módulos. Sin cambiar lógica, permisos ni datos.

## Cambio concreto
En `src/routes/_authenticated/m.solicitudes.tsx`:
1. Renderizar el banner de "solicitudes pendientes por aprobar" (si aplica) **antes** del botón "Nueva solicitud".
2. Renderizar el botón "Nueva solicitud" inmediatamente antes de `<RequestFilters />`, de modo que las chips "Mis solicitudes" / "Todas" aparezcan justo debajo.
3. Mantener el ancho completo del botón (`w-full glow-primary`) y su comportamiento actual (`openCreate`).

## Verificación
- Abrir `/m/solicitudes` y confirmar visualmente que el orden es:
  1. Pestañas de módulo + PageHeader
  2. Banner de aprobaciones (si hay pendientes)
  3. Botón "Nueva solicitud"
  4. Chips "Mis solicitudes" / "Todas"
  5. Buscador + filtro
- Validar que el botón sigue abriendo el selector de tipo de solicitud.

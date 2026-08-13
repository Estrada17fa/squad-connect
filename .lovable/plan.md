# Comunicados: poder eliminar desde la ficha

Hoy quien puede publicar ya puede editar un comunicado, y el botón "Eliminar" solo existe dentro del formulario de edición: hay que entrar a editar para borrar, no hay confirmación y al borrar la ficha de lectura se queda abierta con un comunicado que ya no existe.

## Qué cambia

- En la ficha del comunicado (la que se abre al tocarlo), quien puede editarlo verá también **Eliminar comunicado**, al mismo nivel que el botón de editar.
- Al pulsarlo aparece un diálogo de confirmación ("Esta acción no se puede deshacer"), igual que en Viajes.
- Al confirmar: se borra el comunicado y su adjunto, se cierra la ficha y aparece el aviso "Comunicado eliminado".
- Dentro del formulario de edición, el botón "Eliminar" también pasa por la misma confirmación y cierra tanto el formulario como la ficha de lectura.
- Quién puede borrar no cambia: exactamente los mismos que ya pueden editar (autor, editor global, o editor de todas las categorías destinatarias). Las reglas de la base de datos ya lo permiten; no se toca nada del backend.

## Detalle técnico

- Mover `DeleteAction` de `src/components/viajes/logistica/DeleteAction.tsx` a `src/components/squad/DeleteAction.tsx` (componente compartido) y reexportarlo desde la ruta antigua para no romper Viajes.
- `AnnouncementDetailSheet.tsx`: usar `useDeleteAnnouncement()` y renderizar `<DeleteAction>` en `headerActions` (o como acción al pie del contenido) solo cuando `canEdit`; en `onDeleted` llamar `onOpenChange(false)`.
- `AnnouncementFormDialog.tsx`: sustituir el botón "Eliminar" actual por `DeleteAction`, y añadir una prop opcional `onDeleted` que la ficha use para cerrarse.
- Sin migraciones ni cambios de RLS.

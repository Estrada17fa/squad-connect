# Módulo Tareas (Coordinación › General)

Reutiliza la lógica actual de tareas (responsables, checklist, avisos de asignación y de cambio de fecha) con el nuevo look de Coordinación. Juntas queda como pestaña que lleva a la pantalla actual.

## Base de datos (solo lo permitido, aditivo)
- Tabla de comentarios de tarea: tarea, autor, texto (puede ir vacío si trae foto), foto opcional, marca "Evidencia", creado y editado. Se borra junto con la tarea.
- Columna "Pide foto al completar" en tareas (falso por defecto).
- Almacenamiento privado `task-evidence` (fotos en carpeta por tarea).
- Reglas (usan las mismas funciones que ya protegen tareas):
  - Ver comentarios/fotos: quien puede ver la tarea.
  - Comentar/subir foto: quien puede editar la tarea o está asignado.
  - Editar: solo el autor. Borrar: el autor o un editor de la tarea.
- Aviso al comentar: a responsables y creador, excepto el autor, con el sistema de avisos existente.
- Bloqueo en la base: una tarea que pide foto no puede pasar a "Hecha" sin al menos un comentario marcado como evidencia con foto (además del aviso en pantalla).
- Ninguna otra regla cambia.

## Rutas
- `/coordinacion/general/tareas`: pestañas Tareas · Juntas (Juntas lleva a la pantalla actual).
- `/coordinacion/general/tareas/$taskId`: ficha completa.
- Los avisos de tareas (nuevos y viejos) abren la ficha nueva.
- `/m/coordinacion_interna` no se toca.

## Lista
- Encabezado "‹ General", "Tareas y juntas", lupa, filtro y "+".
- Control Mías · Todas (por defecto Mías).
- Grupos con conteo: Vencidas (en rojo), Hoy, Esta semana, Después, Sin fecha y Hechas (plegada, últimas 2 semanas, "Ver anteriores").
- Fila: círculo para completar (si pide foto, abre cámara/galería primero), título, fecha relativa + categoría ("Todo el club"), caras (3 + "+N"), avance del checklist, cámara si pide foto, comentarios con número y bandera solo si es Alta.
- Filtro en hoja: categoría, responsable, prioridad y estado (incluye En pausa).
- Vacío: "Nada pendiente. ¡Buen trabajo!".

## Crear
- Hoja corta: título, responsables (varios, con fotos), fecha límite con atajos Hoy/Mañana/Viernes, "Crear".
- "Más detalles": descripción, prioridad Baja/Media/Alta, categoría o Todo el club, pasos del checklist y "Pedir foto al completar".

## Ficha
- "‹ Tareas" y "⋯" (Editar, Duplicar, Eliminar con confirmación).
- Título; estado: Por hacer · En proceso · En pausa · Hecha.
- Filas: responsables, fecha límite, prioridad, categoría, pide foto, creada por y cuándo.
- Descripción; checklist (palomear, agregar, reordenar con permiso).
- Evidencia: miniaturas que se abren en grande; "Hecha" sin foto muestra "Sube una foto para completar".
- Comentarios: foto, nombre, hora, texto y fotos; etiqueta "Evidencia"; caja de texto con cámara.
- Los responsables pueden cambiar estado, palomear, comentar y subir evidencia sin tener Editar.

## Portada de General e Inicio
- Pendientes › Tareas y el globo del mosaico con datos reales: mis tareas no hechas, contexto "N vencen hoy"/"N vencidas", urgencia roja o ámbar.
- Inicio › "Mis pendientes" arriba: lista corta con círculo para completar (con foto si la pide) y "Ver todas".

## Pruebas
- Crear una tarea rápida y otra completa, asignadas a un usuario de prueba.
- No existe "Ver como" en la app: entraré directamente con la sesión de ese usuario para revisar el aviso, Inicio, comentar, el bloqueo sin foto, subir foto y completar.
- El creador recibe el aviso del comentario; un usuario sin acceso no ve comentarios ni fotos.
- Avisos viejos abren la ficha nueva.
- Borrar al final tareas, comentarios, fotos, avisos y usuario de prueba; revisar sin errores de TypeScript.
- Capturas en 375×667 de lista, creación, ficha, bloqueo y portada.

## Detalles técnicos
- Componentes nuevos en `src/components/coord/tareas/*`; hooks existentes de `useCoordinacion` ampliados con comentarios y evidencia.
- Fotos con URL firmada temporal; políticas de almacenamiento validan la tarea por la carpeta.
- Aviso de comentario por trigger que llama a `notify_users` con el módulo `coordinacion_interna`; `notificationTargets` dirige esos avisos a la ficha nueva.
- Nueva regla en `AGENTS.md` sobre la ubicación del módulo.

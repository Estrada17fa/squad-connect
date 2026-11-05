# Ficha deportiva en el alta de jugadores

Sin cambios en la base de datos. Se reutilizan las funciones actuales de alta y de membresías; la ficha es la misma que se ve en Plantel.

## 1. Paso "Ficha deportiva"
- Aparece entre Categorías y Acceso solo si alguna categoría elegida tiene rol Jugador. La barra pasa a 5 pasos ("Paso 4 de 5 · Ficha deportiva"); para no jugadores sigue en 4.
- Una sección por categoría de jugador (título = nombre de la categoría) con: dorsal, posición (POR / DEF / MED / DEL en control segmentado).
- Una sola vez para la persona (así funciona hoy la ficha: se comparte entre categorías): pie (Izquierdo / Derecho / Ambos).
- Plegable "Más datos (opcional)": posición secundaria (por categoría), estatura (cm), peso (kg), tallas (camiseta, short, calzado), número de afiliación, club anterior y fecha de ingreso al club (con el mismo selector de fecha).
- Todo opcional. Botón de texto "Completar después en Plantel" que salta a Acceso sin guardar nada de la ficha.
- Mismo estilo: campos rellenos de 44 px, etiqueta pequeña, "Siguiente" fijo abajo.

### Dorsal repetido
El servidor hoy no valida dorsales repetidos. Se valida en la pantalla contra los dorsales actuales de jugadores activos de esa categoría: "El 10 ya lo usa Juan Pérez". Bloquea "Siguiente" hasta corregir o borrar el dorsal.

## 2. Después del alta
- "Listo": si es jugador y saltó la ficha (o no capturó dorsal ni posición), línea "Ficha deportiva pendiente · Completar en Plantel ›" que abre su ficha en Plantel.
- Portada de Administración: "Jugadores sin ficha deportiva" con datos reales = jugadores activos sin dorsal ni posición en alguna de sus categorías. Si son 0, no aparece. Al tocarla abre Usuarios en la pestaña Jugadores con `?alerta=sin_ficha`, filtrada a ellos (con "Quitar filtro" como las demás alertas).
- /editar de Usuarios no edita datos deportivos; para jugadores muestra el enlace "Editar ficha deportiva en Plantel ›".

## Entrega
- Capturas 375 × 667: paso con una categoría, con dos, con "Más datos" abierto y con dorsal repetido.
- Alta completa con ficha y otra saltándola, con miembros de prueba; verificar en la ficha de Plantel los datos guardados y eliminar ambos al final sin rastro.

## Detalles técnicos
- Envío: si hay categorías de jugador, el rol Jugador es el rol principal de `createClubMember`; se mandan todas sus categorías juntas con `player` = datos compartidos (pie, estatura, peso, tallas, afiliación, club anterior, ingreso) y dorsal/posición de la primera. Luego, para cada otra categoría de jugador, `updateMembership` (por id de la membresía) fija su dorsal/posición/posición secundaria. Las categorías con otros roles siguen con `addMembership`.
- Al saltar el paso, `player` se envía vacío (crea la ficha mínima como hoy).
- Datos para la validación del dorsal y la alerta: lectura de `player_profiles` activos (no archivados) del club en `useAdminUsers`.
- Archivos: nuevo `src/components/admin/users/PlayerSheetStep.tsx`; cambios en `administracion.usuarios.nuevo.tsx`, `administracion.usuarios.index.tsx` (alerta `sin_ficha`), `administracion.index.tsx`, `$userId.editar.tsx`, `useAdminUsers.ts`, `ui.tsx` (línea pendiente en AccessReady).

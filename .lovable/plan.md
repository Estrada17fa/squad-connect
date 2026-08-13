# Módulo Nutrición (Mi Club)

Módulo personal por jugador, gestionado por la nutrióloga. Dos entradas (jugador → su ficha; lector/editor → panel de categoría → ficha), igual que Salud y Desarrollo.

## Respuestas a tus 3 preguntas

1. **Sí**: ajusto Plantel y Desarrollo para que LEAN el peso desde antropometría, no lo capturen.
   - Plantel: quito el campo "Peso" del formulario de jugador; la ficha muestra "Último peso medido: 74.3 kg · 12 ago 2026" o "Sin registrar".
   - Desarrollo: quito el registro manual de peso (y talla) de las mediciones físicas; esas métricas se muestran leídas de antropometría. El resto de mediciones (velocidad, salto, etc.) siguen igual.
   - El campo `weight_kg` de `player_profiles` deja de escribirse; se mantiene en la base solo como histórico y se ignora en la interfaz.

2. **Fórmula de % de grasa**: **Faulkner** (4 pliegues: tríceps, subescapular, supraespinal, abdominal) — es el estándar en fútbol y usa exactamente pliegues que ya capturas. Si faltan esos 4, no se calcula (se muestra "requiere 4 pliegues"). Además: IMC (peso/talla²), suma de 6 y 8 pliegues, y **somatotipo Heath-Carter** (endo/meso/ectomorfia) cuando estén talla, peso, pliegues, diámetros húmero/fémur y perímetros brazo flexionado y pierna.

3. **Talla/estatura**: recomiendo **misma fuente única en antropometría** (se mide con estadiómetro en el mismo estudio). Plantel y Desarrollo la muestran leída, con fecha. Si prefieres dejarla como dato deportivo editable en Plantel, dímelo y la excluyo del cambio.

## Datos (nuevas tablas)

- `nutrition_meal_plans`: jugador, equipo, club, semana (fecha inicio/fin), tipo de semana (texto configurable: "carga normal", "doble jornada"…), notas, estado activo.
- `nutrition_plan_meals`: plan, tiempo de comida (desayuno, colación 1, comida, colación 2, cena), orden, notas.
- `nutrition_plan_portions`: comida, grupo de alimento (proteínas, cereales, verduras, frutas, grasas, lácteos, libres), porciones (numérico), nota corta.
- `nutrition_assessments`: estudio antropométrico — jugador, fecha, evaluador, notas, y todas las medidas ISAK como columnas numéricas opcionales agrupadas en: básicas, 8 pliegues, 13 perímetros, 9 diámetros, 9 longitudes/alturas. Los cálculos (IMC, % grasa, sumatorias, somatotipo) se derivan en el frontend, no se guardan duplicados.

RLS con `module_key = 'nutricion'` siguiendo el patrón ya migrado: lectura con `can_view_own_row` (dueño) / `can_view_module`, escritura con `can_edit_module`, más GRANTs. El jugador nunca escribe.

## Vistas

- **Mi Nutrición (jugador)**: tarjeta del menú de la semana actual (una tarjeta por tiempo de comida con chips de porciones por grupo), historial de semanas anteriores, y antropometría: última tarjeta de resultados (peso, IMC, % grasa, sumas de pliegues), gráfica de evolución (peso y % grasa) e historial de estudios. Solo lectura.
- **Panel (nutrióloga)**: lista de jugadores de su alcance con chips de estado (plan de la semana sí/no, último estudio y su fecha, último peso), filtros estándar (buscador + embudo por categoría/estado). Pestañas: Jugadores · Planes · Estudios.
- **Ficha individual (sheet estándar)**: cabecera con foto y badges; secciones "Plan de la semana", "Historial de planes", "Antropometría" (resultados calculados destacados, gráfica de evolución, lista de estudios). Botones de editar solo para editor.

## Formularios

- **Plan semanal**: PlayerPicker (categoría → buscador → jugador), semana y tipo de semana, y editor por tiempo de comida donde se añaden líneas "grupo + porciones". Botón **Duplicar plan** que copia el plan de una semana a la siguiente para ajustarlo, en vez de rehacerlo.
- **Estudio antropométrico**: PlayerPicker + fecha + 5 secciones colapsables (básicas, pliegues, perímetros, diámetros, longitudes/alturas), todas las medidas opcionales, con unidad indicada en cada campo. Al final, panel en vivo con IMC, % grasa y sumas calculadas mientras se captura.

## Notas técnicas

- Fechas en `timestamptz` (estudios) y `date` para el rango de la semana; formato consistente con el resto.
- Hook `useNutrition.ts` (planes, estudios, roster de nutrición) y `src/lib/nutricion.ts` con catálogos (tiempos de comida, grupos de alimentos, definición de campos ISAK por sección) y las fórmulas de cálculo.
- Un hook ligero `useLatestAnthropometry` para que Plantel y Desarrollo lean peso/talla más recientes sin duplicar lógica.
- Componentes nuevos en `src/components/nutricion/`, reutilizando `PlayerPicker`, `DetailSheet` y el patrón de filtros de Salud.
- Sin emojis; iconos lucide y tokens del sistema.

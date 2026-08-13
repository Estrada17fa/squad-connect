# Nutrición: equivalencias, recetas y plan más claro

Cuatro mejoras sobre el módulo ya construido, respetando permisos (personal: el jugador solo consulta lo suyo; la nutrióloga gestiona su categoría; equivalencias y recetas son del club, las edita el editor de nutrición y las consultan todos los que ven el módulo).

## 1. Guía de equivalencias (base del club)

- Nueva pestaña **Equivalencias** en el módulo, visible para todos los que ven Nutrición; editable solo por editor de nutrición.
- Se configura una vez por club: por cada grupo de alimentos (proteínas, cereales, verduras, frutas, grasas, lácteos, leguminosas, azúcares, libres) una descripción de qué es 1 porción y una lista de ejemplos (alimento + cantidad, ej. "Pollo — 30 g", "Huevo — 1 pieza").
- Formulario: una tarjeta por grupo, con líneas de ejemplo que se agregan y se borran.
- Se consulta desde el plan: al tocar un grupo (chip de porción) se abre la ficha de ese grupo con sus equivalencias, tanto para la nutrióloga como para el jugador en Mi Nutrición.

## 2. Recetas

- **Biblioteca de recetas del club** (pestaña Recetas, mismo patrón visual que la biblioteca de ejercicios): nombre, grupos a los que corresponde, ingredientes y preparación breve. Tarjetas con buscador y filtro por grupo. La crea y edita el editor de nutrición.
- En el formulario del plan, cada tiempo de comida permite **añadir recetas de la biblioteca** (selector con buscador) y quitarlas. Crear receta nueva desde ahí sin perder el plan.
- El jugador ve las recetas sugeridas debajo de las porciones de esa comida y puede abrir el detalle (ingredientes y preparación).

## 3. Campo de porciones claro

- La línea pasa a leerse "Proteínas — 2 porciones": grupo a la izquierda, control numérico con sufijo "porc." visible, botones −/+ de 0.5, rango 0.5 a 10.
- Nunca un número suelto: la etiqueta y la unidad se muestran siempre, también en modo lectura.

## 4. Vista del plan más escaneable

- Una tarjeta por tiempo de comida con su icono propio (Desayuno, Colación 1, Comida, Colación 2, Cena), en orden del día.
- Dentro: fila de chips de porciones ("2 porc. proteína · 1 cereal · 1 fruta") tocables → equivalencias; debajo las recetas sugeridas; al final las indicaciones si las hay.
- Botón "Guía de equivalencias" en la cabecera del plan.
- Misma tarjeta reutilizada en Mi Nutrición (jugador) y en la ficha individual (nutrióloga).

## Notas técnicas

- Migración: `nutrition_portion_equivalences` (club, grupo, descripción, orden) + `nutrition_equivalence_items` (alimento, cantidad, unidad), `nutrition_recipes` (club, nombre, grupos, ingredientes, preparación) y `nutrition_plan_meal_recipes` (comida ↔ receta). RLS con `module_key = 'nutricion'`: lectura con `can_view_module`, escritura con `can_edit_module`, más GRANTs; el jugador nunca escribe. Las equivalencias y recetas son club-wide de solo lectura para quien vea el módulo.
- Hooks nuevos en `useNutrition.ts`: `useEquivalences`, `useSaveEquivalences`, `useRecipes`, `useSaveRecipe`, `useDeleteRecipe`; el guardado del plan incluye las recetas por comida.
- Componentes nuevos en `src/components/nutricion/`: `EquivalencesTab`, `EquivalenceSheet`, `RecipesTab`, `RecipeFormDialog`, `RecipePicker`, `MealCard` (tarjeta compartida) y `PortionRow` (campo con etiqueta).
- Iconos y catálogos por grupo/tiempo de comida en `src/lib/nutricion.ts`. Sin emojis; sheets estándar y tokens del sistema.

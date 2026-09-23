# Revisión de categorías y permisos: qué está mal hoy

Todo lo de abajo está verificado leyendo el código y consultando la base.

## 1. Un permiso "de categoría" en Usuarios da poder de administrador de todo el club (grave)

La pantalla dice que solo "Editor global" administra usuarios, pero las reglas de la base que protegen equipos, roles, membresías y la propia tabla de permisos usan una comprobación vieja que se conforma con "editor" a secas. Resultado: alguien con **Editor de su categoría** en Usuarios puede, desde la base, crear/editar equipos, roles, membresías y permisos de todo el club. Esa comprobación además **no filtra por club**.

Arreglo: cambiar esas reglas a la escala nueva (editor global real) y filtrar siempre por club.

## 2. "Lector global" / "Editor global" puesto solo a una categoría se aplica a todas

Al guardar una excepción por persona para *una* categoría con un nivel global, tanto la app como la base lo tratan como club completo. Hoy hay personas con nivel global guardado sobre Primer Equipo que, en la práctica, ven también Equipo Juvenil.

Arreglo: decidir la regla y aplicarla en los dos lados. Recomiendo: si la excepción es para una categoría, el nivel global se interpreta como "categoría" (no escala al club).

## 3. "Vista jugador" se convierte en "Lector" en las reglas viejas

Al guardar, cada nivel nuevo se traduce a una etiqueta vieja: "Vista jugador" queda como **lector**. Donde todavía manda esa etiqueta vieja, un jugador deja de ver "solo lo suyo" y pasa a ver todo el módulo. Hoy esa traducción está guardada así en todas las filas de jugador.

Arreglo: que las reglas restantes dejen de leer la columna vieja y usen el nivel real.

## 4. Tácticas está apagada para todos

En la base, Tácticas está en "Sin acceso" en los 5 roles, aunque el código la da por activa (Admin editor global, Técnico editor de su categoría). Nadie salvo super admin la ve, y pulsar "Valores por defecto" en la matriz la reactivaría sin avisar.

Arreglo: decidir si Tácticas debe seguir oculta (quitarla del catálogo y de los defaults) o activarla con los valores previstos.

## 5. Los valores por defecto del código no coinciden con lo guardado

Además de Tácticas: Médico tiene **Desarrollo: Lector global** en la base y **Sin acceso** en el código. Cualquiera que use el botón "Valores por defecto" sobrescribe lo real sin saberlo.

Arreglo: igualar ambos lados (fijar cuál es la matriz oficial) y dejar el botón como verdadera referencia.

## 6. Niveles que la pantalla ofrece pero no hacen nada

- **Usuarios**: el selector ofrece los 6 niveles, pero por debajo cualquier nivel menor a "Lector global" equivale a Sin acceso. Elegir "Lector de su categoría" parece dar acceso y no da nada.
- **Viajes**: el módulo de gestión también exige nivel global; "Editor de su categoría" no abre la gestión (solo la consulta en Agenda).

Arreglo: limitar las opciones mostradas en esos dos módulos a las que sí tienen efecto, con el texto de ayuda correspondiente.

## 7. Resto: sin desajustes de nombres

Las claves de módulo del código y las que usan las reglas de la base coinciden (partidos, multimedia, comunicados, nutrición, torneo, viajes, compras). Ahí no hay nada que corregir.

---

## Plan de corrección propuesto (por prioridad)

1. Cerrar la escalada de Usuarios: reglas de equipos, roles, membresías, permisos, ubicaciones y clubes pasan a exigir editor global real y filtro por club.
2. Quitar la dependencia de la etiqueta vieja en las comprobaciones que quedan, para que "Vista jugador" signifique de verdad "solo lo mío".
3. Fijar cómo se interpreta un nivel global asignado a una sola categoría, y alinear app y base.
4. Igualar la matriz por defecto del código con la guardada (Tácticas y Desarrollo del Médico), tras tu decisión.
5. Mostrar solo los niveles con efecto real en Usuarios y en la gestión de Viajes.

## Decisiones que necesito de ti

- **Tácticas**: ¿se activa o se oculta por ahora?
- **Médico y Desarrollo**: ¿Sin acceso (código) o Lector (lo guardado)?
- **Nivel global en una sola categoría**: ¿se limita a esa categoría (recomendado) o debe seguir aplicando a todo el club?

# Diseño de referencia — Módulo Usuarios (patrón base para todos los módulos)

Este documento describe el diseño que ya funciona en el módulo Usuarios. Cópialo y pégalo al inicio de cualquier prompt para un módulo nuevo (Salud, Desarrollo, Entrenamientos, Viajes, etc.) y construye el módulo siguiendo estas mismas reglas.

---

## 0. Reglas universales (se aplican a TODO módulo)

### Identidad visual
- Tema oscuro. Fondo negro. Acento verde `hsl(150, 100%, 50%)`.
- Efecto "glass" (vidrio) en tarjetas y superficies: clase `glass`.
- Tipografía: Quicksand/Inter. Títulos con `font-display`.
- Botones de acción principal con `glow-primary` (brillo verde).
- Idioma de la interfaz: español.

### Estructura de una página de módulo
```text
<ModuleTabs activeKey="<modulo>" />      // pestañas sticky de navegación
<PageHeader title="..." subtitle="..." />  // cabecera (hideTitle si la pestaña ya la pone)
<Tabs>                                    // sub-pestañas internas si hay >1 vista
  <TabsList className="glass w-full sm:w-auto">
    <TabsTrigger className="flex-1 sm:flex-none">...</TabsTrigger>
  </TabsList>
  <TabsContent>...</TabsContent>
</Tabs>
```
- `TabsList` siempre `glass` y ancho completo en móvil, auto en escritorio.
- Cada `TabsTrigger` con `flex-1 sm:flex-none` (ocupan todo el ancho en móvil, auto en escritorio).

### Estados de carga y vacío
- Cargando → `<LoadingState />`.
- Sin resultados → `<EmptyState icon={...} title="..." message="..." />`. El `icon` es un ícono de lucide. El `message` explica qué falta o qué hacer.

### Tarjetas y rejillas
- Lista de elementos → rejilla de tarjetas: `grid gap-2 lg:grid-cols-2` (una columna en móvil, dos en escritorio ancho).
- Tarjeta interactiva: clase `glass`, `rounded-xl` o `rounded-lg`, `transition-colors hover:bg-white/[0.06]`, selected → `border-primary/60 bg-white/[0.06]`.
- Las tarjetas se identifican de un vistazo (foto/avatar + nombre + badges), no son texto corrido.

### Badges (StatusBadge)
Variantes de color: `pending` (ámbar), `approved` (verde), `rejected` (rojo), `info` (azul).
Usar para estados (Activo/Baja), roles, estados de ítems, etc. Color por rol base: admin→rejected, técnico→approved, médico→info, jugador→pending.

### Acciones
- Confirmaciones: `confirm()` para acciones reversibles (dar de baja), `prompt()` que pide escribir el nombre para acciones irreversibles (eliminar).
- Toast con `sonner`: `toast.success(...)` / `toast.error(...)`.
- Acciones destructivas → `variant="ghost" className="text-destructive"`.

---

## 1. Permisos — los 6 niveles

Cada módulo recibe `canEdit` desde la ruta, derivado del nivel de permiso del usuario en ese módulo:

| Nivel |Qué ve el usuario |
|---|---|
| sin_acceso | El módulo no existe (no aparece en navegación; entrar por URL = "Sin acceso") |
| vista_jugador | "Solo lo mío" (módulos personales) o "mi categoría en modo lectura" (resto). Nunca edita |
| lector_categoria | Lee todo lo de sus equipos. No edita |
| lector_global | Lee todo el club. No edita |
| editor_categoria | Lee y edita en sus equipos |
| editor_global | Lee y edita en todo el club |

- La ruta calcula **dos banderas**: `puedeVer` (¿tiene nivel mínimo para ver la página?) y `puedeGestionar` (¿puede crear/editar?).
- `puedeGestionar` se pasa como `canEdit` a TODOS los subcomponentes. Con `canEdit=false` todos los botones de creación/edición/borrado se ocultan solos y los selectores quedan en modo consulta (deshabilitados).
- Si `!puedeVer` → mostrar `<EmptyState icon={ShieldCheck} title="Sin acceso" message="..." />`.
- Ámbito del módulo (`club` vs `team`): en módulos de club no aplica la distinción categoría/global; solo se ofrecen niveles globales.

### Patrón de la página de ruta (resumen)
```tsx
const { profile, isSuperAdmin, permissions } = useApp();
const puedeVer = isSuperAdmin || canSee<Modulo>(permissions["<modulo>"]);
const canEdit = isSuperAdmin || canManage<Modulo>(permissions["<modulo>"]);
if (!puedeVer) return <EmptyState ... />;
return <ComponenteModulo clubId={profile.club_id} canEdit={canEdit} ... />;
```

---

## 2. Lista de elementos (tarjetas de persona/entidad)

Una rejilla de tarjetas legibles de un vistazo, no una columna de texto.

- **Avatar** (foto real `avatar_url` con iniciales de respaldo) a la izquierda, `shrink-0`.
- **Nombre** con jerarquía fuerte (`font-display text-sm font-semibold`), con `truncate`.
- **Badges** a la derecha: estado (Activo/Baja), rol(es), y badges de aviso (p.ej. "Completar nombre").
- **Línea secundaria** discreta (`text-[11px] text-muted-foreground`): categoría · puesto, correo, etc.
- En móvil una tarjeta por fila; en escritorio ancho, dos columnas (`lg:grid-cols-2`).
- Toda celda de texto lleva `min-w-0` para que el contenido pueda encogerse y no empuje al vecino.

---

## 3. Filtros (bloque compacto)

Un solo bloque sobre la lista, sin chips sueltos:

1. **Buscador** siempre visible (Input con ícono `Search` a la izquierda).
2. **Segmentos de estado** al lado (botones tipo toggle en una caja con borde): p.ej. Activos / Bajas. El principal es de dos estados.
3. **Botón "Filtrar"** con contador de filtros activos (badge numérico) que abre un `Popover` con los filtros secundarios agrupados (Rol, Categoría/equipo, Puesto). Dentro, botón "Limpiar filtros".
4. **Línea de resumen** con el conteo: "18 personas".
- Contador de filtros activos = número de filtros secundarios aplicados (no cuenta el buscador ni el segmento de estado).

---

## 4. Detalle en sheet (patrón universal: "abrir = ver, editar = acción deliberada")

El detalle siempre se abre en una **hoja lateral** (`DetailSheet` / `EntitySheet`), nunca incrustado en la página.

### Regla de oro
**Abrir = lectura.** El botón "Editar" es una acción deliberada que solo aparece para quien tiene permiso (`canEdit`). No se entra en modo edición por defecto.

### Estructura de la ficha de lectura
```text
[Cabecera]
  Foto grande (avatar h-16) + Nombre (font-display text-lg) + badges de estado/rol
  [Botones de acción]  ← solo si canEdit: Editar, Membresía, Dar de baja/Reactivar, Eliminar

[Secciones etiqueta-valor]
  <DetailSection title="Contacto">
    <DetailGrid>
      <DetailField label="Correo" icon={Mail} full>   ← full = ancho completo
        <DetailLink value={...} type="email" />        ← datos accionables son enlace
      </DetailField>
      <DetailField label="Teléfono" icon={Phone}>
        <DetailLink value={...} type="tel" />
      </DetailField>
      <DetailField label="Alta" icon={CalendarDays}>
        {formatShortDate(...)}
      </DetailField>
    </DetailGrid>
  </DetailSection>

  <DetailSection title="Membresías">
    [lista de filas glass: nombre + puesto (izq, min-w-0) + badge de rol (der, shrink-0)]
  </DetailSection>

  [Secciones condicionales por rol, p.ej. "Datos deportivos" solo si es jugador]
  [Ajustes avanzados plegados, solo si canEdit]
```

### Texto que nunca se encime (regla fija para todas las fichas)
1. La rejilla es **una columna en móvil, dos a partir de `sm`**. Nunca dos columnas forzadas en pantallas estrechas. (`DetailGrid`: `grid-cols-1 sm:grid-cols-2`.)
2. Toda celda de texto lleva `min-w-0` para poder encogerse.
3. Los valores **parten palabras largas** (`break-words` / `[overflow-wrap:anywhere]`), **no se truncan** con puntos suspensivos: en una ficha se lee el dato completo.
4. Datos accionables (correo, teléfono) se muestran como **enlace** (`mailto:` / `tel:`) con el mismo corte → `DetailLink`.
5. Campos largos por naturaleza (correo, dirección, notas) pueden ocupar el ancho completo de la rejilla (`full` → `sm:col-span-2`).

### Cabecera con avatar
- Avatar `h-16 w-16 shrink-0`.
- Contenedor `min-w-0 flex-1` para que un nombre largo no empuje los badges.
- Nombre: `break-words ... [overflow-wrap:anywhere]`.
- Badges en `flex flex-wrap gap-1.5`.

### Filas de lista dentro de la ficha (membresías, etc.)
```text
<div className="glass flex items-start gap-3 rounded-lg p-3">
  <div className="min-w-0 flex-1">   ← texto que se encoge
    <p className="break-words ... [overflow-wrap:anywhere]">Nombre</p>
    <p className="... [overflow-wrap:anywhere]">puesto</p>
  </div>
  <div className="shrink-0">        ← badge siempre visible, no se comprime
    <StatusBadge>...</StatusBadge>
  </div>
</div>
```

---

## 5. Formulario de creación/edición

- Se abre en un `Dialog` o en la propia sheet (modo edición vía `renderEdit`).
- Se divide en **secciones claras**, no es un formulario plano. Cada sección agrupa datos relacionados.
- Los campos mostrados dependen del rol/tipo elegido (un médico no ve "dorsal"; un jugador sí). El formulario es dinámico según el rol.
- Tras guardar: `toast.success`, invalidar las queries relevantes (`qc.invalidateQueries`) y cerrar.

---

## 6. Consulta de datos (eficiencia)

- Para poblar rol/categoría/puesto de todas las tarjetas de la lista, se hace **una sola consulta** de todas las membresías del club y se agrupan por `user_id` en un `Map` en el cliente (no una consulta por elemento).
- Las queries usan `useQuery` de TanStack Query con claves estables (`["club-<cosa>", clubId]`).
- Tras cualquier cambio que afecte la lista, se invalidan las queries (`club-members` y `club-memberships-all`).

---

## 7. Cómo verificar

- Sesión de Editor global → ve todo y todas las acciones.
- Rol con `lector_global` → ve lista y ficha, cero botones de gestión, selectores deshabilitados.
- Rol con `lector_categoria` o `vista_jugador` → no ve el módulo; entrar por URL da "Sin acceso".
- Recorrido en navegador con sesión real revisando lista, filtros y ficha, **sin errores de consola**.
- Probar textos largos (correo sin espacios, nombre muy largo) y confirmar que nada se encima.

# Pase de abordar visible siempre + contraseña fácil la primera vez

## 1. Pase de abordar: mostrarlo dentro de la app

Causa detectada: hoy el pase se abre en una **pestaña nueva** (`window.open`) y esa pestaña se pide *después* de esperar la URL firmada del archivo. En iPhone (Safari, y sobre todo cuando la app está instalada en la pantalla de inicio como PWA) y en navegadores dentro de apps, el sistema bloquea esa apertura porque ya no la considera un toque directo del usuario. Por eso a unos sí y a otros no: depende del navegador/dispositivo, no de permisos que el usuario haya negado.

Solución: no abrir nada fuera de la app.

- Nuevo visor dentro de la app: al tocar "Ver mi pase de abordar" se abre una hoja a pantalla completa que muestra el pase **directamente**:
  - Si es imagen (JPG/PNG): se ve la imagen, con zoom por pellizco.
  - Si es PDF: se muestra incrustado; si el dispositivo no puede incrustarlo, aparece un botón grande "Abrir pase" que sí funciona porque ya es un toque directo sobre el enlace.
- El botón de descarga se convierte en un enlace real de descarga (con la URL ya lista), no en una apertura programada, así nunca lo bloquea el navegador.
- La URL firmada se pide al cargar la tarjeta del vuelo, no al tocar el botón, para que la vista abra al instante y sin bloqueos.
- Mensajes claros si algo falla ("No se pudo cargar tu pase, intenta de nuevo") con botón de reintento, en vez de quedarse en blanco.
- El mismo visor se reutiliza en la vista de gestión (hoja de Pases de abordar en Coordinación).

## 2. Contraseña del primer acceso: que no cueste

Causa: además de la regla del proyecto (8+ caracteres, 1 número, 1 minúscula, 1 mayúscula), la cuenta tiene activada la **protección contra contraseñas filtradas**. Esa protección rechaza combinaciones comunes de palabra + números aunque cumplan la regla, y el usuario solo ve un error sin saber qué hacer.

Solución (se mantiene la seguridad, se quita la fricción):

- Botón "Sugerir contraseña segura": genera una contraseña fácil de leer y escribir (por ejemplo `Tigre-Playa-47`), la coloca en los dos campos y la muestra en texto para que la anote. Siempre pasa la regla y no está en filtraciones.
- Botón de ojo para ver/ocultar lo que escribe en ambos campos.
- El checklist en vivo se mantiene, y el mensaje de rechazo por contraseña filtrada se muestra con la explicación en español y el botón de sugerencia justo al lado ("Esa contraseña aparece en filtraciones conocidas. Toca Sugerir para obtener una válida").
- El campo de confirmación deja de estorbar: si el usuario usó la sugerencia, se llena solo.

Las mismas mejoras se aplican en Mi Perfil y en el formulario donde un admin cambia la contraseña de un usuario, para que la experiencia sea igual en los tres lugares.

## Detalle técnico

- Nuevo `src/components/viajes/BoardingPassViewer.tsx` (hoja con `<img>` / `<iframe>` según extensión + enlace `<a download>` a la URL firmada). `MyFlightCard` recibe la URL firmada ya resuelta (hook que llama `createSignedUrl` sobre `trip-documents`), se elimina el `window.open` de `MyTripView.openPass` y de `openBoardingPass` en `src/hooks/useTripBoardingPasses.ts`; `BoardingPassesSheet` usa el mismo visor.
- Contraseña: nueva función `suggestPassword()` en `src/lib/password.ts` (palabras en español + número, sin ambigüedades) y estado de visibilidad en `cambiar-contrasena.tsx`, `mi-perfil.tsx` y `MemberForm.tsx`. No se toca la configuración de seguridad de la cuenta ni la regla de validación.

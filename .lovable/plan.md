# Mis viajes (viajero) + Asignar pases con tarjetas

## A) Mis viajes — vista del viajero
**Lista (Agenda › Mis viajes)**
- Tarjetas de Próximos / En curso: escudos del partido (o avión), título, fechas y etiqueta de tiempo ("Sale mañana 5:15 am", "En curso", "Regresa hoy").
- "Viajes anteriores" plegada al final con filas compactas. Vacío: "No tienes viajes próximos".
- Reglas de visibilidad sin cambios (solo Publicados/En curso/Finalizados y solo sus viajeros).

**Viaje (página completa, también desde la Agenda)**
- "‹ Mis viajes", encabezado centrado con escudos, título, fechas y estado.
- Control "Ida · Regreso" solo si hay vuelos en ambos tramos; por defecto Regreso si la ida ya pasó.
- MI PASE tipo boleto: aerolínea y vuelo, aeropuertos grandes con hora y avión punteado, línea de corte, Asiento/Grupo/Terminal/Puerta, "Ver pase completo" (fondo blanco, zoom con dos dedos, cerrar, "Siguiente"). Sin pase: "Tu pase aún no está cargado". Tramo sin vuelo: no hay boleto.
- MI ITINERARIO: línea de tiempo por día con solo lo suyo (reunión, sus vuelos, sus transportes, check-in/out de su hotel, comidas, partido). Siguiente en verde, pasados atenuados; tocar uno con lugar abre "Cómo llegar".
- MI CUARTO (solo si tiene): hotel, número y compañeros con foto.
- CONTACTO: responsable del viaje con Llamar y WhatsApp.
- Ninguna sección vacía.

## B) Asignar pases con tarjetas (Coordinación › Viajes)
- "Subir pases" en la ficha del viaje y en cada vuelo; varios PDFs, PDFs de muchas páginas o imágenes.
- Cada página de PDF se convierte en imagen al subir; los pases viejos en PDF se siguen viendo.
- "Leyendo 24 pases…" con avance; se leen nombre, vuelo, asiento, grupo y terminal.
- Pantalla de tarjetas, un pase a la vez: "Pase 3 de 24 · Vuelo de ida", "21 por asignar", barra de avance, imagen grande, "Leído en el pase", sugerencia con "Coincidencia segura"/"Revisar" y "Asignar".
- "¿Es otra persona?": 4 caras más parecidas + "Buscar". Deslizar derecha = Asignar, izquierda = Saltar; "Deshacer" (también borra el archivo) y "Saltar".
- Orden: seguras, revisar, sin coincidencia. Quien ya tiene pase no aparece; si se elige: "Ya tiene pase. ¿Reemplazar?".
- Cada asignación se guarda al momento con asiento/grupo/terminal.
- Final: "24 de 24 asignados" o quién quedó sin pase y los saltados con "Asignar ahora".

## Decisión necesaria: avisos del pase
Hoy la base avisa "Tu pase de abordar está listo" **por cada pase** y **también en Borrador**. Para cumplir "uno por persona y nada en Borrador" hace falta un cambio pequeño en la base (aunque el documento dice no tocarla):
- El aviso automático deja de enviarse en Borrador.
- Al terminar las tarjetas, se envía un solo aviso por persona (sin repetir si recibe varios pases).
Si prefieres no tocar la base, en Borrador seguirían llegando avisos. Lo haré con el cambio salvo que digas lo contrario.

## Pruebas (solo datos temporales, borrados al final)
Viaje de prueba con 4 usuarios temporales, ida y regreso, hotel con cuarto compartido, transporte y comida; subir un PDF de 3 páginas + 2 imágenes; asignar con toque, deslizando, otra persona, saltar y deshacer; entrar como viajero (pase, pase completo, itinerario, cuarto); viajero sin cuarto ni pase sin secciones vacías. Sin errores TypeScript. Capturas 375×667 de lista, viaje, pase completo, tarjetas (segura, revisar, buscar) y resumen.

## Detalles técnicos
- Reutilizar `MyTripView`, `BoardingPassViewer`, `boardingPassMatch`, hooks de logística; nuevos componentes en `src/components/viajes/mine/*` y `src/components/coord/viajes/passes/*`; reglas puras (tramo por defecto, itinerario, orden de tarjetas) en `src/lib/viajes.ts` con tests.
- pdfjs-dist (ya instalado) renderiza páginas a JPEG en el navegador antes de subir a almacenamiento.
- Migración: `notify_boarding_pass` retorna sin avisar si el viaje está en `planeacion`; las tarjetas insertan pases y el aviso único se envía con `notify_users` desde una función de servidor al cerrar la sesión de asignación (el trigger se limita a cargas sueltas).

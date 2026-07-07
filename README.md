# 3081.bo — versión mejorada

Sitio estático (HTML/CSS/JS puro) + Firebase (Firestore + Auth). Sin backend propio,
sin Firebase Storage: las imágenes se guardan como texto (base64) directamente en Firestore.

## Archivos

- `index.html`, `style.css`, `app.js` — sitio público: catálogo, búsqueda, pedidos, seguimiento por token.
- `privado.html`, `admin.css`, `privado.js` — panel de administración (login con Google, restringido a tu correo).
- `firebase-config.js` — configuración compartida de Firebase (ya con tus datos).
- `utils.js` — funciones compartidas (token, compresión de imágenes, WhatsApp, etc).
- `firestore.rules` — reglas de seguridad actualizadas, cópialas en Firebase Console → Firestore → Reglas.

## Antes de publicar

1. **Firebase Auth** → habilita el proveedor **Google** (Authentication → Sign-in method) y agrega tu dominio
   de GitHub Pages (ej. `limberhuaycho.github.io`) en *Authorized domains*.
2. **Firestore Rules** → pega el contenido de `firestore.rules` en la consola y publica.
3. **Firestore — colecciones nuevas** (se crean solas al usarlas, no hace falta crearlas a mano):
   - `projects` — catálogo (antes ya existía, se reutiliza con nuevos campos: `tipo`, `nombre`, `descripcion`, `precio`, `imagen`, `link`).
   - `pedidos` — cada pedido/token generado por un cliente.
   - `config/qr` — documento único con el QR de pago actual (`imagen`, `updatedAt`).
4. Sube estos archivos a tu repo (reemplazan a los anteriores) y haz commit a `main`.

## Cómo funciona el flujo de pedidos

1. Un cliente busca en el catálogo o llena el formulario "Hacer un pedido" con una idea libre.
2. Se genera un **token único** (ej. `3081-K7F2-QX9A`).
   - Si hay un QR configurado en el admin → el pedido queda `pendiente_pago` y se muestra el QR + botón de descarga.
   - Si no hay QR todavía → el pedido queda `congelado` (se elimina solo a los 5 días si nadie lo atiende).
3. El cliente paga y, si quiere, envía su token por WhatsApp (botón directo al **591 73265343**).
4. En el panel admin (`privado.html`), pestaña **Pedidos**, decides: **Verificar**, **Observación** o **Rechazar**.
5. Al verificar, el cliente ya puede consultar su token en "Mi pedido" y ver que está confirmado.
6. Cuando entregas el trabajo, presionas **Finalizar pedido** → queda como `finalizado` y se auto-elimina a los 5 días
   (o lo borras al toque con "Eliminar ahora").
7. La pestaña **Resumen** muestra cuántos tokens están activos, verificados, rechazados y usados.

## Imágenes sin Storage

Tanto en **Proyectos** como en el **QR de pago**, puedes subir una foto desde la galería: se redimensiona y
comprime en el navegador y se guarda como texto base64 en el propio documento de Firestore (límite ~700KB
por imagen para no pasarte del límite de 1MB por documento). También puedes seguir usando solo un link,
como antes.

## Nota sobre las reglas de `pedidos`

Para que el buscador público "Mi pedido" funcione sin cuenta, la colección `pedidos` es de lectura pública
(cualquiera con el token exacto puede consultarlo). Si prefieres más privacidad, se puede mover ese lookup
a una Cloud Function en el futuro — de momento, sin backend propio, esta es la forma más simple de lograrlo.

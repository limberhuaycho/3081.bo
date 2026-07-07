// utils.js — funciones compartidas

/** Genera un token único legible, ej: 3081-K7F2-QX9A */
function generarToken() {
  const grupo = () =>
    Math.random().toString(36).substring(2, 6).toUpperCase();
  return `3081-${grupo()}-${grupo()}`;
}

/**
 * Convierte un archivo de imagen (de galería) a un string base64 comprimido,
 * listo para guardar como texto en Firestore (no hay Storage disponible).
 * Redimensiona a un máximo de `maxDim` px y comprime a JPEG.
 */
function imagenABase64(file, maxDim = 900, calidad = 0.72) {
  return new Promise((resolve, reject) => {
    if (!file) return resolve(null);
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("No se pudo leer la imagen"));
    reader.onload = (e) => {
      const img = new Image();
      img.onerror = () => reject(new Error("Imagen inválida"));
      img.onload = () => {
        let { width, height } = img;
        if (width > height && width > maxDim) {
          height = Math.round((height * maxDim) / width);
          width = maxDim;
        } else if (height > maxDim) {
          width = Math.round((width * maxDim) / height);
          height = maxDim;
        }
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, width, height);
        const dataUrl = canvas.toDataURL("image/jpeg", calidad);
        // Firestore soporta hasta 1MB por documento; avisamos si se pasa de ~700KB
        if (dataUrl.length > 700 * 1024) {
          reject(new Error("La imagen sigue siendo muy pesada, prueba con otra más pequeña."));
          return;
        }
        resolve(dataUrl);
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });
}

/** true si un string es una URL (http/https) en vez de una imagen base64 guardada como texto */
function esLink(str) {
  return typeof str === "string" && /^https?:\/\//i.test(str);
}

function fechaLegible(timestamp) {
  if (!timestamp) return "—";
  const d = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  return d.toLocaleDateString("es-BO", { day: "2-digit", month: "short", year: "numeric" }) +
    " " + d.toLocaleTimeString("es-BO", { hour: "2-digit", minute: "2-digit" });
}

function diasDesde(timestamp) {
  if (!timestamp) return 0;
  const d = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  return (Date.now() - d.getTime()) / (1000 * 60 * 60 * 24);
}

function linkWhatsApp(numero, texto) {
  return `https://wa.me/${numero}?text=${encodeURIComponent(texto)}`;
}

const ETIQUETAS_TIPO = {
  pagina: "Página web",
  app: "Aplicación",
  programa: "Programa",
  otro: "Otro"
};

const ESTADOS_PEDIDO = {
  congelado: { label: "Congelado", clase: "estado-congelado" },
  pendiente_pago: { label: "Esperando pago", clase: "estado-pendiente" },
  en_revision: { label: "En revisión", clase: "estado-revision" },
  observacion: { label: "Con observación", clase: "estado-observacion" },
  verificado: { label: "Pago verificado", clase: "estado-verificado" },
  rechazado: { label: "Rechazado", clase: "estado-rechazado" },
  finalizado: { label: "Finalizado", clase: "estado-finalizado" }
};

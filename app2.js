// app.js — lógica del sitio público

let TODOS_PROYECTOS = [];
let TIPO_ACTUAL = "todos";
let QR_ACTUAL = null; // { imagen, updatedAt } desde config/qr

const grid = document.getElementById("grid");
const vacio = document.getElementById("vacio");
const buscador = document.getElementById("buscador");
const tabsEl = document.getElementById("tabs");

/* ---------- Utilidades de coincidencia de búsqueda ---------- */

const PALABRAS_TIPO = {
  pagina: ["pagina", "página", "web", "sitio", "landing", "tienda online", "portafolio"],
  app: ["app", "aplicacion", "aplicación", "movil", "móvil", "android", "ios"],
  programa: ["programa", "sistema", "software", "escritorio", "gestion", "gestión", "inventario"],
  otro: ["otro", "bot", "automatizacion", "automatización", "script", "integracion", "integración"]
};

function normaliza(str) {
  return (str || "").toString().toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

/** Adivina el tipo más probable a partir de un texto libre */
function adivinarTipo(texto) {
  const t = normaliza(texto);
  let mejor = { tipo: null, puntos: 0 };
  for (const [tipo, palabras] of Object.entries(PALABRAS_TIPO)) {
    let puntos = 0;
    palabras.forEach((p) => { if (t.includes(normaliza(p))) puntos++; });
    if (puntos > mejor.puntos) mejor = { tipo, puntos };
  }
  return mejor.tipo;
}

function coincide(proyecto, termino) {
  if (!termino) return true;
  const t = normaliza(termino);
  const campos = normaliza(proyecto.nombre + " " + proyecto.descripcion);
  if (campos.includes(t)) return true;
  // si no hay coincidencia directa, intenta por tipo adivinado
  const tipoAdivinado = adivinarTipo(termino);
  return tipoAdivinado && tipoAdivinado === proyecto.tipo;
}

/* ---------- Carga de datos ---------- */

async function cargarProyectos() {
  const snap = await db.collection("projects").orderBy("createdAt", "desc").get();
  TODOS_PROYECTOS = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  render();
}

async function cargarConfigQR() {
  try {
    const doc = await db.collection("config").doc("qr").get();
    QR_ACTUAL = doc.exists ? doc.data() : null;
  } catch (e) { QR_ACTUAL = null; }
}

/* ---------- Render del catálogo ---------- */

function render() {
  const termino = buscador.value.trim();
  let lista = TODOS_PROYECTOS.filter((p) => TIPO_ACTUAL === "todos" || p.tipo === TIPO_ACTUAL);
  if (termino) lista = lista.filter((p) => coincide(p, termino));

  grid.innerHTML = "";
  vacio.classList.toggle("hidden", lista.length > 0);

  lista.forEach((p) => {
    const card = document.createElement("div");
    card.className = "card";
    card.innerHTML = `
      <div class="card-img">
        ${p.imagen ? `<img src="${p.imagen}" alt="${escapeHtml(p.nombre)}" loading="lazy">` : `<span class="placeholder">3081</span>`}
      </div>
      <div class="card-body">
        <span class="card-tag">${ETIQUETAS_TIPO[p.tipo] || p.tipo}</span>
        <span class="card-title">${escapeHtml(p.nombre)}</span>
        <p class="card-desc">${escapeHtml(p.descripcion || "")}</p>
        <div class="card-foot">
          <span class="card-price ${p.precio ? "" : "custom"}">${p.precio ? "Bs " + p.precio : "A cotizar"}</span>
          <span class="mono" style="font-size:0.75rem;color:var(--text-dim)">ver más →</span>
        </div>
      </div>
    `;
    card.addEventListener("click", () => abrirModal(p));
    grid.appendChild(card);
  });
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str || "";
  return div.innerHTML;
}

tabsEl.addEventListener("click", (e) => {
  const btn = e.target.closest(".tab");
  if (!btn) return;
  tabsEl.querySelectorAll(".tab").forEach((t) => t.classList.remove("active"));
  btn.classList.add("active");
  TIPO_ACTUAL = btn.dataset.tipo;
  render();
});

let debounce;
buscador.addEventListener("input", () => {
  clearTimeout(debounce);
  debounce = setTimeout(render, 180);
});

/* ---------- Modal de proyecto ---------- */

const modal = document.getElementById("modal-proyecto");
const modalBody = document.getElementById("modal-body");

function abrirModal(p) {
  modalBody.innerHTML = `
    ${p.imagen ? `<img class="modal-img" src="${p.imagen}" alt="${escapeHtml(p.nombre)}">` : ""}
    <span class="card-tag">${ETIQUETAS_TIPO[p.tipo] || p.tipo}</span>
    <h3>${escapeHtml(p.nombre)}</h3>
    <p>${escapeHtml(p.descripcion || "")}</p>
    <p class="card-price">${p.precio ? "Bs " + p.precio : "Precio a cotizar contigo"}</p>
    ${p.link ? `<p style="margin-bottom:14px"><a href="${p.link}" target="_blank" rel="noopener" style="color:var(--teal)">Ver enlace / demo →</a></p>` : ""}
    <button class="btn btn-primary btn-block" id="modal-pedir">Hacer pedido de esto</button>
  `;
  modal.classList.remove("hidden");
  document.getElementById("modal-pedir").addEventListener("click", () => {
    modal.classList.add("hidden");
    precargarFormulario(p);
  });
}

document.getElementById("modal-close").addEventListener("click", () => modal.classList.add("hidden"));
modal.addEventListener("click", (e) => { if (e.target === modal) modal.classList.add("hidden"); });

function precargarFormulario(p) {
  document.getElementById("proyecto-ref").value = p.id;
  document.getElementById("p-tipo").value = p.tipo;
  document.getElementById("p-titulo").value = p.nombre;
  document.getElementById("p-desc").value = `Quiero algo parecido a "${p.nombre}"`;
  const info = document.getElementById("precio-info");
  info.textContent = p.precio ? `Este trabajo tiene un precio de referencia de Bs ${p.precio}.` : "Este trabajo se cotiza según lo que necesites.";
  info.classList.remove("hidden");
  document.getElementById("pedir").scrollIntoView({ behavior: "smooth" });
}

/* ---------- Envío de pedido ---------- */

const formPedido = document.getElementById("form-pedido");

formPedido.addEventListener("submit", async (e) => {
  e.preventDefault();
  const btn = formPedido.querySelector("button[type=submit]");
  btn.disabled = true; btn.textContent = "Enviando…";

  try {
    const proyectoId = document.getElementById("proyecto-ref").value || null;
    const proyecto = proyectoId ? TODOS_PROYECTOS.find((p) => p.id === proyectoId) : null;
    const token = generarToken();
    const tieneQR = !!(QR_ACTUAL && QR_ACTUAL.imagen);

    const pedido = {
      token,
      clienteNombre: document.getElementById("p-nombre").value.trim(),
      contacto: document.getElementById("p-contacto").value.trim(),
      tipo: document.getElementById("p-tipo").value,
      titulo: document.getElementById("p-titulo").value.trim(),
      descripcion: document.getElementById("p-desc").value.trim(),
      proyectoId: proyectoId,
      precioReferencia: proyecto ? (proyecto.precio || null) : null,
      estado: tieneQR ? "pendiente_pago" : "congelado",
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    };

    await db.collection("pedidos").add(pedido);
    mostrarResultado(document.getElementById("resultado-pedido"), { ...pedido, createdAtLocal: new Date() });
    formPedido.reset();
    document.getElementById("proyecto-ref").value = "";
    document.getElementById("precio-info").classList.add("hidden");
  } catch (err) {
    alert("No pudimos enviar tu pedido. Intenta de nuevo. " + err.message);
  } finally {
    btn.disabled = false; btn.textContent = "Enviar pedido";
  }
});

function mostrarResultado(contenedor, pedido) {
  const estado = ESTADOS_PEDIDO[pedido.estado] || { label: pedido.estado, clase: "" };
  let extra = "";

  if (pedido.estado === "congelado") {
    extra = `<p style="color:var(--text-dim); font-size:0.9rem">Aún no hay un QR de pago disponible. Tu pedido queda congelado y te avisaremos por WhatsApp/correo apenas puedas pagar. Si pasan más de 5 días sin actividad, el pedido se elimina automáticamente.</p>`;
  } else if (pedido.estado === "pendiente_pago" && QR_ACTUAL && QR_ACTUAL.imagen) {
    extra = `
      <p style="font-size:0.9rem; color:var(--text-dim); margin-bottom:6px">Escanea o descarga el QR para pagar:</p>
      <img class="qr" src="${QR_ACTUAL.imagen}" alt="QR de pago">
      <a class="btn btn-ghost" href="${QR_ACTUAL.imagen}" download="qr-pago-3081.jpg">Descargar QR</a>
    `;
  } else if (pedido.estado === "verificado") {
    extra = `<p style="color:var(--teal); font-size:0.9rem">Tu pago fue verificado. Guarda tu token, lo necesitarás como comprobante.</p>`;
  } else if (pedido.estado === "finalizado") {
    extra = `<p style="color:var(--teal); font-size:0.9rem">Este pedido ya fue entregado y cerrado. ¡Gracias por confiar en 3081.bo!</p>`;
  } else if (pedido.estado === "rechazado") {
    extra = `<p style="color:var(--red); font-size:0.9rem">Tu pago no pudo verificarse. Contáctanos por WhatsApp con tu token.</p>`;
  }

  contenedor.innerHTML = `
    <p style="font-size:0.85rem;color:var(--text-dim)">Tu código de seguimiento</p>
    <p class="resultado-token">${pedido.token}</p>
    <span class="resultado-estado ${estado.clase}">${estado.label}</span>
    ${extra}
    <div class="resultado-acciones">
      <a class="btn btn-whatsapp" target="_blank" rel="noopener"
         href="${linkWhatsApp(WHATSAPP_NUMERO, `Hola, mi token de pedido es ${pedido.token} (${pedido.titulo || ""})`)}">
         Enviar token por WhatsApp
      </a>
    </div>
  `;
  contenedor.classList.remove("hidden");
}

/* ---------- Seguimiento por token ---------- */

document.getElementById("track-btn").addEventListener("click", async () => {
  const input = document.getElementById("track-token");
  const token = input.value.trim().toUpperCase();
  const resultado = document.getElementById("track-resultado");
  if (!token) return;

  resultado.classList.remove("hidden");
  resultado.innerHTML = `<p style="color:var(--text-dim)">Buscando…</p>`;

  try {
    const snap = await db.collection("pedidos").where("token", "==", token).limit(1).get();
    if (snap.empty) {
      resultado.innerHTML = `<p style="color:var(--red)">No encontramos ese token. Revisa que esté bien escrito.</p>`;
      return;
    }
    const pedido = snap.docs[0].data();
    mostrarResultado(resultado, pedido);
  } catch (err) {
    resultado.innerHTML = `<p style="color:var(--red)">Error al consultar: ${err.message}</p>`;
  }
});

/* ---------- Contacto general ---------- */

document.getElementById("wa-contacto").href = linkWhatsApp(WHATSAPP_NUMERO, "Hola, quisiera hacer una consulta sobre 3081.bo");

/* ---------- Init ---------- */

(async function init() {
  await Promise.all([cargarProyectos(), cargarConfigQR()]);
})();

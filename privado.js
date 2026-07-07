// privado.js — lógica del panel de administración

const pantallaLogin = document.getElementById("pantalla-login");
const panelAdmin = document.getElementById("panel-admin");
const loginError = document.getElementById("login-error");

let PROYECTOS_CACHE = [];
let PEDIDOS_CACHE = [];

/* ================= AUTH ================= */

document.getElementById("btn-login").addEventListener("click", async () => {
  loginError.classList.add("hidden");
  const provider = new firebase.auth.GoogleAuthProvider();
  try {
    const result = await auth.signInWithPopup(provider);
    if (result.user.email !== ADMIN_EMAIL) {
      await auth.signOut();
      loginError.textContent = "Esta cuenta no tiene acceso al panel de administración.";
      loginError.classList.remove("hidden");
    }
  } catch (err) {
    loginError.textContent = "No se pudo iniciar sesión: " + err.message;
    loginError.classList.remove("hidden");
  }
});

document.getElementById("btn-logout").addEventListener("click", () => auth.signOut());

auth.onAuthStateChanged((user) => {
  if (user && user.email === ADMIN_EMAIL) {
    pantallaLogin.classList.add("hidden");
    panelAdmin.classList.remove("hidden");
    document.getElementById("admin-email").textContent = user.email;
    iniciarPanel();
  } else {
    panelAdmin.classList.add("hidden");
    pantallaLogin.classList.remove("hidden");
  }
});

/* ================= TABS ================= */

document.querySelectorAll(".admin-tab").forEach((btn) => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".admin-tab").forEach((b) => b.classList.remove("active"));
    document.querySelectorAll(".admin-panel").forEach((p) => p.classList.add("hidden"));
    btn.classList.add("active");
    document.getElementById("panel-" + btn.dataset.panel).classList.remove("hidden");
  });
});

/* ================= INIT ================= */

let YA_INICIADO = false;
async function iniciarPanel() {
  if (YA_INICIADO) return;
  YA_INICIADO = true;
  await limpiezaAutomatica();
  await Promise.all([cargarProyectosAdmin(), cargarPedidosAdmin(), cargarQR()]);
}

/* ================= LIMPIEZA AUTOMÁTICA =================
   - pedidos "congelado" con más de 5 días -> eliminar
   - pedidos "finalizado" con más de 5 días -> eliminar
*/
async function limpiezaAutomatica() {
  try {
    const snap = await db.collection("pedidos").get();
    const lote = db.batch();
    let cambios = 0;
    snap.forEach((doc) => {
      const p = doc.data();
      if (p.estado === "congelado" && diasDesde(p.createdAt) > DIAS_CONGELADO_LIMITE) {
        lote.delete(doc.ref); cambios++;
      } else if (p.estado === "finalizado" && diasDesde(p.updatedAt || p.createdAt) > DIAS_FINALIZADO_LIMITE) {
        lote.delete(doc.ref); cambios++;
      }
    });
    if (cambios > 0) await lote.commit();
  } catch (e) { console.warn("Limpieza automática falló:", e.message); }
}

/* ================= PROYECTOS ================= */

const listaProyectos = document.getElementById("lista-proyectos");
const modalProyecto = document.getElementById("modal-form-proyecto");
const formProyecto = document.getElementById("form-proyecto");

async function cargarProyectosAdmin() {
  const snap = await db.collection("projects").orderBy("createdAt", "desc").get();
  PROYECTOS_CACHE = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  renderProyectosAdmin();
}

function renderProyectosAdmin() {
  listaProyectos.innerHTML = "";
  if (PROYECTOS_CACHE.length === 0) {
    listaProyectos.innerHTML = `<p class="admin-hint">Aún no hay proyectos cargados.</p>`;
    return;
  }
  PROYECTOS_CACHE.forEach((p) => {
    const row = document.createElement("div");
    row.className = "admin-row";
    row.innerHTML = `
      <div class="admin-row-thumb">${p.imagen ? `<img src="${p.imagen}">` : "—"}</div>
      <div class="admin-row-main">
        <div class="admin-row-title">${escapeHtmlA(p.nombre)}</div>
        <div class="admin-row-sub">${ETIQUETAS_TIPO[p.tipo] || p.tipo} · ${p.precio ? "Bs " + p.precio : "a cotizar"}</div>
      </div>
      <div class="admin-row-actions">
        <button class="btn btn-sm btn-ghost" data-editar="${p.id}">Editar</button>
      </div>
    `;
    listaProyectos.appendChild(row);
  });
  listaProyectos.querySelectorAll("[data-editar]").forEach((b) =>
    b.addEventListener("click", () => abrirModalProyecto(PROYECTOS_CACHE.find((p) => p.id === b.dataset.editar)))
  );
}

function escapeHtmlA(str) {
  const div = document.createElement("div");
  div.textContent = str || "";
  return div.innerHTML;
}

document.getElementById("btn-nuevo-proyecto").addEventListener("click", () => abrirModalProyecto(null));
document.getElementById("cerrar-modal-proyecto").addEventListener("click", () => modalProyecto.classList.add("hidden"));

function abrirModalProyecto(p) {
  document.getElementById("titulo-modal-proyecto").textContent = p ? "Editar proyecto" : "Nuevo proyecto";
  document.getElementById("pr-id").value = p ? p.id : "";
  document.getElementById("pr-tipo").value = p ? p.tipo : "pagina";
  document.getElementById("pr-nombre").value = p ? p.nombre : "";
  document.getElementById("pr-desc").value = p ? p.descripcion : "";
  document.getElementById("pr-precio").value = p && p.precio ? p.precio : "";
  document.getElementById("pr-link").value = p && p.link ? p.link : "";
  document.getElementById("pr-imagen-file").value = "";
  document.getElementById("pr-imagen-link").value = p && esLink(p.imagen) ? p.imagen : "";
  const preview = document.getElementById("pr-imagen-preview");
  if (p && p.imagen) {
    preview.innerHTML = `<img src="${p.imagen}">`;
    preview.classList.remove("hidden");
  } else {
    preview.classList.add("hidden");
  }
  document.getElementById("btn-eliminar-proyecto").classList.toggle("hidden", !p);
  modalProyecto.classList.remove("hidden");
}

document.getElementById("pr-imagen-file").addEventListener("change", async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  try {
    const b64 = await imagenABase64(file);
    const preview = document.getElementById("pr-imagen-preview");
    preview.innerHTML = `<img src="${b64}">`;
    preview.classList.remove("hidden");
    preview.dataset.pendiente = b64;
  } catch (err) { alert(err.message); e.target.value = ""; }
});

formProyecto.addEventListener("submit", async (e) => {
  e.preventDefault();
  const id = document.getElementById("pr-id").value;
  const preview = document.getElementById("pr-imagen-preview");
  const linkImg = document.getElementById("pr-imagen-link").value.trim();
  let imagen = preview.dataset.pendiente || (linkImg || null) || (preview.querySelector("img") ? preview.querySelector("img").src : null);
  if (linkImg) imagen = linkImg; // link explícito tiene prioridad si se llenó

  const datos = {
    tipo: document.getElementById("pr-tipo").value,
    nombre: document.getElementById("pr-nombre").value.trim(),
    descripcion: document.getElementById("pr-desc").value.trim(),
    precio: document.getElementById("pr-precio").value ? Number(document.getElementById("pr-precio").value) : null,
    link: document.getElementById("pr-link").value.trim() || null,
    imagen: imagen || null,
    views: 0,
    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
  };

  try {
    if (id) {
      await db.collection("projects").doc(id).update(datos);
    } else {
      datos.createdAt = firebase.firestore.FieldValue.serverTimestamp();
      await db.collection("projects").add(datos);
    }
    modalProyecto.classList.add("hidden");
    delete preview.dataset.pendiente;
    await cargarProyectosAdmin();
  } catch (err) {
    alert("Error al guardar: " + err.message);
  }
});

document.getElementById("btn-eliminar-proyecto").addEventListener("click", async () => {
  const id = document.getElementById("pr-id").value;
  if (!id || !confirm("¿Eliminar este proyecto definitivamente?")) return;
  await db.collection("projects").doc(id).delete();
  modalProyecto.classList.add("hidden");
  await cargarProyectosAdmin();
});

/* ================= PEDIDOS ================= */

const listaPedidos = document.getElementById("lista-pedidos");
const filtroEstado = document.getElementById("filtro-estado");

async function cargarPedidosAdmin() {
  const snap = await db.collection("pedidos").orderBy("createdAt", "desc").get();
  PEDIDOS_CACHE = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  renderPedidosAdmin();
  actualizarResumen();
}

filtroEstado.addEventListener("change", renderPedidosAdmin);

function renderPedidosAdmin() {
  const filtro = filtroEstado.value;
  const lista = PEDIDOS_CACHE.filter((p) => filtro === "todos" || p.estado === filtro);
  listaPedidos.innerHTML = "";
  if (lista.length === 0) {
    listaPedidos.innerHTML = `<p class="admin-hint">No hay pedidos en este filtro.</p>`;
    return;
  }
  lista.forEach((p) => {
    const estado = ESTADOS_PEDIDO[p.estado] || { label: p.estado, clase: "" };
    const row = document.createElement("div");
    row.className = "admin-row";
    row.innerHTML = `
      <div class="admin-row-main">
        <div class="admin-row-title">${escapeHtmlA(p.titulo)} <span class="resultado-estado ${estado.clase}" style="margin-left:8px">${estado.label}</span></div>
        <div class="admin-row-sub">${escapeHtmlA(p.clienteNombre)} · ${escapeHtmlA(p.contacto)} · ${ETIQUETAS_TIPO[p.tipo] || p.tipo}</div>
        <div class="admin-row-token">${p.token}</div>
      </div>
      <div class="admin-row-actions" data-acciones></div>
    `;
    const acciones = row.querySelector("[data-acciones]");
    acciones.appendChild(botonesPedido(p));
    listaPedidos.appendChild(row);
  });
}

function botonesPedido(p) {
  const cont = document.createElement("div");
  cont.className = "admin-row-actions";

  const boton = (texto, clase, onClick) => {
    const b = document.createElement("button");
    b.className = "btn btn-sm " + clase;
    b.textContent = texto;
    b.addEventListener("click", onClick);
    return b;
  };

  if (["congelado", "pendiente_pago", "en_revision"].includes(p.estado)) {
    cont.appendChild(boton("Verificar", "btn-teal", () => actualizarPedido(p.id, "verificado")));
    cont.appendChild(boton("Observación", "btn-violet", () => actualizarPedido(p.id, "observacion")));
    cont.appendChild(boton("Rechazar", "btn-red", () => actualizarPedido(p.id, "rechazado")));
  }
  if (p.estado === "observacion") {
    cont.appendChild(boton("Marcar verificado", "btn-teal", () => actualizarPedido(p.id, "verificado")));
    cont.appendChild(boton("Rechazar", "btn-red", () => actualizarPedido(p.id, "rechazado")));
  }
  if (p.estado === "rechazado") {
    cont.appendChild(boton("Reabrir", "btn-ghost", () => actualizarPedido(p.id, "pendiente_pago")));
  }
  if (p.estado === "verificado") {
    cont.appendChild(boton("Finalizar pedido", "btn-teal", () => actualizarPedido(p.id, "finalizado")));
    cont.appendChild(boton("WhatsApp cliente", "btn-ghost", () => window.open(
      linkWhatsApp(soloNumeros(p.contacto) || WHATSAPP_NUMERO, `Hola ${p.clienteNombre}, tu pedido (token ${p.token}) fue verificado.`), "_blank"
    )));
  }
  if (p.estado === "finalizado") {
    cont.appendChild(boton("Eliminar ahora", "btn-red", () => eliminarPedido(p.id)));
  }
  if (p.estado === "congelado") {
    cont.appendChild(boton("Eliminar", "btn-red", () => eliminarPedido(p.id)));
  }
  return cont;
}

function soloNumeros(str) {
  const n = (str || "").replace(/\D/g, "");
  return n.length >= 8 ? n : null;
}

async function actualizarPedido(id, nuevoEstado) {
  await db.collection("pedidos").doc(id).update({
    estado: nuevoEstado,
    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
  });
  await cargarPedidosAdmin();
}

async function eliminarPedido(id) {
  if (!confirm("¿Eliminar este pedido y su token definitivamente?")) return;
  await db.collection("pedidos").doc(id).delete();
  await cargarPedidosAdmin();
}

function actualizarResumen() {
  const activos = PEDIDOS_CACHE.filter((p) => ["congelado", "pendiente_pago", "en_revision", "observacion"].includes(p.estado)).length;
  const verificados = PEDIDOS_CACHE.filter((p) => p.estado === "verificado").length;
  const rechazados = PEDIDOS_CACHE.filter((p) => p.estado === "rechazado").length;
  const usados = PEDIDOS_CACHE.filter((p) => p.estado === "finalizado").length;
  document.getElementById("n-activos").textContent = activos;
  document.getElementById("n-verificados").textContent = verificados;
  document.getElementById("n-rechazados").textContent = rechazados;
  document.getElementById("n-usados").textContent = usados;
}

/* ================= QR ================= */

const qrActualEl = document.getElementById("qr-actual");
const qrMsg = document.getElementById("qr-msg");
let QR_PENDIENTE_B64 = null;

async function cargarQR() {
  const doc = await db.collection("config").doc("qr").get();
  if (doc.exists && doc.data().imagen) {
    qrActualEl.innerHTML = `<img src="${doc.data().imagen}">`;
  } else {
    qrActualEl.innerHTML = `<span class="qr-preview empty">Sin QR configurado — los pedidos nuevos quedarán congelados.</span>`;
  }
}

document.getElementById("qr-file").addEventListener("change", async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  try {
    QR_PENDIENTE_B64 = await imagenABase64(file, 700, 0.8);
    qrActualEl.innerHTML = `<img src="${QR_PENDIENTE_B64}">`;
  } catch (err) { alert(err.message); e.target.value = ""; }
});

document.getElementById("btn-guardar-qr").addEventListener("click", async () => {
  const link = document.getElementById("qr-link").value.trim();
  const imagen = link || QR_PENDIENTE_B64;
  if (!imagen) { alert("Sube una imagen o pega un link primero."); return; }
  await db.collection("config").doc("qr").set({ imagen, updatedAt: firebase.firestore.FieldValue.serverTimestamp() });
  QR_PENDIENTE_B64 = null;
  document.getElementById("qr-link").value = "";
  document.getElementById("qr-file").value = "";
  qrMsg.textContent = "QR guardado correctamente.";
  qrMsg.classList.remove("hidden");
  await cargarQR();
});

document.getElementById("btn-quitar-qr").addEventListener("click", async () => {
  if (!confirm("¿Quitar el QR actual? Los nuevos pedidos quedarán congelados hasta que subas uno nuevo.")) return;
  await db.collection("config").doc("qr").delete();
  await cargarQR();
});

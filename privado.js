/* ============================================
   LIMBER HUAYCHO - ADMIN PANEL LOGIC
   Firebase Auth + Firestore CRUD
   ============================================ */

const firebaseConfig = {
  apiKey: "AIzaSyBFu8Jrd2YrBTMuikiuCnOj7dyHMugHx-0",
  authDomain: "limber-rcl-3081.firebaseapp.com",
  projectId: "limber-rcl-3081",
  storageBucket: "limber-rcl-3081.firebasestorage.app",
  messagingSenderId: "258409264111",
  appId: "1:258409264111:web:08fa48d8bb10ab83c07c1a",
  measurementId: "G-CVGEW1HQEZ"
};

firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

// ========== ELEMENTS ==========
const loginScreen = document.getElementById('loginScreen');
const adminLayout = document.getElementById('adminLayout');
const loginBtn = document.getElementById('loginBtn');
const logoutBtn = document.getElementById('logoutBtn');
const sidebarToggle = document.getElementById('sidebarToggle');
const sidebar = document.getElementById('sidebar');

// ========== AUTH ==========
loginBtn.addEventListener('click', async () => {
    try {
        const provider = new firebase.auth.GoogleAuthProvider();
        await auth.signInWithPopup(provider);
    } catch (e) {
        showToast('Error al iniciar sesión', 'error');
    }
});

logoutBtn.addEventListener('click', () => auth.signOut());

auth.onAuthStateChanged(async (user) => {
    if (user) {
        // Check authorization
        const authorized = await checkAuth(user);
        if (!authorized) {
            showToast('No tienes permiso para acceder', 'error');
            auth.signOut();
            return;
        }
        loginScreen.style.display = 'none';
        adminLayout.style.display = 'flex';
        updateUserUI(user);
        loadDashboard();
        loadProjects();
        loadMessages();
    } else {
        loginScreen.style.display = 'flex';
        adminLayout.style.display = 'none';
    }
});

async function checkAuth(user) {
    try {
        // Check if user UID exists in 'privado' collection
        const doc = await db.collection('privado').doc(user.uid).get();
        if (doc.exists) return true;
        // Also check by email
        const snapshot = await db.collection('privado').where('email', '==', user.email).get();
        return !snapshot.empty;
    } catch (e) {
        console.error('Auth check error:', e);
        return false;
    }
}

function updateUserUI(user) {
    const name = user.displayName || 'Admin';
    const photo = user.photoURL || '';
    document.getElementById('sidebarName').textContent = name;
    document.getElementById('topbarName').textContent = name;
    if (photo) {
        document.getElementById('sidebarAvatar').src = photo;
        document.getElementById('topbarAvatar').src = photo;
    }
}

// ========== SIDEBAR ==========
sidebarToggle.addEventListener('click', () => {
    sidebar.classList.toggle('open');
});

document.querySelectorAll('.sidebar-link').forEach(link => {
    link.addEventListener('click', (e) => {
        e.preventDefault();
        const section = link.dataset.section;
        document.querySelectorAll('.sidebar-link').forEach(l => l.classList.remove('active'));
        link.classList.add('active');
        document.querySelectorAll('.content-section').forEach(s => s.classList.remove('active'));
        document.getElementById(`sec-${section}`).classList.add('active');
        sidebar.classList.remove('open');
    });
});

// ========== DASHBOARD ==========
async function loadDashboard() {
    try {
        const doc = await db.collection('stats').doc('general').get();
        const data = doc.exists ? doc.data() : {};
        document.getElementById('statVisits').textContent = formatNumber(data.visitas || 0);
        document.getElementById('statWhatsapp').textContent = formatNumber(data.clicks_whatsapp || 0);
        document.getElementById('statGithub').textContent = formatNumber(data.clicks_github || 0);
        document.getElementById('statYoutube').textContent = formatNumber(data.clicks_youtube || 0);

        // Analytics bars
        const total = (data.clicks_whatsapp || 0) + (data.clicks_github || 0) + (data.clicks_youtube || 0);
        const barsContainer = document.getElementById('analyticsBars');
        if (barsContainer) {
            const items = [
                { name: 'WhatsApp', value: data.clicks_whatsapp || 0, color: '#25d366' },
                { name: 'GitHub', value: data.clicks_github || 0, color: '#6e5494' },
                { name: 'YouTube', value: data.clicks_youtube || 0, color: '#ff0000' },
                { name: 'Visitas', value: data.visitas || 0, color: '#7c3aed' }
            ];
            barsContainer.innerHTML = items.map(item => `
                <div class="bar-item">
                    <div class="bar-label">
                        <span>${item.name}</span>
                        <span class="bar-value">${formatNumber(item.value)}</span>
                    </div>
                    <div class="bar-track">
                        <div class="bar-fill" style="width:${Math.min(100, (item.value / Math.max(data.visitas || 1, 1)) * 100)}%; background:${item.color};"></div>
                    </div>
                </div>
            `).join('');
        }
    } catch (e) {
        console.error('Dashboard error:', e);
    }
}

function formatNumber(n) {
    if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
    if (n >= 1000) return (n / 1000).toFixed(1) + 'k';
    return n.toLocaleString();
}

// ========== PROJECTS CRUD ==========
const addProjectBtn = document.getElementById('addProjectBtn');
const projectForm = document.getElementById('projectForm');
const projectFormEl = document.getElementById('projectFormEl');
const closeForm = document.getElementById('closeForm');
const cancelForm = document.getElementById('cancelForm');

addProjectBtn.addEventListener('click', () => {
    document.getElementById('formTitle').textContent = 'Agregar Proyecto';
    projectFormEl.reset();
    document.getElementById('projectId').value = '';
    projectForm.style.display = 'block';
});

closeForm.addEventListener('click', () => projectForm.style.display = 'none');
cancelForm.addEventListener('click', () => projectForm.style.display = 'none');

projectFormEl.addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = document.getElementById('projectId').value;
    const data = {
        titulo: document.getElementById('pTitulo').value.trim(),
        descripcion: document.getElementById('pDescripcion').value.trim(),
        imagen: document.getElementById('pImagen').value.trim(),
        link: document.getElementById('pLink').value.trim(),
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    };

    try {
        if (id) {
            await db.collection('projects').doc(id).update(data);
            showToast('Proyecto actualizado');
        } else {
            data.createdAt = firebase.firestore.FieldValue.serverTimestamp();
            await db.collection('projects').add(data);
            showToast('Proyecto creado');
        }
        projectForm.style.display = 'none';
        loadProjects();
    } catch (e) {
        showToast('Error al guardar', 'error');
    }
});

async function loadProjects() {
    const container = document.getElementById('projectsList');
    container.innerHTML = '<div class="spinner"></div>';

    try {
        const snapshot = await db.collection('projects').orderBy('createdAt', 'desc').get();
        if (snapshot.empty) {
            container.innerHTML = '<div class="empty-state"><p>No hay proyectos aún. ¡Agrega el primero!</p></div>';
            return;
        }

        container.innerHTML = '';
        snapshot.forEach(doc => {
            const p = doc.data();
            const card = document.createElement('div');
            card.className = 'project-admin-card';
            card.innerHTML = `
                <div class="pac-image">
                    <img src="${p.imagen || 'https://via.placeholder.com/120x80/1a1a2e/7c3aed?text=IMG'}" alt="${p.titulo}"
                         onerror="this.src='https://via.placeholder.com/120x80/1a1a2e/7c3aed?text=IMG'">
                </div>
                <div class="pac-info">
                    <h4>${p.titulo || 'Sin título'}</h4>
                    <p>${(p.descripcion || '').substring(0, 80)}${(p.descripcion || '').length > 80 ? '...' : ''}</p>
                    ${p.link ? `<a href="${p.link}" target="_blank" class="pac-link">${p.link.substring(0, 40)}...</a>` : ''}
                </div>
                <div class="pac-actions">
                    <button class="pac-btn edit" onclick="editProject('${doc.id}')" title="Editar">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                    </button>
                    <button class="pac-btn delete" onclick="confirmDelete('${doc.id}', '${(p.titulo || '').replace(/'/g, '')}')" title="Eliminar">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                    </button>
                </div>
            `;
            container.appendChild(card);
        });
    } catch (e) {
        container.innerHTML = '<div class="empty-state"><p>Error al cargar proyectos</p></div>';
    }
}

async function editProject(id) {
    try {
        const doc = await db.collection('projects').doc(id).get();
        const p = doc.data();
        document.getElementById('formTitle').textContent = 'Editar Proyecto';
        document.getElementById('projectId').value = id;
        document.getElementById('pTitulo').value = p.titulo || '';
        document.getElementById('pDescripcion').value = p.descripcion || '';
        document.getElementById('pImagen').value = p.imagen || '';
        document.getElementById('pLink').value = p.link || '';
        projectForm.style.display = 'block';
        projectForm.scrollIntoView({ behavior: 'smooth' });
    } catch (e) {
        showToast('Error al cargar proyecto', 'error');
    }
}

// Delete confirmation
let deleteId = '';
function confirmDelete(id, title) {
    deleteId = id;
    document.getElementById('modalTitle').textContent = 'Eliminar Proyecto';
    document.getElementById('modalMessage').textContent = `¿Eliminar "${title}"? Esta acción no se puede deshacer.`;
    document.getElementById('modalOverlay').style.display = 'flex';
}

document.getElementById('modalCancel').addEventListener('click', () => {
    document.getElementById('modalOverlay').style.display = 'none';
});

document.getElementById('modalConfirm').addEventListener('click', async () => {
    if (deleteId) {
        try {
            await db.collection('projects').doc(deleteId).delete();
            showToast('Proyecto eliminado');
            loadProjects();
        } catch (e) {
            showToast('Error al eliminar', 'error');
        }
    }
    document.getElementById('modalOverlay').style.display = 'none';
});

// ========== MESSAGES ==========
async function loadMessages() {
    const container = document.getElementById('messagesList');
    container.innerHTML = '<div class="spinner"></div>';

    try {
        const snapshot = await db.collection('mensajes').orderBy('fecha', 'desc').get();
        if (snapshot.empty) {
            container.innerHTML = '<div class="empty-state"><p>No hay mensajes</p></div>';
            return;
        }

        container.innerHTML = '';
        snapshot.forEach(doc => {
            const m = doc.data();
            const date = m.fecha ? m.fecha.toDate().toLocaleDateString('es', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Sin fecha';
            const card = document.createElement('div');
            card.className = 'message-card';
            card.innerHTML = `
                <div class="msg-header">
                    <div class="msg-avatar">${(m.nombre || 'U')[0].toUpperCase()}</div>
                    <div class="msg-info">
                        <strong>${m.nombre || 'Anónimo'}</strong>
                        <span>${m.email || ''}</span>
                    </div>
                    <span class="msg-date">${date}</span>
                </div>
                <p class="msg-body">${m.mensaje || ''}</p>
                <button class="msg-delete" onclick="deleteMessage('${doc.id}')">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                </button>
            `;
            container.appendChild(card);
        });
    } catch (e) {
        container.innerHTML = '<div class="empty-state"><p>Error al cargar mensajes</p></div>';
    }
}

async function deleteMessage(id) {
    try {
        await db.collection('mensajes').doc(id).delete();
        showToast('Mensaje eliminado');
        loadMessages();
    } catch (e) {
        showToast('Error', 'error');
    }
}

// ========== TOAST ==========
function showToast(msg, type = 'success') {
    const toast = document.getElementById('toast');
    toast.textContent = msg;
    toast.className = `toast ${type} show`;
    setTimeout(() => toast.classList.remove('show'), 3000);
}

/* ============================================
   LIMBER HUAYCHO - PUBLIC APP LOGIC
   Firebase + Animations + Tracking
   ============================================ */

// Firebase Config
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
const db = firebase.firestore();

// ========== NAVBAR ==========
const navbar = document.getElementById('navbar');
const navToggle = document.getElementById('navToggle');
const navLinks = document.getElementById('navLinks');

window.addEventListener('scroll', () => {
    navbar.classList.toggle('scrolled', window.scrollY > 50);
});

navToggle.addEventListener('click', () => {
    navToggle.classList.toggle('active');
    navLinks.classList.toggle('open');
});

document.querySelectorAll('.nav-link').forEach(link => {
    link.addEventListener('click', () => {
        navToggle.classList.remove('active');
        navLinks.classList.remove('open');
    });
});

// Active link on scroll
const sections = document.querySelectorAll('section[id]');
window.addEventListener('scroll', () => {
    const scrollY = window.scrollY + 100;
    sections.forEach(section => {
        const top = section.offsetTop;
        const height = section.offsetHeight;
        const id = section.getAttribute('id');
        const link = document.querySelector(`.nav-link[href="#${id}"]`);
        if (link) {
            link.classList.toggle('active', scrollY >= top && scrollY < top + height);
        }
    });
});

// ========== SCROLL ANIMATIONS ==========
const observerOptions = { threshold: 0.15, rootMargin: '0px 0px -50px 0px' };
const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.classList.add('visible');
        }
    });
}, observerOptions);

document.querySelectorAll('.glass-card, .section-header, .hero-visual').forEach(el => {
    el.classList.add('fade-in');
    observer.observe(el);
});

// ========== LOAD PROJECTS FROM FIREBASE ==========
async function loadProjects() {
    const grid = document.getElementById('projectsGrid');
    const empty = document.getElementById('projectsEmpty');

    try {
        const snapshot = await db.collection('projects').orderBy('createdAt', 'desc').get();

        if (snapshot.empty) {
            empty.style.display = 'block';
            return;
        }

        grid.innerHTML = '';
        snapshot.forEach(doc => {
            const p = doc.data();
            const card = document.createElement('div');
            card.className = 'project-card fade-in';
            card.innerHTML = `
                <div class="project-image-wrapper">
                    <img src="${p.imagen || 'https://via.placeholder.com/400x200/1a1a2e/7c3aed?text=Proyecto'}" 
                         alt="${p.titulo}" class="project-image" loading="lazy"
                         onerror="this.src='https://via.placeholder.com/400x200/1a1a2e/7c3aed?text=Proyecto'">
                </div>
                <div class="project-body">
                    <h3>${p.titulo || 'Sin título'}</h3>
                    <p>${p.descripcion || ''}</p>
                    ${p.link ? `<a href="${p.link}" target="_blank" class="project-link" onclick="trackClick('project_${doc.id}')">Ver proyecto</a>` : ''}
                </div>
            `;
            grid.appendChild(card);
            observer.observe(card);
        });
    } catch (err) {
        console.error('Error loading projects:', err);
        empty.style.display = 'block';
    }
}

loadProjects();

// ========== VISIT COUNTER ==========
async function trackVisit() {
    try {
        const ref = db.collection('stats').doc('general');
        await ref.set({ visitas: firebase.firestore.FieldValue.increment(1) }, { merge: true });
    } catch (e) {
        console.log('Visit tracking error:', e);
    }
}

trackVisit();

// ========== CLICK TRACKING ==========
async function trackClick(type) {
    try {
        const ref = db.collection('stats').doc('general');
        const field = `clicks_${type}`;
        await ref.set({ [field]: firebase.firestore.FieldValue.increment(1) }, { merge: true });
    } catch (e) {
        console.log('Click tracking error:', e);
    }
}

// Social buttons tracking
document.getElementById('btn-whatsapp')?.addEventListener('click', () => trackClick('whatsapp'));
document.getElementById('btn-github')?.addEventListener('click', () => trackClick('github'));
document.getElementById('btn-youtube')?.addEventListener('click', () => trackClick('youtube'));

// ========== CONTACT FORM ==========
document.getElementById('contactForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = document.getElementById('name').value.trim();
    const email = document.getElementById('email').value.trim();
    const message = document.getElementById('message').value.trim();

    if (!name || !email || !message) return;

    try {
        await db.collection('mensajes').add({
            nombre: name,
            email: email,
            mensaje: message,
            fecha: firebase.firestore.FieldValue.serverTimestamp()
        });
        showToast('¡Mensaje enviado con éxito!', 'success');
        e.target.reset();
    } catch (err) {
        showToast('Error al enviar el mensaje', 'error');
    }
});

// ========== TOAST NOTIFICATIONS ==========
function showToast(msg, type = 'success') {
    let toast = document.querySelector('.toast');
    if (!toast) {
        toast = document.createElement('div');
        toast.className = 'toast';
        document.body.appendChild(toast);
    }
    toast.textContent = msg;
    toast.className = `toast ${type}`;
    requestAnimationFrame(() => toast.classList.add('show'));
    setTimeout(() => toast.classList.remove('show'), 3000);
}

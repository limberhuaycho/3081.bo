// firebase-config.js
// Config compartida para index.html (público) y privado.html (admin)

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
const auth = firebase.auth();

// Datos generales del negocio (se reutilizan en varias pantallas)
const ADMIN_EMAIL = "limberhuaychoquispe81@gmail.com";
const WHATSAPP_NUMERO = "59173265343"; // 591 73265343
const DIAS_CONGELADO_LIMITE = 5;
const DIAS_FINALIZADO_LIMITE = 5;

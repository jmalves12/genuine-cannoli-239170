// Configuração do projeto Firebase "organizador-719-2026".
// Estes valores identificam o projeto publicamente e não são segredos —
// a proteção real dos dados vem das regras de segurança do Firestore
// (cada usuário só acessa o próprio documento).
const firebaseConfig = {
  apiKey: "AIzaSyCJFcme1MRlXc3VwIko4sPeBUeNaOhZKi0",
  authDomain: "organizador-719-2026.firebaseapp.com",
  projectId: "organizador-719-2026",
  storageBucket: "organizador-719-2026.firebasestorage.app",
  messagingSenderId: "419496775122",
  appId: "1:419496775122:web:9e4ddc3d363f16e1b10c0b"
};

firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();
const storage = firebase.storage();

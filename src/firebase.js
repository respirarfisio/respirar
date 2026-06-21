// src/firebase.js
// ─────────────────────────────────────────────────────────────
// Substitua os valores abaixo pelos do seu projeto Firebase
// Console → Configurações do projeto → Seus apps → SDK
// ─────────────────────────────────────────────────────────────
import { initializeApp } from 'firebase/app'
import { getFirestore, enableIndexedDbPersistence } from 'firebase/firestore'
import { getAuth, GoogleAuthProvider } from 'firebase/auth'

const firebaseConfig = {
  apiKey:            "AIzaSyBmJqDm8oIALoJ30LliE-O_EnMpDuqCO6w",
  authDomain: "respirar-214d9.firebaseapp.com",
  projectId: "respirar-214d9",
  storageBucket: "respirar-214d9.firebasestorage.app",
  messagingSenderId: "835258619817",
  appId: "1:835258619817:web:fa3c6af49faf8833ba16b8",
}

const app = initializeApp(firebaseConfig)

export const db       = getFirestore(app)
export const auth     = getAuth(app)
export const provider = new GoogleAuthProvider()

// ── Persistência offline ────────────────────────────────────────────────
// Permite ler dados em cache e enfileirar gravações quando sem internet.
// Tudo é sincronizado automaticamente quando a conexão volta.
enableIndexedDbPersistence(db).catch((err) => {
  if (err.code === 'failed-precondition') {
    // Mais de uma aba do app aberta — a persistência só funciona em uma aba por vez.
    console.warn('Persistência offline ativa em outra aba.')
  } else if (err.code === 'unimplemented') {
    // Navegador sem suporte a IndexedDB (raro)
    console.warn('Este navegador não suporta persistência offline.')
  }
})

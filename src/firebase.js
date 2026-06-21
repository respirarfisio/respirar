// src/firebase.js
// ─────────────────────────────────────────────────────────────
// Substitua os valores abaixo pelos do seu projeto Firebase
// Console → Configurações do projeto → Seus apps → SDK
// ─────────────────────────────────────────────────────────────
import { initializeApp } from 'firebase/app'
import { getFirestore } from 'firebase/firestore'
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

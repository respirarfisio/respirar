// src/firebase.js
// ─────────────────────────────────────────────────────────────
// Substitua os valores abaixo pelos do seu projeto Firebase
// Console → Configurações do projeto → Seus apps → SDK
// ─────────────────────────────────────────────────────────────
import { initializeApp } from 'firebase/app'
import { getFirestore } from 'firebase/firestore'
import { getAuth, GoogleAuthProvider } from 'firebase/auth'

const firebaseConfig = {
  apiKey:            "SUA_API_KEY",
  authDomain:        "SEU_PROJETO.firebaseapp.com",
  projectId:         "SEU_PROJETO",
  storageBucket:     "SEU_PROJETO.appspot.com",
  messagingSenderId: "SEU_MESSAGING_SENDER_ID",
  appId:             "SEU_APP_ID",
}

const app = initializeApp(firebaseConfig)

export const db       = getFirestore(app)
export const auth     = getAuth(app)
export const provider = new GoogleAuthProvider()

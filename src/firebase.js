// src/firebase.js
// ───────────────────────────────────────────────
// 1. Acesse https://console.firebase.google.com
// 2. Crie um projeto → adicione um app Web
// 3. Copie os valores abaixo da configuração do SDK
// ───────────────────────────────────────────────
import { initializeApp } from 'firebase/app'
import { getFirestore } from 'firebase/firestore'

const firebaseConfig = {
  apiKey:            "SUA_API_KEY",
  authDomain:        "SEU_PROJETO.firebaseapp.com",
  projectId:         "SEU_PROJETO",
  storageBucket:     "SEU_PROJETO.appspot.com",
  messagingSenderId: "SEU_MESSAGING_SENDER_ID",
  appId:             "SEU_APP_ID",
}

const app = initializeApp(firebaseConfig)
export const db = getFirestore(app)

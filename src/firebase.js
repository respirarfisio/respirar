// src/firebase.js
// ───────────────────────────────────────────────
// 1. Acesse https://console.firebase.google.com
// 2. Crie um projeto → adicione um app Web
// 3. Copie os valores abaixo da configuração do SDK
// ───────────────────────────────────────────────
import { initializeApp } from 'firebase/app'
import { getFirestore } from 'firebase/firestore'

const firebaseConfig = {
  apiKey:            "AIzaSyBmJqDm8oIALoJ30LliE-O_EnMpDuqCO6w",
  authDomain:        "respirar-214d9.firebaseapp.com",
  projectId:         "respirar-214d9",
  storageBucket:     "respirar-214d9.firebasestorage.app",
  messagingSenderId: "835258619817",
  appId:             "1:835258619817:web:fa3c6af49faf8833ba16b8",
}

const app = initializeApp(firebaseConfig)
export const db = getFirestore(app)

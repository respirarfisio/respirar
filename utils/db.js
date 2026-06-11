// src/utils/db.js
import {
  collection, doc, addDoc, updateDoc, deleteDoc,
  getDocs, getDoc, query, orderBy, serverTimestamp,
} from 'firebase/firestore'
import { db } from '../firebase'

// ── Pacientes ──────────────────────────────────────────────────────────────

export async function listarPacientes() {
  const q = query(collection(db, 'pacientes'), orderBy('nome'))
  const snap = await getDocs(q)
  return snap.docs.map(d => ({ id: d.id, ...d.data() }))
}

export async function getPaciente(id) {
  const snap = await getDoc(doc(db, 'pacientes', id))
  if (!snap.exists()) return null
  return { id: snap.id, ...snap.data() }
}

export async function salvarPaciente(dados) {
  if (dados.id) {
    const ref = doc(db, 'pacientes', dados.id)
    const { id, ...rest } = dados
    await updateDoc(ref, { ...rest, atualizadoEm: serverTimestamp() })
    return dados.id
  }
  const ref = await addDoc(collection(db, 'pacientes'), {
    ...dados,
    criadoEm: serverTimestamp(),
  })
  return ref.id
}

export async function excluirPaciente(id) {
  // exclui também todas as avaliações
  const avs = await listarAvaliacoes(id)
  await Promise.all(avs.map(a => excluirAvaliacao(id, a.id)))
  await deleteDoc(doc(db, 'pacientes', id))
}

// ── Avaliações ─────────────────────────────────────────────────────────────

export async function listarAvaliacoes(pacienteId) {
  const q = query(
    collection(db, 'pacientes', pacienteId, 'avaliacoes'),
    orderBy('data', 'desc'),
  )
  const snap = await getDocs(q)
  return snap.docs.map(d => ({ id: d.id, ...d.data() }))
}

export async function getAvaliacao(pacienteId, avaliacaoId) {
  const snap = await getDoc(
    doc(db, 'pacientes', pacienteId, 'avaliacoes', avaliacaoId),
  )
  if (!snap.exists()) return null
  return { id: snap.id, ...snap.data() }
}

export async function salvarAvaliacao(pacienteId, dados) {
  const colRef = collection(db, 'pacientes', pacienteId, 'avaliacoes')
  if (dados.id) {
    const ref = doc(colRef, dados.id)
    const { id, ...rest } = dados
    await updateDoc(ref, { ...rest, atualizadoEm: serverTimestamp() })
    return dados.id
  }
  const ref = await addDoc(colRef, {
    ...dados,
    criadoEm: serverTimestamp(),
  })
  return ref.id
}

export async function excluirAvaliacao(pacienteId, avaliacaoId) {
  await deleteDoc(doc(db, 'pacientes', pacienteId, 'avaliacoes', avaliacaoId))
}

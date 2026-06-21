// src/components/Sessoes.jsx — evolução de sessões (notas SOAP)
import { useEffect, useState } from 'react'
import { NotebookPen, Plus, Trash2, ChevronDown, ChevronUp } from 'lucide-react'
import {
  collection, getDocs, addDoc, deleteDoc, doc, query, orderBy, serverTimestamp,
} from 'firebase/firestore'
import { db } from '../firebase'
import { fmtDate } from '../utils/avaliacao'

export default function Sessoes({ pacienteId }) {
  const [sessoes, setSessoes] = useState([])
  const [aberto, setAberto]   = useState(false)
  const [salvando, setSalvando] = useState(false)
  const [form, setForm] = useState({
    data: new Date().toISOString().slice(0, 10),
    subjetivo: '', objetivo: '', avaliacao: '', plano: '',
  })

  useEffect(() => { carregar() }, [pacienteId])

  async function carregar() {
    const q = query(collection(db, 'pacientes', pacienteId, 'sessoes'), orderBy('data', 'desc'))
    const snap = await getDocs(q)
    setSessoes(snap.docs.map(d => ({ id: d.id, ...d.data() })))
  }

  async function salvar() {
    if (!form.subjetivo && !form.objetivo && !form.avaliacao && !form.plano) return
    setSalvando(true)
    await addDoc(collection(db, 'pacientes', pacienteId, 'sessoes'), {
      ...form, criadoEm: serverTimestamp(),
    })
    setForm({ data: new Date().toISOString().slice(0, 10), subjetivo: '', objetivo: '', avaliacao: '', plano: '' })
    setAberto(false)
    await carregar()
    setSalvando(false)
  }

  async function excluir(id) {
    if (!confirm('Excluir esta sessão?')) return
    await deleteDoc(doc(db, 'pacientes', pacienteId, 'sessoes', id))
    await carregar()
  }

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  return (
    <div className="card" style={{ marginBottom: 14 }}>
      <div className="flex-center gap-10" style={{ marginBottom: aberto || sessoes.length ? 12 : 0 }}>
        <div className="section-icon"><NotebookPen size={16} /></div>
        <h2 style={{ flex: 1 }}>Evolução de sessões ({sessoes.length})</h2>
        <button className="btn-soft" onClick={() => setAberto(a => !a)}>
          {aberto ? <ChevronUp size={15} /> : <Plus size={15} />} {aberto ? 'Fechar' : 'Nova sessão'}
        </button>
      </div>

      {/* Formulário SOAP */}
      {aberto && (
        <div style={{ padding: 14, background: 'var(--bg)', borderRadius: 12, marginBottom: 12 }}>
          <label style={{ display: 'block', marginBottom: 10 }}>
            <span className="lbl">Data da sessão</span>
            <input className="inp" type="date" style={{ maxWidth: 200 }}
              value={form.data} onChange={e => set('data', e.target.value)} />
          </label>
          {[
            ['subjetivo', 'S — Subjetivo (queixas, relato do paciente)'],
            ['objetivo', 'O — Objetivo (sinais, dados mensuráveis, conduta realizada)'],
            ['avaliacao', 'A — Avaliação (interpretação clínica, evolução)'],
            ['plano', 'P — Plano (próximos passos, orientações)'],
          ].map(([k, lbl]) => (
            <label key={k} style={{ display: 'block', marginBottom: 10 }}>
              <span className="lbl">{lbl}</span>
              <textarea className="inp" rows={2} value={form[k]} onChange={e => set(k, e.target.value)} />
            </label>
          ))}
          <button className="btn-primary" onClick={salvar} disabled={salvando}>
            {salvando ? <span className="spinner" /> : <Plus size={15} />} Salvar sessão
          </button>
        </div>
      )}

      {/* Lista */}
      {sessoes.length > 0 && (
        <div style={{ display: 'grid', gap: 8 }}>
          {sessoes.map(s => (
            <SessaoItem key={s.id} sessao={s} onDelete={() => excluir(s.id)} />
          ))}
        </div>
      )}
    </div>
  )
}

function SessaoItem({ sessao, onDelete }) {
  const [exp, setExp] = useState(false)
  const resumo = sessao.objetivo || sessao.subjetivo || sessao.plano || '—'
  return (
    <div style={{ background: 'var(--bg)', borderRadius: 10, overflow: 'hidden' }}>
      <button onClick={() => setExp(e => !e)}
        style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left' }}>
        <div style={{ fontWeight: 650, fontSize: 13.5, color: 'var(--navy)', whiteSpace: 'nowrap' }}>
          {fmtDate(sessao.data)}
        </div>
        <div className="text-sub" style={{ flex: 1, fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: exp ? 'normal' : 'nowrap' }}>
          {resumo}
        </div>
        {exp ? <ChevronUp size={15} color="var(--sub)" /> : <ChevronDown size={15} color="var(--sub)" />}
      </button>
      {exp && (
        <div style={{ padding: '0 14px 12px' }}>
          {[['S', sessao.subjetivo], ['O', sessao.objetivo], ['A', sessao.avaliacao], ['P', sessao.plano]]
            .filter(([, v]) => v)
            .map(([k, v]) => (
              <div key={k} style={{ marginBottom: 8 }}>
                <span style={{ fontWeight: 700, fontSize: 12, color: 'var(--teal-dark)' }}>{k}</span>
                <p style={{ fontSize: 13.5, lineHeight: 1.55 }}>{v}</p>
              </div>
            ))}
          <button className="btn-danger" style={{ padding: '5px 10px', fontSize: 12 }} onClick={onDelete}>
            <Trash2 size={13} /> Excluir
          </button>
        </div>
      )}
    </div>
  )
}

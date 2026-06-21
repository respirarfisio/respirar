// src/pages/Prescricao.jsx — prescrição de exercícios com biblioteca reutilizável
import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Plus, Trash2, Dumbbell, BookOpen, Check, Printer } from 'lucide-react'
import {
  collection, getDocs, addDoc, deleteDoc, doc, serverTimestamp, writeBatch,
} from 'firebase/firestore'
import { db } from '../firebase'
import { getPaciente, salvarPaciente } from '../utils/db'
import { BIBLIOTECA_PADRAO } from '../utils/bibliotecaExercicios'

const CATEGORIAS = [
  'Treino Muscular Inspiratório', 'Exercícios Respiratórios', 'Higiene Brônquica',
  'Aeróbio', 'Fortalecimento MMII', 'Fortalecimento MMSS',
  'Equilíbrio', 'Alongamento', 'Neurofuncional', 'Funcional', 'Outro',
]

export default function Prescricao() {
  const { pid } = useParams()
  const nav = useNavigate()

  const [paciente, setPaciente]   = useState(null)
  const [biblioteca, setBiblioteca] = useState([])
  const [prescricao, setPrescricao] = useState([])
  const [loading, setLoading]     = useState(true)
  const [salvando, setSalvando]   = useState(false)
  const [msg, setMsg]             = useState('')

  // novo exercício na biblioteca
  const [novoNome, setNovoNome] = useState('')
  const [novaCat, setNovaCat]   = useState(CATEGORIAS[0])
  const [novaDesc, setNovaDesc] = useState('')

  useEffect(() => {
    (async () => {
      const [p, snap] = await Promise.all([
        getPaciente(pid),
        getDocs(collection(db, 'exercicios')),
      ])
      setPaciente(p)
      setPrescricao(p?.prescricao ?? [])

      // Primeiro acesso: biblioteca vazia → carrega a biblioteca padrão
      if (snap.empty) {
        const batch = writeBatch(db)
        BIBLIOTECA_PADRAO.forEach(ex => {
          const ref = doc(collection(db, 'exercicios'))
          batch.set(ref, { ...ex, criadoEm: serverTimestamp() })
        })
        await batch.commit()
        const novoSnap = await getDocs(collection(db, 'exercicios'))
        setBiblioteca(novoSnap.docs.map(d => ({ id: d.id, ...d.data() })))
      } else {
        setBiblioteca(snap.docs.map(d => ({ id: d.id, ...d.data() })))
      }
      setLoading(false)
    })()
  }, [pid])

  async function addBiblioteca() {
    if (!novoNome.trim()) return
    const ref = await addDoc(collection(db, 'exercicios'), {
      nome: novoNome.trim(), categoria: novaCat, descricao: novaDesc.trim(),
      criadoEm: serverTimestamp(),
    })
    setBiblioteca(b => [...b, { id: ref.id, nome: novoNome.trim(), categoria: novaCat, descricao: novaDesc.trim() }])
    setNovoNome(''); setNovaDesc('')
  }

  async function delBiblioteca(id) {
    if (!confirm('Remover este exercício da biblioteca?')) return
    await deleteDoc(doc(db, 'exercicios', id))
    setBiblioteca(b => b.filter(e => e.id !== id))
  }

  function addPrescricao(ex) {
    if (prescricao.some(p => p.exercicioId === ex.id)) return
    setPrescricao(p => [...p, {
      exercicioId: ex.id, nome: ex.nome, categoria: ex.categoria, descricao: ex.descricao,
      series: ex.series || '3', repeticoes: ex.repeticoes || '10',
      frequencia: ex.frequencia || '3x/semana', obs: ex.obs || '',
    }])
  }

  function updPrescricao(i, k, v) {
    setPrescricao(p => p.map((item, j) => j === i ? { ...item, [k]: v } : item))
  }

  function delPrescricao(i) {
    setPrescricao(p => p.filter((_, j) => j !== i))
  }

  async function salvar() {
    setSalvando(true)
    await salvarPaciente({ ...paciente, prescricao })
    setMsg('✅ Prescrição salva! Ela aparecerá no relatório do paciente.')
    setSalvando(false)
  }

  if (loading) return <div style={{ textAlign: 'center', padding: 48 }}><span className="spinner" /></div>

  const porCategoria = {}
  biblioteca.forEach(ex => {
    (porCategoria[ex.categoria] = porCategoria[ex.categoria] ?? []).push(ex)
  })

  return (
    <>
      <div className="flex-center gap-10" style={{ marginBottom: 18 }}>
        <button className="btn-ghost" onClick={() => nav(`/paciente/${pid}`)} style={{ padding: '9px 12px' }}>
          <ArrowLeft size={18} />
        </button>
        <div style={{ flex: 1 }}>
          <h1>Prescrição de Exercícios</h1>
          <p className="text-sub">{paciente.nome}</p>
        </div>
        <button className="btn-primary" onClick={salvar} disabled={salvando}>
          {salvando ? <span className="spinner" /> : <Check size={16} />} Salvar prescrição
        </button>
      </div>

      {msg && (
        <div style={{ marginBottom: 14, padding: '10px 14px', background: 'var(--good-bg)', color: 'var(--good)', borderRadius: 10, fontSize: 13.5 }}>
          {msg}
        </div>
      )}

      {/* Prescrição atual */}
      <div className="card" style={{ marginBottom: 14 }}>
        <div className="flex-center gap-10" style={{ marginBottom: 12 }}>
          <div className="section-icon"><Dumbbell size={16} /></div>
          <h2>Prescrição atual ({prescricao.length})</h2>
        </div>

        {prescricao.length === 0 && (
          <p className="text-sub">Nenhum exercício prescrito. Adicione da biblioteca abaixo.</p>
        )}

        <div style={{ display: 'grid', gap: 10 }}>
          {prescricao.map((item, i) => (
            <div key={i} style={{ padding: '12px 14px', background: 'var(--bg)', borderRadius: 12 }}>
              <div className="flex-center gap-10" style={{ marginBottom: 10 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 650, fontSize: 14 }}>{item.nome}</div>
                  <div className="text-sub" style={{ fontSize: 12 }}>{item.categoria}</div>
                </div>
                <button className="btn-danger" style={{ padding: '6px 9px' }} onClick={() => delPrescricao(i)}>
                  <Trash2 size={14} />
                </button>
              </div>
              <div className="grid-3" style={{ gap: 8 }}>
                <label>
                  <span className="lbl" style={{ fontSize: 11.5 }}>Séries</span>
                  <input className="inp" style={{ padding: '7px 10px', fontSize: 13 }}
                    value={item.series} onChange={e => updPrescricao(i, 'series', e.target.value)} />
                </label>
                <label>
                  <span className="lbl" style={{ fontSize: 11.5 }}>Repetições / duração</span>
                  <input className="inp" style={{ padding: '7px 10px', fontSize: 13 }}
                    value={item.repeticoes} onChange={e => updPrescricao(i, 'repeticoes', e.target.value)} />
                </label>
                <label>
                  <span className="lbl" style={{ fontSize: 11.5 }}>Frequência</span>
                  <input className="inp" style={{ padding: '7px 10px', fontSize: 13 }}
                    value={item.frequencia} onChange={e => updPrescricao(i, 'frequencia', e.target.value)} />
                </label>
              </div>
              <input className="inp mt-8" style={{ padding: '7px 10px', fontSize: 13 }}
                placeholder="Observações (carga, progressão, cuidados...)"
                value={item.obs} onChange={e => updPrescricao(i, 'obs', e.target.value)} />
            </div>
          ))}
        </div>
      </div>

      {/* Biblioteca */}
      <div className="card" style={{ marginBottom: 14 }}>
        <div className="flex-center gap-10" style={{ marginBottom: 12 }}>
          <div className="section-icon"><BookOpen size={16} /></div>
          <h2>Biblioteca de exercícios</h2>
        </div>

        {Object.entries(porCategoria).map(([cat, exs]) => (
          <div key={cat} style={{ marginBottom: 14 }}>
            <h3 style={{ marginBottom: 8 }}>{cat}</h3>
            <div style={{ display: 'grid', gap: 6 }}>
              {exs.map(ex => {
                const jaAdicionado = prescricao.some(p => p.exercicioId === ex.id)
                return (
                  <div key={ex.id} className="flex-center gap-10"
                    style={{ padding: '8px 12px', background: 'var(--bg)', borderRadius: 10 }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600, fontSize: 13.5 }}>{ex.nome}</div>
                      {ex.descricao && <div className="text-sub" style={{ fontSize: 12 }}>{ex.descricao}</div>}
                    </div>
                    <button className={jaAdicionado ? 'btn-ghost' : 'btn-soft'}
                      style={{ padding: '6px 10px', fontSize: 12.5 }}
                      disabled={jaAdicionado}
                      onClick={() => addPrescricao(ex)}>
                      {jaAdicionado ? '✓ Adicionado' : <><Plus size={13} /> Prescrever</>}
                    </button>
                    <button className="btn-danger" style={{ padding: '6px 9px' }} onClick={() => delBiblioteca(ex.id)}>
                      <Trash2 size={13} />
                    </button>
                  </div>
                )
              })}
            </div>
          </div>
        ))}

        {biblioteca.length === 0 && (
          <p className="text-sub">Biblioteca vazia. Cadastre o primeiro exercício abaixo — ele fica disponível para todos os pacientes.</p>
        )}
      </div>

      {/* Novo exercício */}
      <div className="card">
        <h2 style={{ marginBottom: 12 }}>Cadastrar exercício na biblioteca</h2>
        <div className="grid-2" style={{ marginBottom: 10 }}>
          <label>
            <span className="lbl">Nome</span>
            <input className="inp" placeholder="Ex: Caminhada em esteira"
              value={novoNome} onChange={e => setNovoNome(e.target.value)} />
          </label>
          <label>
            <span className="lbl">Categoria</span>
            <select className="inp" value={novaCat} onChange={e => setNovaCat(e.target.value)}>
              {CATEGORIAS.map(c => <option key={c}>{c}</option>)}
            </select>
          </label>
        </div>
        <label>
          <span className="lbl">Descrição / instruções</span>
          <textarea className="inp" rows={2} value={novaDesc} onChange={e => setNovaDesc(e.target.value)} />
        </label>
        <button className="btn-primary mt-12" onClick={addBiblioteca} disabled={!novoNome.trim()}>
          <Plus size={15} /> Adicionar à biblioteca
        </button>
      </div>
    </>
  )
}

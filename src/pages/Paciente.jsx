// src/pages/Paciente.jsx
import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Plus, FileText, Calendar, Pencil, Trash2, TrendingUp, FileSignature, Dumbbell } from 'lucide-react'
import Sessoes from '../components/Sessoes'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine, ResponsiveContainer, Legend,
} from 'recharts'
import {
  getPaciente, salvarPaciente, excluirPaciente,
  listarAvaliacoes, excluirAvaliacao,
} from '../utils/db'
import {
  predPImax, predGrip, pct, r1, num,
} from '../calc/referencias'
import { fmtDate } from '../utils/avaliacao'

// ── Formulário do paciente ─────────────────────────────────────────────────
function PacienteForm({ paciente, onSaved, onCancel }) {
  const [form, setForm] = useState(
    paciente ?? { nome: '', sexo: 'M', idade: '', peso: '', altura: '', medico: '', historico: '' }
  )
  const [saving, setSaving] = useState(false)
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))
  const ok = form.nome.trim() && form.idade

  async function handleSave() {
    setSaving(true)
    try {
      const id = await salvarPaciente({ ...form, idade: Number(form.idade), peso: Number(form.peso), altura: Number(form.altura) })
      onSaved(id)
    } finally { setSaving(false) }
  }

  return (
    <div className="card">
      <div className="grid-2" style={{ marginBottom: 12 }}>
        {[
          ['Nome completo', 'nome', 'text'],
          ['Médico responsável', 'medico', 'text'],
          ['Idade (anos)', 'idade', 'number'],
          ['Peso (kg)', 'peso', 'number'],
          ['Altura (cm)', 'altura', 'number'],
        ].map(([lbl, key, type]) => (
          <label key={key}>
            <span className="lbl">{lbl}</span>
            <input className="inp" type={type} value={form[key]} onChange={e => set(key, e.target.value)} />
          </label>
        ))}
        <label>
          <span className="lbl">Sexo</span>
          <select className="inp" value={form.sexo} onChange={e => set('sexo', e.target.value)}>
            <option value="M">Masculino</option>
            <option value="F">Feminino</option>
          </select>
        </label>
      </div>
      <label>
        <span className="lbl">História clínica / queixa</span>
        <textarea className="inp" rows={4} value={form.historico} onChange={e => set('historico', e.target.value)} />
      </label>
      <div className="flex gap-10 mt-16">
        <button className="btn-primary" disabled={!ok || saving} onClick={handleSave}>
          {saving ? <span className="spinner" /> : '✓'} Salvar
        </button>
        <button className="btn-ghost" onClick={onCancel}>Cancelar</button>
      </div>
    </div>
  )
}

// ── Gráfico de evolução ────────────────────────────────────────────────────
function Evolucao({ avaliacoes, paciente }) {
  const series = [...avaliacoes]
    .sort((a, b) => a.data.localeCompare(b.data))
    .map(ev => {
      const pim = num(ev.pimax?.obtido)
      const pimP = num(ev.pimax?.predito) ?? r1(predPImax(paciente.idade, paciente.sexo))
      const gr = num(ev.grip?.obtido)
      const grP = num(ev.grip?.predito) ?? r1(predGrip(paciente.idade, paciente.peso, paciente.sexo))
      return {
        data: fmtDate(ev.data).slice(0, 5),
        'PImáx %': pim && pimP ? pct(pim, pimP) : null,
        'Preensão %': gr && grP ? pct(gr, grP) : null,
      }
    })

  return (
    <div className="card" style={{ marginBottom: 14 }}>
      <div className="flex-center gap-10" style={{ marginBottom: 14 }}>
        <div className="section-icon"><TrendingUp size={16} /></div>
        <h2>Evolução entre avaliações</h2>
      </div>
      <ResponsiveContainer width="100%" height={200}>
        <LineChart data={series} margin={{ top: 6, right: 10, left: -12, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
          <XAxis dataKey="data" tick={{ fontSize: 11, fill: 'var(--sub)' }} />
          <YAxis tick={{ fontSize: 11, fill: 'var(--sub)' }} />
          <Tooltip />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <ReferenceLine y={100} stroke="var(--good)" strokeDasharray="4 4" />
          <Line type="monotone" dataKey="PImáx %" stroke="var(--teal)" strokeWidth={2.4} dot={{ r: 3 }} />
          <Line type="monotone" dataKey="Preensão %" stroke="var(--navy)" strokeWidth={2.4} dot={{ r: 3 }} />
        </LineChart>
      </ResponsiveContainer>
      <p className="text-sub" style={{ marginTop: 4 }}>Linha tracejada = 100 % do predito (normalidade).</p>
    </div>
  )
}

// ── Página principal ───────────────────────────────────────────────────────
export default function Paciente() {
  const { pid } = useParams()
  const nav = useNavigate()
  const isNew = !pid || pid === 'novo'

  const [paciente, setPaciente]     = useState(null)
  const [avaliacoes, setAvaliacoes] = useState([])
  const [editing, setEditing]       = useState(isNew)
  const [loading, setLoading]       = useState(!isNew)

  useEffect(() => {
    if (isNew) return
    setLoading(true)
    Promise.all([getPaciente(pid), listarAvaliacoes(pid)])
      .then(([p, avs]) => { setPaciente(p); setAvaliacoes(avs) })
      .finally(() => setLoading(false))
  }, [pid])

  async function handleDelete() {
    if (!confirm('Excluir este paciente e todas as avaliações?')) return
    await excluirPaciente(pid)
    nav('/')
  }

  async function handleDeleteAv(aid) {
    if (!confirm('Excluir esta avaliação?')) return
    await excluirAvaliacao(pid, aid)
    setAvaliacoes(avs => avs.filter(a => a.id !== aid))
  }

  if (loading) return <div style={{ textAlign: 'center', padding: 48 }}><span className="spinner" /></div>

  if (isNew || editing) {
    return (
      <>
        <div className="flex-center gap-10" style={{ marginBottom: 18 }}>
          <button className="btn-ghost" onClick={() => isNew ? nav('/') : setEditing(false)} style={{ padding: '9px 12px' }}>
            <ArrowLeft size={18} />
          </button>
          <h1>{isNew ? 'Novo paciente' : 'Editar paciente'}</h1>
        </div>
        <PacienteForm
          paciente={paciente}
          onSaved={id => nav(isNew ? `/paciente/${id}` : `/paciente/${pid}`)}
          onCancel={() => isNew ? nav('/') : setEditing(false)}
        />
      </>
    )
  }

  return (
    <>
      {/* Header */}
      <div className="flex-center gap-10" style={{ marginBottom: 18 }}>
        <button className="btn-ghost" onClick={() => nav('/')} style={{ padding: '9px 12px' }}>
          <ArrowLeft size={18} />
        </button>
        <div style={{ flex: 1 }}>
          <h1>{paciente.nome}</h1>
          <p className="text-sub">
            {paciente.sexo === 'M' ? 'Masculino' : 'Feminino'} · {paciente.idade} anos
            {paciente.peso ? ` · ${paciente.peso} kg` : ''}
          </p>
        </div>
        <button className="btn-ghost" onClick={() => setEditing(true)}><Pencil size={15} /> Editar</button>
        <button className="btn-primary" onClick={() => nav(`/paciente/${pid}/avaliacao/nova`)}>
          <Plus size={16} /> Nova avaliação
        </button>
      </div>

      {/* Ações rápidas */}
      <div className="flex gap-10" style={{ flexWrap: 'wrap', marginBottom: 14 }}>
        <button className="btn-soft" onClick={() => nav(`/paciente/${pid}/termo`)}>
          <FileSignature size={15} /> Termo de consentimento
        </button>
        <button className="btn-soft" onClick={() => nav(`/paciente/${pid}/prescricao`)}>
          <Dumbbell size={15} /> Prescrição de exercícios
        </button>
      </div>

      {/* História */}
      {paciente.historico && (
        <div className="card" style={{ marginBottom: 14 }}>
          <span className="lbl">História clínica</span>
          <p style={{ lineHeight: 1.6 }}>{paciente.historico}</p>
          {paciente.medico && <p className="text-sub" style={{ marginTop: 6 }}>Médico: {paciente.medico}</p>}
        </div>
      )}

      {/* Evolução de sessões (SOAP) */}
      <Sessoes pacienteId={pid} />

      {/* Evolução */}
      {avaliacoes.length >= 2 && <Evolucao avaliacoes={avaliacoes} paciente={paciente} />}

      {/* Lista de avaliações */}
      <h2 style={{ margin: '6px 2px 10px' }}>Avaliações ({avaliacoes.length})</h2>

      {avaliacoes.length === 0 && (
        <div className="card" style={{ textAlign: 'center', padding: '36px 24px' }}>
          <p className="text-sub">Nenhuma avaliação ainda. Crie a primeira!</p>
        </div>
      )}

      <div style={{ display: 'grid', gap: 10 }}>
        {avaliacoes.map(av => (
          <div key={av.id} className="row-card" style={{ cursor: 'default' }}>
            <div style={{ width: 42, height: 42, borderRadius: 10, background: 'var(--navy)', color: '#fff', display: 'grid', placeItems: 'center' }}>
              <Calendar size={18} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 650 }}>{fmtDate(av.data)}</div>
              <p className="text-sub">{av.objetivo || 'Avaliação funcional'}</p>
            </div>
            <button className="btn-ghost" onClick={() => nav(`/paciente/${pid}/avaliacao/${av.id}`)} style={{ padding: '8px 12px' }}>
              <Pencil size={15} />
            </button>
            <button className="btn-soft" onClick={() => nav(`/paciente/${pid}/avaliacao/${av.id}/relatorio`)}>
              <FileText size={15} /> Relatório
            </button>
            <button className="btn-danger" onClick={() => handleDeleteAv(av.id)} style={{ padding: '8px 12px' }}>
              <Trash2 size={15} />
            </button>
          </div>
        ))}
      </div>

      <button className="btn-danger" style={{ marginTop: 28 }} onClick={handleDelete}>
        <Trash2 size={15} /> Excluir paciente
      </button>
    </>
  )
}

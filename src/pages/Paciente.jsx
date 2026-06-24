// src/pages/Paciente.jsx
import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Plus, FileText, Calendar, Pencil, Trash2, TrendingUp, FileSignature, Dumbbell, Banknote } from 'lucide-react'
import Sessoes from '../components/Sessoes'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine, ResponsiveContainer, Legend,
} from 'recharts'
import {
  getPaciente, salvarPaciente, excluirPaciente,
  listarAvaliacoes, excluirAvaliacao,
} from '../utils/db'
import {
  predPImax, predPEmax, predSindex, predGrip, predTC6, predSTS5, predSTS1, predStepReps,
  predQuadriceps, predBiceps, predCVF, predVEF1, pct, r1, num,
} from '../calc/referencias'
import { fmtDate } from '../utils/avaliacao'

// ── Formulário do paciente ─────────────────────────────────────────────────
// Formata CPF progressivamente: 000.000.000-00
function formatCPF(v) {
  const d = (v || '').replace(/\D/g, '').slice(0, 11)
  if (d.length <= 3) return d
  if (d.length <= 6) return `${d.slice(0,3)}.${d.slice(3)}`
  if (d.length <= 9) return `${d.slice(0,3)}.${d.slice(3,6)}.${d.slice(6)}`
  return `${d.slice(0,3)}.${d.slice(3,6)}.${d.slice(6,9)}-${d.slice(9)}`
}

// Formata telefone progressivamente: (00) 00000-0000 / (00) 0000-0000
function formatTelefone(v) {
  const d = (v || '').replace(/\D/g, '').slice(0, 11)
  if (d.length <= 2) return d.length ? `(${d}` : ''
  if (d.length <= 6) return `(${d.slice(0,2)}) ${d.slice(2)}`
  if (d.length <= 10) return `(${d.slice(0,2)}) ${d.slice(2,6)}-${d.slice(6)}`
  return `(${d.slice(0,2)}) ${d.slice(2,7)}-${d.slice(7)}`
}

function PacienteForm({ paciente, onSaved, onCancel }) {
  const [form, setForm] = useState(
    paciente ?? {
      nome: '', sexo: 'M', idade: '', peso: '', altura: '', medico: '', historico: '',
      cpf: '', telefone: '',
      endereco: { logradouro: '', numero: '', complemento: '', bairro: '', cidade: '', uf: '', cep: '' },
    }
  )
  const [saving, setSaving] = useState(false)
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))
  const setEnd = (k, v) => setForm(f => ({ ...f, endereco: { ...(f.endereco ?? {}), [k]: v } }))
  const ok = form.nome.trim() && form.idade

  async function handleSave() {
    setSaving(true)
    try {
      const id = await salvarPaciente({ ...form, idade: Number(form.idade), peso: Number(form.peso), altura: Number(form.altura) })
      onSaved(id)
    } finally { setSaving(false) }
  }

  const endereco = form.endereco ?? {}

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
        <label>
          <span className="lbl">CPF</span>
          <input className="inp" inputMode="numeric" placeholder="000.000.000-00"
            value={form.cpf ?? ''} onChange={e => set('cpf', formatCPF(e.target.value))} />
        </label>
        <label>
          <span className="lbl">Telefone para contato</span>
          <input className="inp" inputMode="tel" placeholder="(84) 99168-8285"
            value={form.telefone ?? ''} onChange={e => set('telefone', formatTelefone(e.target.value))} />
        </label>
      </div>

      <div className="lbl" style={{ marginBottom: 8 }}>Endereço</div>
      <div className="grid-2" style={{ marginBottom: 12 }}>
        <label>
          <span className="lbl">CEP</span>
          <input className="inp" value={endereco.cep ?? ''} onChange={e => setEnd('cep', e.target.value)} />
        </label>
        <label>
          <span className="lbl">Logradouro (Av./Rua)</span>
          <input className="inp" value={endereco.logradouro ?? ''} onChange={e => setEnd('logradouro', e.target.value)} />
        </label>
        <label>
          <span className="lbl">Número</span>
          <input className="inp" value={endereco.numero ?? ''} onChange={e => setEnd('numero', e.target.value)} />
        </label>
        <label>
          <span className="lbl">Complemento</span>
          <input className="inp" value={endereco.complemento ?? ''} onChange={e => setEnd('complemento', e.target.value)} />
        </label>
        <label>
          <span className="lbl">Bairro</span>
          <input className="inp" value={endereco.bairro ?? ''} onChange={e => setEnd('bairro', e.target.value)} />
        </label>
        <label>
          <span className="lbl">Cidade</span>
          <input className="inp" value={endereco.cidade ?? ''} onChange={e => setEnd('cidade', e.target.value)} />
        </label>
        <label>
          <span className="lbl">UF</span>
          <input className="inp" maxLength={2} style={{ textTransform: 'uppercase' }}
            value={endereco.uf ?? ''} onChange={e => setEnd('uf', e.target.value.toUpperCase())} />
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

// Monta o endereço completo numa linha de exibição
function formatEndereco(end) {
  if (!end) return ''
  const { logradouro, numero, complemento, bairro, cidade, uf, cep } = end
  const linha1 = [logradouro, numero].filter(Boolean).join(', ')
  const linha2 = [complemento, bairro].filter(Boolean).join(' — ')
  const linha3 = [cidade, uf].filter(Boolean).join('/')
  return [linha1, linha2, linha3, cep ? `CEP ${cep}` : ''].filter(Boolean).join(' · ')
}

// ── Gráfico de evolução ────────────────────────────────────────────────────
// Paleta de cores distintas para até 12 métricas simultâneas
const CORES_METRICAS = [
  '#15B8C4', '#16233F', '#1F9D6B', '#D98A21', '#D14B4B', '#7C5CD6',
  '#C2548A', '#3D8FB0', '#A0742E', '#5B7B3A', '#B0529C', '#4A6FA5',
]

// Definição de cada métrica comparável: como extrair obtido/predito de uma avaliação
const METRICAS_CONFIG = [
  { key: 'Degrau %', get: (ev, p) => [num(ev.degrau?.reps), num(ev.degrau?.preditoReps) ?? r1(predStepReps(p.idade, p.sexo))] },
  { key: 'TC6 %', get: (ev, p) => [num(ev.tc6?.distancia), num(ev.tc6?.preditoDist) ?? r1(predTC6(p.idade, p.sexo))] },
  { key: 'PImáx %', get: (ev, p) => [num(ev.pimax?.obtido), num(ev.pimax?.predito) ?? r1(predPImax(p.idade, p.sexo))] },
  { key: 'PEmáx %', get: (ev, p) => [num(ev.pemax?.obtido), num(ev.pemax?.predito) ?? r1(predPEmax(p.idade, p.sexo))] },
  { key: 'S-Index %', get: (ev, p) => [num(ev.sindex?.obtido), num(ev.sindex?.predito) ?? r1(predSindex(p.idade, p.sexo))] },
  { key: 'CVF %', get: (ev, p) => [num(ev.espiro?.preBD?.cvf), num(ev.espiro?.preBD?.cvfPred) ?? r1(predCVF(p.idade, num(p.altura), p.sexo))] },
  { key: 'VEF₁ %', get: (ev, p) => [num(ev.espiro?.preBD?.vef1), num(ev.espiro?.preBD?.vef1Pred) ?? r1(predVEF1(p.idade, num(p.altura), p.sexo))] },
  { key: 'Preensão %', get: (ev, p) => [num(ev.grip?.obtido), num(ev.grip?.predito) ?? r1(predGrip(p.idade, num(p.peso), p.sexo))] },
  { key: 'Quadríceps %', get: (ev, p) => {
      const qD = num(ev.dinamo?.quadD), qE = num(ev.dinamo?.quadE)
      const obt = (qD != null && qE != null) ? (qD + qE) / 2 : (qD ?? qE)
      return [obt, r1(predQuadriceps(p.idade, p.sexo))]
    } },
  { key: 'Bíceps %', get: (ev, p) => {
      const bD = num(ev.dinamo?.bicD), bE = num(ev.dinamo?.bicE)
      const obt = (bD != null && bE != null) ? (bD + bE) / 2 : (bD ?? bE)
      return [obt, r1(predBiceps(p.idade, p.sexo))]
    } },
  // TSL 5 rep: menor é melhor — inverte a razão (predito/obtido) para manter "100 = normal, mais = melhor"
  { key: 'TSL 5 rep %', get: (ev, p) => {
      const obt = num(ev.sts5?.tempo)
      const pred = num(ev.sts5?.predito) ?? predSTS5(p.idade)
      return (obt && pred) ? [pred, obt] : [null, null]
    } },
  { key: 'TSL 1 min %', get: (ev, p) => [num(ev.sts1?.reps), num(ev.sts1?.predito) ?? predSTS1(p.idade, p.sexo)] },
]

function Evolucao({ avaliacoes, paciente }) {
  const ordenadas = [...avaliacoes].sort((a, b) => a.data.localeCompare(b.data))

  // Calcula a série de cada métrica
  const series = ordenadas.map(ev => {
    const ponto = { data: fmtDate(ev.data).slice(0, 5) }
    METRICAS_CONFIG.forEach(({ key, get }) => {
      const [obt, pred] = get(ev, paciente)
      ponto[key] = (obt != null && pred) ? pct(obt, pred) : null
    })
    return ponto
  })

  // Só oferece métricas que têm pelo menos 2 pontos de dado (faz sentido comparar)
  const metricasDisponiveis = METRICAS_CONFIG.filter(({ key }) =>
    series.filter(p => p[key] != null).length >= 2
  )

  // Por padrão, mostra as 3 primeiras disponíveis para não poluir o gráfico
  const [visiveis, setVisiveis] = useState(() => {
    const init = {}
    metricasDisponiveis.forEach(({ key }, i) => { init[key] = i < 3 })
    return init
  })

  function toggle(key) {
    setVisiveis(v => ({ ...v, [key]: !v[key] }))
  }

  if (!metricasDisponiveis.length) return null

  return (
    <div className="card" style={{ marginBottom: 14 }}>
      <div className="flex-center gap-10" style={{ marginBottom: 14 }}>
        <div className="section-icon"><TrendingUp size={16} /></div>
        <h2>Evolução entre avaliações</h2>
      </div>

      {/* Seletor de métricas */}
      <div className="flex gap-8" style={{ flexWrap: 'wrap', marginBottom: 14 }}>
        {metricasDisponiveis.map(({ key }, i) => {
          const ativo = !!visiveis[key]
          const cor = CORES_METRICAS[i % CORES_METRICAS.length]
          return (
            <button key={key} onClick={() => toggle(key)}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                padding: '5px 12px', borderRadius: 20, fontSize: 12.5, fontWeight: 650,
                border: `1.5px solid ${ativo ? cor : 'var(--border)'}`,
                background: ativo ? `${cor}18` : '#fff',
                color: ativo ? cor : 'var(--sub)',
                cursor: 'pointer', fontFamily: 'inherit',
              }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: ativo ? cor : 'var(--border)' }} />
              {key}
            </button>
          )
        })}
      </div>

      <ResponsiveContainer width="100%" height={240}>
        <LineChart data={series} margin={{ top: 6, right: 10, left: -12, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
          <XAxis dataKey="data" tick={{ fontSize: 11, fill: 'var(--sub)' }} />
          <YAxis tick={{ fontSize: 11, fill: 'var(--sub)' }} />
          <Tooltip />
          <Legend wrapperStyle={{ fontSize: 11.5 }} />
          <ReferenceLine y={100} stroke="var(--good)" strokeDasharray="4 4" />
          {metricasDisponiveis.map(({ key }, i) => (
            visiveis[key] && (
              <Line key={key} type="monotone" dataKey={key}
                stroke={CORES_METRICAS[i % CORES_METRICAS.length]}
                strokeWidth={2.4} dot={{ r: 3 }} connectNulls />
            )
          ))}
        </LineChart>
      </ResponsiveContainer>
      <p className="text-sub" style={{ marginTop: 4 }}>
        Linha tracejada = 100% do predito (normalidade). Clique nos botões acima para mostrar ou ocultar cada teste.
      </p>
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
        <button className="btn-soft" onClick={() => nav(`/paciente/${pid}/termo-imagem`)}>
          <FileSignature size={15} /> Termo de imagem
        </button>
        <button className="btn-soft" onClick={() => nav(`/paciente/${pid}/financeiro`)}>
          <Banknote size={15} /> Financeiro
        </button>
        <button className="btn-soft" onClick={() => nav(`/paciente/${pid}/prescricao`)}>
          <Dumbbell size={15} /> Prescrição de exercícios
        </button>
      </div>

      {/* História */}
      {(paciente.historico || paciente.cpf || paciente.telefone || formatEndereco(paciente.endereco)) && (
        <div className="card" style={{ marginBottom: 14 }}>
          {(paciente.cpf || paciente.telefone || formatEndereco(paciente.endereco)) && (
            <div className="grid-2" style={{ marginBottom: paciente.historico ? 14 : 0 }}>
              {paciente.cpf && (
                <div>
                  <span className="lbl">CPF</span>
                  <p>{paciente.cpf}</p>
                </div>
              )}
              {paciente.telefone && (
                <div>
                  <span className="lbl">Telefone</span>
                  <p>{paciente.telefone}</p>
                </div>
              )}
              {formatEndereco(paciente.endereco) && (
                <div style={{ gridColumn: '1 / -1' }}>
                  <span className="lbl">Endereço</span>
                  <p>{formatEndereco(paciente.endereco)}</p>
                </div>
              )}
            </div>
          )}
          {paciente.historico && (
            <>
              <span className="lbl">História clínica</span>
              <p style={{ lineHeight: 1.6 }}>{paciente.historico}</p>
              {paciente.medico && <p className="text-sub" style={{ marginTop: 6 }}>Médico: {paciente.medico}</p>}
            </>
          )}
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

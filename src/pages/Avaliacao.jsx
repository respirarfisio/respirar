// src/pages/Avaliacao.jsx
import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Activity, Wind, Hand, FileText, Stethoscope } from 'lucide-react'
import { getPaciente, getAvaliacao, salvarAvaliacao } from '../utils/db'
import {
  predPImax, predPEmax, predGrip, predStepReps,
  predSTS5, predSTS1, predSindex, pct, r1, num,
} from '../calc/referencias'
import { avaliacaoVazia, SERIE_DEGRAU } from '../utils/avaliacao'

// ── Helpers UI ─────────────────────────────────────────────────────────────
function Field({ label, hint, children }) {
  return (
    <label>
      <span className="lbl">{label}</span>
      {children}
      {hint && <span className="hint">{hint}</span>}
    </label>
  )
}

function PredField({ label, obtido, predito, auto, onObt, onPred }) {
  const o = num(obtido), p = num(predito) ?? auto
  const pctVal = o && p ? Math.round((o / p) * 100) : null
  return (
    <div>
      <Field label={label}>
        <input className="inp" type="number" value={obtido} onChange={e => onObt(e.target.value)} />
      </Field>
      <div className="flex-center gap-8 mt-8">
        <input
          className="inp"
          style={{ flex: 1, fontSize: 13, padding: '7px 10px' }}
          type="number"
          placeholder={`predito ${auto ?? ''}`}
          value={predito}
          onChange={e => onPred(e.target.value)}
        />
        {pctVal != null && (
          <span className={`tag tag-${pctVal >= 80 ? 'good' : 'bad'}`}>{pctVal}% predito</span>
        )}
      </div>
    </div>
  )
}

function Section({ icon: Icon, title, children }) {
  return (
    <div className="card" style={{ marginBottom: 14 }}>
      <div className="flex-center gap-10" style={{ marginBottom: 14 }}>
        <div className="section-icon"><Icon size={16} /></div>
        <h2>{title}</h2>
      </div>
      {children}
    </div>
  )
}

// ── Página ─────────────────────────────────────────────────────────────────
export default function Avaliacao() {
  const { pid, aid } = useParams()
  const nav = useNavigate()
  const isNew = !aid || aid === 'nova'

  const [paciente, setPaciente] = useState(null)
  const [ev, setEv] = useState(avaliacaoVazia())
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const tasks = [getPaciente(pid)]
    if (!isNew) tasks.push(getAvaliacao(pid, aid))
    Promise.all(tasks).then(([p, a]) => {
      setPaciente(p)
      if (a) setEv(a)
    }).finally(() => setLoading(false))
  }, [pid, aid])

  // Helper para atualizar campos aninhados
  function set(path, val) {
    setEv(cur => {
      const next = structuredClone(cur)
      const keys = path.split('.')
      let obj = next
      for (let i = 0; i < keys.length - 1; i++) obj = obj[keys[i]]
      obj[keys[keys.length - 1]] = val
      return next
    })
  }

  function setSerie(i, key, val) {
    setEv(cur => {
      const next = structuredClone(cur)
      next.degrau.serie[i][key] = val
      return next
    })
  }

  async function handleSave() {
    setSaving(true)
    try {
      const newId = await salvarAvaliacao(pid, ev)
      nav(`/paciente/${pid}/avaliacao/${ev.id ?? newId}/relatorio`)
    } finally { setSaving(false) }
  }

  if (loading || !paciente) return <div style={{ textAlign: 'center', padding: 48 }}><span className="spinner" /></div>

  const idade = paciente.idade, sexo = paciente.sexo, peso = num(paciente.peso)
  const pPim  = r1(predPImax(idade, sexo))
  const pPem  = r1(predPEmax(idade, sexo))
  const pGrip = r1(predGrip(idade, peso, sexo))
  const pStep = r1(predStepReps(idade, sexo))
  const pSts5 = predSTS5(idade)
  const pSts1 = predSTS1(idade, sexo)
  const pSind = predSindex(idade, sexo)

  return (
    <>
      <div className="flex-center gap-10" style={{ marginBottom: 18 }}>
        <button className="btn-ghost" onClick={() => nav(`/paciente/${pid}`)} style={{ padding: '9px 12px' }}>
          <ArrowLeft size={18} />
        </button>
        <div>
          <h1>{isNew ? 'Nova avaliação' : 'Editar avaliação'}</h1>
          <p className="text-sub">{paciente.nome}</p>
        </div>
      </div>

      {/* ── Identificação ─────────────────────────────────────────────────── */}
      <Section icon={Stethoscope} title="Identificação">
        <div className="grid-2">
          <Field label="Data">
            <input className="inp" type="date" value={ev.data} onChange={e => set('data', e.target.value)} />
          </Field>
          <Field label="Médico responsável">
            <input className="inp" value={ev.medico} placeholder={paciente.medico} onChange={e => set('medico', e.target.value)} />
          </Field>
        </div>
        <div className="mt-12">
          <Field label="Objetivo da avaliação">
            <input className="inp" value={ev.objetivo} placeholder="Ex: pré-participação em reabilitação cardiovascular" onChange={e => set('objetivo', e.target.value)} />
          </Field>
        </div>
      </Section>

      {/* ── Teste do Degrau 6 min ──────────────────────────────────────────── */}
      <Section icon={Activity} title="Teste do degrau de 6 min">
        <div className="grid-3">
          <Field label="Repetições">
            <input className="inp" type="number" value={ev.degrau.reps} onChange={e => set('degrau.reps', e.target.value)} />
          </Field>
          <Field label="Predito (rep)" hint="automático — confirme com a planilha">
            <input className="inp" type="number" placeholder={pStep ?? ''} value={ev.degrau.preditoReps} onChange={e => set('degrau.preditoReps', e.target.value)} />
          </Field>
          <Field label="BORG máx">
            <input className="inp" type="number" value={ev.degrau.borgMax} onChange={e => set('degrau.borgMax', e.target.value)} />
          </Field>
          <Field label="FC máx (bpm)">
            <input className="inp" type="number" value={ev.degrau.fcMax} onChange={e => set('degrau.fcMax', e.target.value)} />
          </Field>
          <Field label="FC rec. 1 min (bpm)">
            <input className="inp" type="number" value={ev.degrau.fcRec1} onChange={e => set('degrau.fcRec1', e.target.value)} />
          </Field>
          <Field label="FC rec. 3 min (bpm)">
            <input className="inp" type="number" value={ev.degrau.fcRec3} onChange={e => set('degrau.fcRec3', e.target.value)} />
          </Field>
          <Field label="PSE MI">
            <input className="inp" type="number" value={ev.degrau.pse} onChange={e => set('degrau.pse', e.target.value)} />
          </Field>
          <Field label="Nº de paradas">
            <input className="inp" type="number" value={ev.degrau.nParadas} onChange={e => set('degrau.nParadas', e.target.value)} />
          </Field>
        </div>

        <div className="lbl" style={{ margin: '16px 0 8px' }}>Série por minuto (FC · SpO₂ · PAS · PAD · BORG)</div>
        <div style={{ overflowX: 'auto' }}>
          <table className="tbl-mini">
            <thead>
              <tr>
                <th></th>
                {SERIE_DEGRAU.map(t => <th key={t}>{t}</th>)}
              </tr>
            </thead>
            <tbody>
              {[['fc','FC'],['spo2','SpO₂'],['pas','PAS'],['pad','PAD'],['borg','BORG']].map(([k,lbl]) => (
                <tr key={k}>
                  <td style={{ fontWeight: 600, color: 'var(--navy-soft)', fontSize: 12 }}>{lbl}</td>
                  {ev.degrau.serie.map((s, i) => (
                    <td key={i}>
                      <input className="cell-mini" value={s[k]} onChange={e => setSerie(i, k, e.target.value)} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-12">
          <Field label="Observações (ritmo, arritmias, dessaturação, interrupções)">
            <textarea className="inp" rows={2} value={ev.degrau.obs} onChange={e => set('degrau.obs', e.target.value)} />
          </Field>
        </div>
      </Section>

      {/* ── Função muscular respiratória ───────────────────────────────────── */}
      <Section icon={Wind} title="Função muscular respiratória">
        <div className="grid-2">
          <PredField
            label="PImáx (cmH₂O)"
            obtido={ev.pimax.obtido} predito={ev.pimax.predito} auto={pPim}
            onObt={v => set('pimax.obtido', v)} onPred={v => set('pimax.predito', v)}
          />
          <PredField
            label="PEmáx (cmH₂O)"
            obtido={ev.pemax.obtido} predito={ev.pemax.predito} auto={pPem}
            onObt={v => set('pemax.obtido', v)} onPred={v => set('pemax.predito', v)}
          />
        </div>
        <div className="grid-2 mt-12">
          <PredField
            label="S-Index (cmH₂O)"
            obtido={ev.sindex.obtido} predito={ev.sindex.predito} auto={pSind}
            onObt={v => set('sindex.obtido', v)} onPred={v => set('sindex.predito', v)}
          />
        </div>
      </Section>

      {/* ── Função muscular periférica ──────────────────────────────────────── */}
      <Section icon={Hand} title="Função muscular periférica">
        <PredField
          label="Preensão palmar dominante (kgf)"
          obtido={ev.grip.obtido} predito={ev.grip.predito} auto={pGrip}
          onObt={v => set('grip.obtido', v)} onPred={v => set('grip.predito', v)}
        />
        <div className="grid-2 mt-12">
          <Field label="TSL 5 repetições — tempo (s)" hint={`predito ${pSts5 ?? '—'} s`}>
            <input className="inp" type="number" value={ev.sts5.tempo} onChange={e => set('sts5.tempo', e.target.value)} />
          </Field>
          <Field label="TSL 1 min — repetições" hint={`predito ${pSts1 ?? '—'} rep`}>
            <input className="inp" type="number" value={ev.sts1.reps} onChange={e => set('sts1.reps', e.target.value)} />
          </Field>
        </div>
      </Section>

      {/* ── Conclusão ──────────────────────────────────────────────────────── */}
      <Section icon={FileText} title="Conclusão e profissional">
        <Field label="Conclusão (texto livre)">
          <textarea className="inp" rows={5} placeholder="Síntese clínica e recomendações…" value={ev.conclusao} onChange={e => set('conclusao', e.target.value)} />
        </Field>
        <div className="mt-12">
          <Field label="Profissional responsável">
            <input className="inp" value={ev.profissional} onChange={e => set('profissional', e.target.value)} />
          </Field>
        </div>
      </Section>

      <div className="flex gap-10">
        <button className="btn-primary" onClick={handleSave} disabled={saving}>
          {saving ? <span className="spinner" /> : <FileText size={16} />} Salvar e gerar relatório
        </button>
        <button className="btn-ghost" onClick={() => nav(`/paciente/${pid}`)}>Cancelar</button>
      </div>
    </>
  )
}

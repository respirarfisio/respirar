// src/pages/Avaliacao.jsx
import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Activity, Wind, Hand, FileText, Stethoscope, Heart, ClipboardList, Image, X } from 'lucide-react'
import { getPaciente, getAvaliacao, salvarAvaliacao } from '../utils/db'
import {
  predPImax, predPEmax, predGrip, predStepReps,
  predSTS5, predSTS1, predSindex, calcIMC, classIMC, fcMaxTanaka, num, r1,
} from '../calc/referencias'
import { avaliacaoVazia, SERIE_DEGRAU } from '../utils/avaliacao'

function Field({ label, hint, children }) {
  return (
    <label style={{ display:'block' }}>
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
        <input className="inp" style={{ flex:1, fontSize:13, padding:'7px 10px' }}
          type="number" placeholder={`predito ${auto ?? ''}`} value={predito}
          onChange={e => onPred(e.target.value)} />
        {pctVal != null && <span className={`tag tag-${pctVal >= 80 ? 'good' : 'bad'}`}>{pctVal}% predito</span>}
      </div>
    </div>
  )
}

function Section({ icon: Icon, title, children }) {
  return (
    <div className="card" style={{ marginBottom:14 }}>
      <div className="flex-center gap-10" style={{ marginBottom:14 }}>
        <div className="section-icon"><Icon size={16} /></div>
        <h2>{title}</h2>
      </div>
      {children}
    </div>
  )
}

function CheckRow({ label, checked, onChange }) {
  return (
    <label className="flex-center gap-8" style={{ cursor:'pointer', fontSize:13.5 }}>
      <input type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)}
        style={{ width:15, height:15, accentColor:'var(--teal)' }} />
      {label}
    </label>
  )
}

function ImageUpload({ images, onChange }) {
  const handleFile = (e) => {
    const files = Array.from(e.target.files)
    files.forEach(file => {
      const reader = new FileReader()
      reader.onload = (ev) => {
        onChange([...images, { nome: file.name, base64: ev.target.result, tipo: file.type }])
      }
      reader.readAsDataURL(file)
    })
  }
  return (
    <div>
      <label className="btn-ghost" style={{ cursor:'pointer', display:'inline-flex', alignItems:'center', gap:6 }}>
        <Image size={15} /> Adicionar imagem (ECG, foto)
        <input type="file" accept="image/*" multiple style={{ display:'none' }} onChange={handleFile} />
      </label>
      {images.length > 0 && (
        <div className="flex gap-8" style={{ flexWrap:'wrap', marginTop:10 }}>
          {images.map((img, i) => (
            <div key={i} style={{ position:'relative' }}>
              <img src={img.base64} alt={img.nome}
                style={{ width:80, height:80, objectFit:'cover', borderRadius:8, border:'1px solid var(--border)' }} />
              <button onClick={() => onChange(images.filter((_,j) => j !== i))}
                style={{ position:'absolute', top:-6, right:-6, background:'var(--bad)', color:'#fff',
                  border:'none', borderRadius:'50%', width:20, height:20, cursor:'pointer',
                  display:'grid', placeItems:'center' }}>
                <X size={11} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

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
      if (a) setEv({ ...avaliacaoVazia(), ...a })
    }).finally(() => setLoading(false))
  }, [pid, aid])

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
      const savedId = await salvarAvaliacao(pid, ev)
      nav(`/paciente/${pid}/avaliacao/${ev.id ?? savedId}/relatorio`)
    } finally { setSaving(false) }
  }

  if (loading || !paciente) return <div style={{ textAlign:'center', padding:48 }}><span className="spinner" /></div>

  const idade = paciente.idade, sexo = paciente.sexo
  const peso = num(ev.vitais?.peso) || num(paciente.peso)
  const altura = num(ev.vitais?.altura) || num(paciente.altura)

  const imc     = calcIMC(peso, altura)
  const fcMax   = fcMaxTanaka(idade)
  const pPim    = r1(predPImax(idade, sexo))
  const pPem    = r1(predPEmax(idade, sexo))
  const pGrip   = r1(predGrip(idade, peso, sexo))
  const pStep   = r1(predStepReps(idade, sexo))
  const pSts5   = predSTS5(idade)
  const pSts1   = predSTS1(idade, sexo)
  const pSind   = predSindex(idade, sexo)

  return (
    <>
      <div className="flex-center gap-10" style={{ marginBottom:18 }}>
        <button className="btn-ghost" onClick={() => nav(`/paciente/${pid}`)} style={{ padding:'9px 12px' }}>
          <ArrowLeft size={18} />
        </button>
        <div>
          <h1>{isNew ? 'Nova avaliação' : 'Editar avaliação'}</h1>
          <p className="text-sub">{paciente.nome}</p>
        </div>
      </div>

      {/* ── Identificação ──────────────────────────────────────────────── */}
      <Section icon={Stethoscope} title="Identificação">
        <div className="grid-2">
          <Field label="Data">
            <input className="inp" type="date" value={ev.data} onChange={e => set('data', e.target.value)} />
          </Field>
          <Field label="Médico responsável">
            <input className="inp" value={ev.medico} placeholder={paciente.medico}
              onChange={e => set('medico', e.target.value)} />
          </Field>
        </div>
        <div className="mt-12">
          <Field label="Objetivo da avaliação">
            <input className="inp" value={ev.objetivo}
              placeholder="Ex: pré-participação em reabilitação cardiovascular"
              onChange={e => set('objetivo', e.target.value)} />
          </Field>
        </div>
      </Section>

      {/* ── Dados Vitais ───────────────────────────────────────────────── */}
      <Section icon={Heart} title="Dados Vitais e Composição Corporal">
        <div className="grid-3">
          <Field label="FC repouso (bpm)">
            <input className="inp" type="number" value={ev.vitais.fc} onChange={e => set('vitais.fc', e.target.value)} />
          </Field>
          <Field label="FR (ipm)">
            <input className="inp" type="number" value={ev.vitais.fr} onChange={e => set('vitais.fr', e.target.value)} />
          </Field>
          <Field label="SpO₂ (%)">
            <input className="inp" type="number" value={ev.vitais.spo2} onChange={e => set('vitais.spo2', e.target.value)} />
          </Field>
          <Field label="PAS (mmHg)">
            <input className="inp" type="number" value={ev.vitais.pas} onChange={e => set('vitais.pas', e.target.value)} />
          </Field>
          <Field label="PAD (mmHg)">
            <input className="inp" type="number" value={ev.vitais.pad} onChange={e => set('vitais.pad', e.target.value)} />
          </Field>
          <Field label="Peso (kg)">
            <input className="inp" type="number" value={ev.vitais.peso} onChange={e => set('vitais.peso', e.target.value)} />
          </Field>
          <Field label="Altura (cm)">
            <input className="inp" type="number" value={ev.vitais.altura} onChange={e => set('vitais.altura', e.target.value)} />
          </Field>
          <Field label="IMC (auto)">
            <input className="inp" readOnly value={imc ?? ''} style={{ background:'var(--bg)' }} />
          </Field>
          <Field label="FC máx predita (Tanaka)">
            <input className="inp" readOnly value={fcMax ?? ''} style={{ background:'var(--bg)' }} />
          </Field>
        </div>
      </Section>

      {/* ── Teste do Degrau ────────────────────────────────────────────── */}
      <Section icon={Activity} title="Teste do Degrau de 6 min">
        <div className="grid-3">
          <Field label="Repetições executadas">
            <input className="inp" type="number" value={ev.degrau.reps}
              onChange={e => set('degrau.reps', e.target.value)} />
          </Field>
          <Field label="Predito (rep)" hint="automático — confirme com planilha">
            <input className="inp" type="number" placeholder={pStep ?? ''}
              value={ev.degrau.preditoReps} onChange={e => set('degrau.preditoReps', e.target.value)} />
          </Field>
          <Field label="BORG máx">
            <input className="inp" type="number" value={ev.degrau.borgMax}
              onChange={e => set('degrau.borgMax', e.target.value)} />
          </Field>
          <Field label="PSE MI">
            <input className="inp" type="number" value={ev.degrau.pse}
              onChange={e => set('degrau.pse', e.target.value)} />
          </Field>
          <Field label="FC máx atingida (bpm)">
            <input className="inp" type="number" value={ev.degrau.fcMax}
              onChange={e => set('degrau.fcMax', e.target.value)} />
          </Field>
          <Field label="FC rec. 1 min (bpm)">
            <input className="inp" type="number" value={ev.degrau.fcRec1}
              onChange={e => set('degrau.fcRec1', e.target.value)} />
          </Field>
          <Field label="FC rec. 3 min (bpm)">
            <input className="inp" type="number" value={ev.degrau.fcRec3}
              onChange={e => set('degrau.fcRec3', e.target.value)} />
          </Field>
          <Field label="Nº de paradas">
            <input className="inp" type="number" value={ev.degrau.nParadas}
              onChange={e => set('degrau.nParadas', e.target.value)} />
          </Field>
        </div>

        <div style={{ marginTop:14, display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
          <CheckRow label="Sem arritmias detectáveis" checked={!ev.degrau.arritmia}
            onChange={v => set('degrau.arritmia', !v)} />
          <CheckRow label="Sem interrupções no ritmo" checked={!ev.degrau.interrupcao}
            onChange={v => set('degrau.interrupcao', !v)} />
          <CheckRow label="Sem broncoespasmo/tosse/O₂" checked={!ev.degrau.broncoespasmo}
            onChange={v => set('degrau.broncoespasmo', !v)} />
          <CheckRow label="Sem dessaturação" checked={!ev.degrau.dessaturacao}
            onChange={v => set('degrau.dessaturacao', !v)} />
        </div>

        <div className="lbl" style={{ margin:'16px 0 8px' }}>Série por minuto</div>
        <div style={{ overflowX:'auto' }}>
          <table className="tbl-mini">
            <thead>
              <tr><th></th>{SERIE_DEGRAU.map(t => <th key={t}>{t}</th>)}</tr>
            </thead>
            <tbody>
              {[['fc','FC'],['spo2','SpO₂'],['pas','PAS'],['pad','PAD'],['borg','BORG'],['pse','PSE']].map(([k,lbl]) => (
                <tr key={k}>
                  <td style={{ fontWeight:600, color:'var(--navy-soft)', fontSize:12, paddingRight:6 }}>{lbl}</td>
                  {ev.degrau.serie.map((s, i) => (
                    <td key={i}>
                      <input className="cell-mini" value={s[k] ?? ''}
                        onChange={e => setSerie(i, k, e.target.value)} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-12">
          <Field label="Observações adicionais">
            <textarea className="inp" rows={2} value={ev.degrau.obs}
              onChange={e => set('degrau.obs', e.target.value)} />
          </Field>
        </div>

        <div className="mt-12">
          <div className="lbl" style={{ marginBottom:8 }}>Imagens (ECG, fotos)</div>
          <ImageUpload images={ev.degrau.imagens ?? []}
            onChange={imgs => set('degrau.imagens', imgs)} />
        </div>
      </Section>

      {/* ── Função Respiratória ────────────────────────────────────────── */}
      <Section icon={Wind} title="Função Muscular Respiratória">
        <div style={{ marginBottom:16 }}>
          <h3 style={{ marginBottom:10 }}>Pressão Inspiratória Máxima (PImáx)</h3>
          <PredField label="Obtido (cmH₂O)"
            obtido={ev.pimax.obtido} predito={ev.pimax.predito} auto={pPim}
            onObt={v => set('pimax.obtido', v)} onPred={v => set('pimax.predito', v)} />
        </div>
        <div style={{ marginBottom:16 }}>
          <h3 style={{ marginBottom:10 }}>Pressão Expiratória Máxima (PEmáx)</h3>
          <PredField label="Obtido (cmH₂O)"
            obtido={ev.pemax.obtido} predito={ev.pemax.predito} auto={pPem}
            onObt={v => set('pemax.obtido', v)} onPred={v => set('pemax.predito', v)} />
        </div>
        <div>
          <h3 style={{ marginBottom:10 }}>S-Index</h3>
          <PredField label="Obtido (cmH₂O)"
            obtido={ev.sindex.obtido} predito={ev.sindex.predito} auto={pSind}
            onObt={v => set('sindex.obtido', v)} onPred={v => set('sindex.predito', v)} />
        </div>
      </Section>

      {/* ── Função Periférica ──────────────────────────────────────────── */}
      <Section icon={Hand} title="Função Muscular Periférica">
        <div style={{ marginBottom:16 }}>
          <h3 style={{ marginBottom:10 }}>Força de Preensão Palmar</h3>
          <PredField label="Obtido — mão dominante (kgf)"
            obtido={ev.grip.obtido} predito={ev.grip.predito} auto={pGrip}
            onObt={v => set('grip.obtido', v)} onPred={v => set('grip.predito', v)} />
        </div>
        <div style={{ marginBottom:16 }}>
          <h3 style={{ marginBottom:10 }}>TSL 5 repetições</h3>
          <Field label="Tempo (s)" hint={`predito: < ${pSts5 ?? '—'} s`}>
            <input className="inp" type="number" value={ev.sts5.tempo}
              onChange={e => set('sts5.tempo', e.target.value)} />
          </Field>
        </div>
        <div>
          <h3 style={{ marginBottom:10 }}>TSL 1 min</h3>
          <Field label="Repetições" hint={`predito: ${pSts1 ?? '—'} rep`}>
            <input className="inp" type="number" value={ev.sts1.reps}
              onChange={e => set('sts1.reps', e.target.value)} />
          </Field>
        </div>
      </Section>

      {/* ── SPPB ──────────────────────────────────────────────────────── */}
      <Section icon={ClipboardList} title="SPPB (Short Physical Performance Battery)">
        <div className="grid-2">
          {[
            ['Velocidade de marcha — 4m (s)', 'sppb.velMarcha4m'],
            ['Ponto SPPB velocidade', 'sppb.pontoVel'],
            ['Equilíbrio pés juntos (s)', 'sppb.peJuntos'],
            ['Ponto SPPB pés juntos', 'sppb.pontoPeJuntos'],
            ['Equilíbrio um pé à frente (s)', 'sppb.umPeFrente'],
            ['Ponto SPPB um pé', 'sppb.pontoUmPe'],
            ['Equilíbrio hálux + calcanhar (s)', 'sppb.haluxCalcanhar'],
            ['Ponto SPPB hálux', 'sppb.pontoHalux'],
            ['Ponto SPPB TSL 5x', 'sppb.tsl5ponto'],
          ].map(([lbl, path]) => (
            <Field key={path} label={lbl}>
              <input className="inp" type="number" value={path.split('.').reduce((o,k) => o?.[k], ev) ?? ''}
                onChange={e => set(path, e.target.value)} />
            </Field>
          ))}
        </div>
      </Section>

      {/* ── Conclusão ──────────────────────────────────────────────────── */}
      <Section icon={FileText} title="Conclusão e Profissional">
        <Field label="Conclusão (texto livre — ou use o botão de IA abaixo)">
          <textarea className="inp" rows={5}
            placeholder="Síntese clínica e recomendações…"
            value={ev.conclusao} onChange={e => set('conclusao', e.target.value)} />
        </Field>
        <div className="mt-12">
          <Field label="Profissional responsável">
            <input className="inp" value={ev.profissional}
              onChange={e => set('profissional', e.target.value)} />
          </Field>
        </div>
      </Section>

      <div className="flex gap-10">
        <button className="btn-primary" onClick={handleSave} disabled={saving}>
          {saving ? <span className="spinner" /> : <FileText size={16} />} Salvar e ver relatório
        </button>
        <button className="btn-ghost" onClick={() => nav(`/paciente/${pid}`)}>Cancelar</button>
      </div>
    </>
  )
}

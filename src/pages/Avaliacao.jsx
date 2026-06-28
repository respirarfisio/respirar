// src/pages/Avaliacao.jsx
import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ArrowLeft, Activity, Wind, Hand, FileText, Stethoscope,
  Heart, ClipboardList, Image, X, Footprints, Check,
} from 'lucide-react'
import { getPaciente, getAvaliacao, salvarAvaliacao } from '../utils/db'
import {
  predPImax, predPEmax, predGrip, predStepReps,
  predSTS5, predSTS1, predSindex, calcIMC, fcMaxTanaka,
  predTC6, predQuadriceps, predBiceps, predCVF, predVEF1,
  sppbTotal, calcEv, num, r1,
} from '../calc/referencias'
import { avaliacaoVazia, SERIE_DEGRAU, SERIE_TC6, TESTES_DISPONIVEIS, fmtDate } from '../utils/avaliacao'
import { SixMinuteTest, Stopwatch, RepCounterTimer, ImportarPolarFC } from '../components/TestTimers'
import {
  montarCBDF,
  CBDF_LINK,
  OPCOES_D03_STATUS,
  OPCOES_D05_STATUS,
  OPCOES_M04_STATUS,
  OPCOES_DIGITO_0A4,
  OPCOES_DIGITO_BIN,
  OPCOES_SEGMENTO_D03,
} from '../utils/cbdf'

// ─── UI helpers ──────────────────────────────────────────────────────────
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
        {pctVal != null && (
          <span className={`tag tag-${pctVal >= 80 ? 'good' : 'bad'}`}>{pctVal}% predito</span>
        )}
      </div>
    </div>
  )
}

function Section({ icon: Icon, title, children, color }) {
  return (
    <div className="card" style={{ marginBottom:14 }}>
      <div className="flex-center gap-10" style={{ marginBottom:14 }}>
        <div className="section-icon" style={color ? { background:`${color}22`, color } : {}}>
          {Icon && <Icon size={16} />}
        </div>
        <h2>{title}</h2>
      </div>
      {children}
    </div>
  )
}

function ImageUpload({ images, onChange }) {
  const handleFile = (e) => {
    Array.from(e.target.files).forEach(file => {
      const reader = new FileReader()
      reader.onload = ev => onChange([...images, { nome:file.name, base64:ev.target.result, tipo:file.type }])
      reader.readAsDataURL(file)
    })
  }
  return (
    <div>
      <label className="btn-ghost" style={{ cursor:'pointer', display:'inline-flex', alignItems:'center', gap:6 }}>
        <Image size={15} /> Adicionar imagem (ECG, curva, foto)
        <input type="file" accept="image/*" multiple style={{ display:'none' }} onChange={handleFile} />
      </label>
      {images.length > 0 && (
        <div className="flex gap-8" style={{ flexWrap:'wrap', marginTop:10 }}>
          {images.map((img, i) => (
            <div key={i} style={{ position:'relative' }}>
              <img src={img.base64} alt={img.nome}
                style={{ width:80, height:80, objectFit:'cover', borderRadius:8, border:'1px solid var(--border)' }} />
              <button onClick={() => onChange(images.filter((_,j)=>j!==i))}
                style={{ position:'absolute', top:-6, right:-6, background:'var(--bad)', color:'#fff', border:'none', borderRadius:'50%', width:20, height:20, cursor:'pointer', display:'grid', placeItems:'center' }}>
                <X size={11}/>
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function Ref({ children }) {
  return (
    <div style={{ marginTop:10, padding:'8px 12px', background:'var(--bg)', borderRadius:8, fontSize:11.5, color:'var(--sub)', lineHeight:1.6 }}>
      <b>Referência:</b> {children}
    </div>
  )
}

// ── Bloco CBDF: mostra um código composto, com a origem de cada dígito ────
// Permite ativar/desativar o bloco no relatório e sobrescrever manualmente
// os campos que não têm fonte automática (status clínico, dor, segmento etc.)
function BlocoCBDF({ bloco, ativo, onToggle, manual, onManualChange, statusOptions, extraFields }) {
  return (
    <div style={{
      border: ativo ? '1.5px solid var(--teal)' : '1.5px solid var(--border)',
      borderRadius: 12, padding: 14, marginBottom: 12,
      background: ativo ? 'var(--teal-light)' : 'var(--bg)',
    }}>
      <label className="flex-center gap-8" style={{ cursor: 'pointer', marginBottom: 10 }}>
        <input type="checkbox" checked={ativo} onChange={onToggle}
          style={{ width: 16, height: 16, accentColor: 'var(--teal)', flexShrink: 0 }} />
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 700, fontSize: 13.5 }}>{bloco.sistema} — {bloco.nome}</div>
          <div className="text-sub" style={{ fontSize: 12, fontFamily: 'monospace' }}>{bloco.codigo}</div>
        </div>
        {!bloco.completo && (
          <span className="tag tag-warn" style={{ fontSize: 10.5 }}>Dados incompletos</span>
        )}
      </label>

      {ativo && (
        <div style={{ paddingLeft: 24 }}>
          {/* Status (Bloco A) — geralmente precisa de confirmação manual */}
          {statusOptions && (
            <div style={{ marginBottom: 10 }}>
              <span className="lbl">Status — {bloco.statusLabel ?? 'selecione'}</span>
              <select className="inp" value={bloco.status ?? ''} onChange={(e) => onManualChange(e.target.value)}>
                <option value="">Selecione</option>
                {statusOptions.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
          )}

          {/* Subcódigos (Bloco B) — mostra origem; alguns são editáveis */}
          <div style={{ display: 'grid', gap: 6 }}>
            {bloco.subs.map((s, i) => (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                gap: 10, fontSize: 12.5, padding: '6px 10px', background: '#fff', borderRadius: 8,
              }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600 }}>{s.label}</div>
                  <div className="text-sub" style={{ fontSize: 11 }}>{s.origem}</div>
                </div>
                <span className={`tag tag-${s.digito == null ? 'neutral' : s.digito === 0 ? 'good' : s.digito <= 1 ? 'warn' : 'bad'}`}>
                  {s.digito == null ? 'sem dado' : `${s.digito} · ${s.rotulo ?? ''}`}
                </span>
              </div>
            ))}
          </div>

          {/* Campos extras manuais (dor, mobilidade articular, segmento etc.) */}
          {extraFields}
        </div>
      )}
    </div>
  )
}

// ─── Página ───────────────────────────────────────────────────────────────
export default function Avaliacao() {
  const { pid, aid } = useParams()
  const nav = useNavigate()
  const isNew = !aid || aid === 'nova'

  const [paciente, setPaciente] = useState(null)
  const [ev, setEv]             = useState(avaliacaoVazia())
  const [loading, setLoading]   = useState(true)
  const [saving, setSaving]     = useState(false)

  useEffect(() => {
    const tasks = [getPaciente(pid)]
    if (!isNew) tasks.push(getAvaliacao(pid, aid))
    Promise.all(tasks).then(([p, a]) => {
      setPaciente(p)
      if (a) {
        const base = avaliacaoVazia()
        setEv({ ...base, ...a, cbdf: { ...base.cbdf, ...(a.cbdf ?? {}) } })
      }
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

  function setSerie(grupo, i, key, val) {
    setEv(cur => {
      const next = structuredClone(cur)
      next[grupo].serie[i][key] = val
      return next
    })
  }

  // Aplica valores de FC (do cronômetro de recuperação ou da importação Polar)
  // diretamente na tabela de série de um grupo (degrau ou tc6)
  function aplicarFC(grupo, indice, valor) {
    if (valor == null) return
    setEv(cur => {
      const next = structuredClone(cur)
      next[grupo].serie[indice].fc = String(valor)
      return next
    })
  }

  function aplicarImportacaoPolar(grupo, preview) {
    preview.minutos.forEach((v, i) => { if (v != null) aplicarFC(grupo, i, v) })
    if (preview.rec1 != null) aplicarFC(grupo, 6, preview.rec1)
    if (preview.rec3 != null) aplicarFC(grupo, 7, preview.rec3)
  }

  function toggleTeste(id) {
    setEv(cur => {
      const ativos = cur.testesAtivos.includes(id)
        ? cur.testesAtivos.filter(t => t !== id)
        : [...cur.testesAtivos, id]
      return { ...cur, testesAtivos: ativos }
    })
  }

  const ativo = (id) => ev.testesAtivos.includes(id)

  async function handleSave() {
    setSaving(true)
    try {
      const savedId = await salvarAvaliacao(pid, ev)
      nav(`/paciente/${pid}/avaliacao/${ev.id ?? savedId}/relatorio`)
    } finally { setSaving(false) }
  }

  if (loading || !paciente) return <div style={{ textAlign:'center', padding:48 }}><span className="spinner"/></div>

  const idade = paciente.idade, sexo = paciente.sexo
  const peso   = num(ev.vitais?.peso) || num(paciente.peso)
  const altura = num(ev.vitais?.altura) || num(paciente.altura)

  const pPim    = r1(predPImax(idade, sexo))
  const pPem    = r1(predPEmax(idade, sexo))
  const pGrip   = r1(predGrip(idade, peso, sexo))
  const pStep   = r1(predStepReps(idade, sexo))
  const pTC6    = r1(predTC6(idade, sexo))
  const pSts5   = predSTS5(idade)
  const pSts1   = predSTS1(idade, sexo)
  const pSind   = predSindex(idade, sexo)
  const pQuad   = r1(predQuadriceps(idade, sexo))
  const pBic    = r1(predBiceps(idade, sexo))
  const pCVF    = r1(predCVF(idade, altura, sexo))
  const pVEF1   = r1(predVEF1(idade, altura, sexo))
  const imc     = calcIMC(peso, altura)
  const fcMax   = fcMaxTanaka(idade)

  return (
    <>
      <div className="flex-center gap-10" style={{ marginBottom:18 }}>
        <button className="btn-ghost" onClick={() => nav(`/paciente/${pid}`)} style={{ padding:'9px 12px' }}>
          <ArrowLeft size={18}/>
        </button>
        <div>
          <h1>{isNew ? 'Nova avaliação' : 'Editar avaliação'}</h1>
          <p className="text-sub">{paciente.nome}</p>
        </div>
      </div>

      {/* ── SELETOR DE TESTES ──────────────────────────────────────────── */}
      <div className="card" style={{ marginBottom:14 }}>
        <div className="flex-center gap-10" style={{ marginBottom:14 }}>
          <div className="section-icon"><ClipboardList size={16}/></div>
          <h2>Testes a realizar nesta avaliação</h2>
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
          {TESTES_DISPONIVEIS.map(t => (
            <label key={t.id} className="flex-center gap-8"
              style={{ cursor: t.sempre ? 'default' : 'pointer', fontSize:13.5,
                padding:'8px 12px', background:'var(--bg)', borderRadius:10,
                border: ativo(t.id) ? '1.5px solid var(--teal)' : '1.5px solid transparent' }}>
              <input type="checkbox"
                checked={t.sempre || ativo(t.id)}
                disabled={t.sempre}
                onChange={() => !t.sempre && toggleTeste(t.id)}
                style={{ width:15, height:15, accentColor:'var(--teal)' }}/>
              {t.label}
            </label>
          ))}
        </div>
      </div>

      {/* ── IDENTIFICAÇÃO ─────────────────────────────────────────────── */}
      <Section icon={Stethoscope} title="Identificação">
        <div className="grid-2">
          <Field label="Data">
            <input className="inp" type="date" value={ev.data} onChange={e=>set('data',e.target.value)}/>
          </Field>
          <Field label="Médico responsável">
            <input className="inp" value={ev.medico} placeholder={paciente.medico} onChange={e=>set('medico',e.target.value)}/>
          </Field>
        </div>
        <div className="mt-12">
          <Field label="Objetivo da avaliação">
            <input className="inp" value={ev.objetivo} placeholder="Ex: pré-participação em reabilitação cardiovascular" onChange={e=>set('objetivo',e.target.value)}/>
          </Field>
        </div>
      </Section>

      {/* ── DADOS VITAIS ──────────────────────────────────────────────── */}
      <Section icon={Heart} title="Dados Vitais e Composição Corporal">
        <div className="grid-3">
          <Field label="FC repouso (bpm)"><input className="inp" type="number" value={ev.vitais.fc} onChange={e=>set('vitais.fc',e.target.value)}/></Field>
          <Field label="FR (ipm)"><input className="inp" type="number" value={ev.vitais.fr} onChange={e=>set('vitais.fr',e.target.value)}/></Field>
          <Field label="SpO₂ (%)"><input className="inp" type="number" value={ev.vitais.spo2} onChange={e=>set('vitais.spo2',e.target.value)}/></Field>
          <Field label="PAS (mmHg)"><input className="inp" type="number" value={ev.vitais.pas} onChange={e=>set('vitais.pas',e.target.value)}/></Field>
          <Field label="PAD (mmHg)"><input className="inp" type="number" value={ev.vitais.pad} onChange={e=>set('vitais.pad',e.target.value)}/></Field>
          <Field label="Peso (kg)"><input className="inp" type="number" value={ev.vitais.peso} onChange={e=>set('vitais.peso',e.target.value)}/></Field>
          <Field label="Altura (cm)"><input className="inp" type="number" value={ev.vitais.altura} onChange={e=>set('vitais.altura',e.target.value)}/></Field>
          <Field label="IMC (auto)"><input className="inp" readOnly value={imc??''} style={{background:'var(--bg)'}}/></Field>
          <Field label="FC máx predita (Tanaka)"><input className="inp" readOnly value={fcMax??''} style={{background:'var(--bg)'}}/></Field>
        </div>
      </Section>

      {/* ── TESTE DO DEGRAU ───────────────────────────────────────────── */}
      {ativo('degrau') && (
        <Section icon={Activity} title="Teste do Degrau de 6 min">
          <div className="grid-3">
            <Field label="Repetições"><input className="inp" type="number" value={ev.degrau.reps} onChange={e=>set('degrau.reps',e.target.value)}/></Field>
            <Field label="Predito (rep)" hint="auto — confirme com planilha">
              <input className="inp" type="number" placeholder={pStep??''} value={ev.degrau.preditoReps} onChange={e=>set('degrau.preditoReps',e.target.value)}/>
            </Field>
            <Field label="BORG máx"><input className="inp" type="number" value={ev.degrau.borgMax} onChange={e=>set('degrau.borgMax',e.target.value)}/></Field>
            <Field label="PSE MI"><input className="inp" type="number" value={ev.degrau.pse} onChange={e=>set('degrau.pse',e.target.value)}/></Field>
            <Field label="FC máx (bpm)"><input className="inp" type="number" value={ev.degrau.fcMax} onChange={e=>set('degrau.fcMax',e.target.value)}/></Field>
            <Field label="FC rec. 1 min"><input className="inp" type="number" value={ev.degrau.fcRec1} onChange={e=>set('degrau.fcRec1',e.target.value)}/></Field>
            <Field label="FC rec. 3 min"><input className="inp" type="number" value={ev.degrau.fcRec3} onChange={e=>set('degrau.fcRec3',e.target.value)}/></Field>
            <Field label="Nº de paradas"><input className="inp" type="number" value={ev.degrau.nParadas} onChange={e=>set('degrau.nParadas',e.target.value)}/></Field>
          </div>
          <div style={{ marginTop:12, display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
            {[['arritmia','Sem arritmias detectáveis',true],['interrupcao','Sem interrupções',true],['broncoespasmo','Sem broncoespasmo/tosse/O₂',true],['dessaturacao','Sem dessaturação',true]].map(([k,lbl,inv])=>(
              <label key={k} className="flex-center gap-8" style={{ cursor:'pointer', fontSize:13.5 }}>
                <input type="checkbox" checked={inv ? !ev.degrau[k] : ev.degrau[k]} onChange={e=>set(`degrau.${k}`,inv?!e.target.checked:e.target.checked)} style={{ width:15, height:15, accentColor:'var(--teal)' }}/>
                {lbl}
              </label>
            ))}
          </div>

          <SixMinuteTest />
          <ImportarPolarFC onAplicar={(preview) => aplicarImportacaoPolar('degrau', preview)} />

          <div className="lbl" style={{ margin:'16px 0 8px' }}>Série por minuto</div>
          <div style={{ overflowX:'auto' }}>
            <table className="tbl-mini">
              <thead><tr><th></th>{SERIE_DEGRAU.map(t=><th key={t}>{t}</th>)}</tr></thead>
              <tbody>
                {[['fc','FC'],['spo2','SpO₂'],['pas','PAS'],['pad','PAD'],['borg','BORG'],['pse','PSE']].map(([k,lbl])=>(
                  <tr key={k}>
                    <td style={{ fontWeight:600, color:'var(--navy-soft)', fontSize:12, paddingRight:6 }}>{lbl}</td>
                    {ev.degrau.serie.map((s,i)=>(
                      <td key={i}><input className="cell-mini" value={s[k]??''} onChange={e=>setSerie('degrau',i,k,e.target.value)}/></td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-12">
            <Field label="Observações"><textarea className="inp" rows={2} value={ev.degrau.obs} onChange={e=>set('degrau.obs',e.target.value)}/></Field>
          </div>
          <div className="mt-12">
            <div className="lbl" style={{ marginBottom:8 }}>Imagens (ECG, fotos)</div>
            <ImageUpload images={ev.degrau.imagens??[]} onChange={imgs=>set('degrau.imagens',imgs)}/>
          </div>
          <Ref>Ritt LEF et al. Arq Bras Cardiol. 2021;116(5):889-95. | Albuquerque et al. 2019 | ACSM 2018</Ref>
        </Section>
      )}

      {/* ── TC6 ───────────────────────────────────────────────────────── */}
      {ativo('tc6') && (
        <Section icon={Footprints} title="Teste de Caminhada de 6 min (TC6)">
          <div className="grid-3" style={{ marginBottom:4 }}>
            <Field label="Nº de voltas"><input className="inp" type="number" value={ev.tc6.nVoltas} onChange={e=>set('tc6.nVoltas',e.target.value)}/></Field>
            <Field label="Distância da volta (m)"><input className="inp" type="number" value={ev.tc6.distVolta} onChange={e=>set('tc6.distVolta',e.target.value)}/></Field>
            <Field label="Distância calculada (m)" hint="voltas × distância da volta">
              <input className="inp" readOnly
                value={(num(ev.tc6.nVoltas) && num(ev.tc6.distVolta)) ? r1(num(ev.tc6.nVoltas) * num(ev.tc6.distVolta)) : ''}
                style={{ background:'var(--bg)' }} />
            </Field>
          </div>
          {(num(ev.tc6.nVoltas) && num(ev.tc6.distVolta)) && (
            <div className="flex gap-10" style={{ marginBottom:10 }}>
              <button className="btn-soft" onClick={() => set('tc6.distancia', String(r1(num(ev.tc6.nVoltas) * num(ev.tc6.distVolta))))}>
                <Check size={13} /> Usar {r1(num(ev.tc6.nVoltas) * num(ev.tc6.distVolta))} m como distância percorrida
              </button>
            </div>
          )}
          <div className="grid-3">
            <Field label="Distância percorrida (m)"><input className="inp" type="number" value={ev.tc6.distancia} onChange={e=>set('tc6.distancia',e.target.value)}/></Field>
            <Field label="Predito (m)" hint={`auto ${pTC6??''} m`}>
              <input className="inp" type="number" placeholder={pTC6??''} value={ev.tc6.preditoDist} onChange={e=>set('tc6.preditoDist',e.target.value)}/>
            </Field>
            <Field label="BORG final"><input className="inp" type="number" value={ev.tc6.borgFim} onChange={e=>set('tc6.borgFim',e.target.value)}/></Field>
            <Field label="FC inicial (bpm)"><input className="inp" type="number" value={ev.tc6.fcIni} onChange={e=>set('tc6.fcIni',e.target.value)}/></Field>
            <Field label="FC final (bpm)"><input className="inp" type="number" value={ev.tc6.fcFim} onChange={e=>set('tc6.fcFim',e.target.value)}/></Field>
            <Field label="FC máx (bpm)"><input className="inp" type="number" value={ev.tc6.fcMax} onChange={e=>set('tc6.fcMax',e.target.value)}/></Field>
            <Field label="FC rec. 1 min"><input className="inp" type="number" value={ev.tc6.fcRec1} onChange={e=>set('tc6.fcRec1',e.target.value)}/></Field>
            <Field label="FC rec. 3 min"><input className="inp" type="number" value={ev.tc6.fcRec3} onChange={e=>set('tc6.fcRec3',e.target.value)}/></Field>
            <Field label="SpO₂ inicial (%)"><input className="inp" type="number" value={ev.tc6.spo2Ini} onChange={e=>set('tc6.spo2Ini',e.target.value)}/></Field>
            <Field label="SpO₂ final (%)"><input className="inp" type="number" value={ev.tc6.spo2Fim} onChange={e=>set('tc6.spo2Fim',e.target.value)}/></Field>
            <Field label="PAS inicial"><input className="inp" type="number" value={ev.tc6.pasIni} onChange={e=>set('tc6.pasIni',e.target.value)}/></Field>
            <Field label="PAS final"><input className="inp" type="number" value={ev.tc6.pasFim} onChange={e=>set('tc6.pasFim',e.target.value)}/></Field>
            <Field label="Nº de paradas"><input className="inp" type="number" value={ev.tc6.nParadas} onChange={e=>set('tc6.nParadas',e.target.value)}/></Field>
          </div>

          <SixMinuteTest />
          <ImportarPolarFC onAplicar={(preview) => aplicarImportacaoPolar('tc6', preview)} />

          <div className="lbl" style={{ margin:'16px 0 8px' }}>Série por minuto</div>
          <div style={{ overflowX:'auto' }}>
            <table className="tbl-mini">
              <thead><tr><th></th>{SERIE_TC6.map(t=><th key={t}>{t}</th>)}</tr></thead>
              <tbody>
                {[['fc','FC'],['spo2','SpO₂'],['pas','PAS'],['pad','PAD'],['borg','BORG'],['pse','PSE']].map(([k,lbl])=>(
                  <tr key={k}>
                    <td style={{ fontWeight:600, color:'var(--navy-soft)', fontSize:12, paddingRight:6 }}>{lbl}</td>
                    {ev.tc6.serie.map((s,i)=>(
                      <td key={i}><input className="cell-mini" value={s[k]??''} onChange={e=>setSerie('tc6',i,k,e.target.value)}/></td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-12">
            <Field label="Observações"><textarea className="inp" rows={2} value={ev.tc6.obs} onChange={e=>set('tc6.obs',e.target.value)}/></Field>
          </div>
          <div className="mt-12">
            <div className="lbl" style={{ marginBottom:8 }}>Imagens</div>
            <ImageUpload images={ev.tc6.imagens??[]} onChange={imgs=>set('tc6.imagens',imgs)}/>
          </div>
          <Ref>Iwama et al. J Bras Pneumol. 2009;35(2):144-50 | ACSM 2018 | Dourado et al. 2021</Ref>
        </Section>
      )}

      {/* ── ESPIROMETRIA ──────────────────────────────────────────────── */}
      {ativo('espiro') && (
        <Section icon={Wind} title="Espirometria Forçada">
          <div className="grid-2" style={{ marginBottom:12 }}>
            <Field label="Equipamento"><input className="inp" value={ev.espiro.equipamento} placeholder="Ex: Espirômetro SP10 CONTEC" onChange={e=>set('espiro.equipamento',e.target.value)}/></Field>
            <Field label="Referência de predição">
              <select className="inp" value={ev.espiro.referencia} onChange={e=>set('espiro.referencia',e.target.value)}>
                <option>Pereira (2007)</option>
                <option>ATS/ERS (2005)</option>
                <option>GLI (2012)</option>
              </select>
            </Field>
          </div>

          <h3 style={{ marginBottom:10 }}>Valores pré-broncodilatador</h3>
          <div className="grid-3" style={{ marginBottom:14 }}>
            {[
              ['CVF obtido (L)','espiro.preBD.cvf'],
              ['CVF predito (L)','espiro.preBD.cvfPred',pCVF],
              ['CVF % predito','auto'],
              ['VEF1 obtido (L)','espiro.preBD.vef1'],
              ['VEF1 predito (L)','espiro.preBD.vef1Pred',pVEF1],
              ['VEF1 % predito','auto2'],
              ['VEF1/CVF obtido (%)','espiro.preBD.rel'],
              ['VEF1/CVF predito (%)','espiro.preBD.relPred'],
            ].map(([lbl,path,auto])=>{
              if (path === 'auto') {
                const o = num(ev.espiro.preBD.cvf), p = num(ev.espiro.preBD.cvfPred)??pCVF
                const pct = o&&p ? Math.round(o/p*100) : null
                return <div key={lbl}><Field label={lbl}><input className="inp" readOnly value={pct??''} style={{background:'var(--bg)'}}/></Field></div>
              }
              if (path === 'auto2') {
                const o = num(ev.espiro.preBD.vef1), p = num(ev.espiro.preBD.vef1Pred)??pVEF1
                const pct = o&&p ? Math.round(o/p*100) : null
                return <div key={lbl}><Field label={lbl}><input className="inp" readOnly value={pct??''} style={{background:'var(--bg)'}}/></Field></div>
              }
              return (
                <Field key={lbl} label={lbl}>
                  <input className="inp" type="number" placeholder={auto??''} value={path.split('.').reduce((o,k)=>o?.[k],ev)??''} onChange={e=>set(path,e.target.value)}/>
                </Field>
              )
            })}
          </div>

          <label className="flex-center gap-8 mt-8" style={{ cursor:'pointer', marginBottom:12, fontSize:13.5 }}>
            <input type="checkbox" checked={ev.espiro.temPosBD} onChange={e=>set('espiro.temPosBD',e.target.checked)} style={{ width:15, height:15, accentColor:'var(--teal)' }}/>
            Registrar valores pós-broncodilatador
          </label>

          {ev.espiro.temPosBD && (
            <div className="grid-3" style={{ marginBottom:14 }}>
              <Field label="CVF pós-BD (L)"><input className="inp" type="number" value={ev.espiro.posBD.cvf} onChange={e=>set('espiro.posBD.cvf',e.target.value)}/></Field>
              <Field label="VEF1 pós-BD (L)"><input className="inp" type="number" value={ev.espiro.posBD.vef1} onChange={e=>set('espiro.posBD.vef1',e.target.value)}/></Field>
              <Field label="VEF1/CVF pós-BD (%)"><input className="inp" type="number" value={ev.espiro.posBD.rel} onChange={e=>set('espiro.posBD.rel',e.target.value)}/></Field>
            </div>
          )}

          <div className="grid-2" style={{ marginBottom:12 }}>
            <Field label="Classificação / Achados">
              <select className="inp" value={ev.espiro.classificacao} onChange={e=>set('espiro.classificacao',e.target.value)}>
                <option value="">Selecione</option>
                <option>Espirometria normal</option>
                <option>Distúrbio ventilatório obstrutivo leve</option>
                <option>Distúrbio ventilatório obstrutivo moderado</option>
                <option>Distúrbio ventilatório obstrutivo grave</option>
                <option>Distúrbio ventilatório restritivo</option>
                <option>Distúrbio ventilatório misto</option>
              </select>
            </Field>
          </div>
          <Field label="Observações adicionais">
            <textarea className="inp" rows={2} value={ev.espiro.achados} onChange={e=>set('espiro.achados',e.target.value)}/>
          </Field>
          <div className="mt-12">
            <div className="lbl" style={{ marginBottom:8 }}>Curvas (F-V, V-T) — imagens do espirômetro</div>
            <ImageUpload images={ev.espiro.imagens??[]} onChange={imgs=>set('espiro.imagens',imgs)}/>
          </div>
          <Ref>Pereira CAC et al. J Bras Pneumol. 2007;33(4):397-406 | ATS/ERS Task Force, 2005</Ref>
        </Section>
      )}

      {/* ── FUNÇÃO RESPIRATÓRIA ───────────────────────────────────────── */}
      {(ativo('pimax') || ativo('sindex')) && (
        <Section icon={Wind} title="Função Muscular Respiratória">
          {ativo('pimax') && (
            <>
              <h3 style={{ marginBottom:10 }}>Pressão Inspiratória Máxima (PImáx)</h3>
              <PredField label="Obtido (cmH₂O)" obtido={ev.pimax.obtido} predito={ev.pimax.predito} auto={pPim}
                onObt={v=>set('pimax.obtido',v)} onPred={v=>set('pimax.predito',v)}/>
              <h3 style={{ margin:'16px 0 10px' }}>Pressão Expiratória Máxima (PEmáx)</h3>
              <PredField label="Obtido (cmH₂O)" obtido={ev.pemax.obtido} predito={ev.pemax.predito} auto={pPem}
                onObt={v=>set('pemax.obtido',v)} onPred={v=>set('pemax.predito',v)}/>
              <Ref>Neder JA et al. Braz J Med Biol Res. 1999;32(6):729-37</Ref>
            </>
          )}
          {ativo('sindex') && (
            <>
              <h3 style={{ margin:'16px 0 10px' }}>S-Index (Força Muscular Inspiratória Dinâmica)</h3>
              <PredField label="Obtido (cmH₂O)" obtido={ev.sindex.obtido} predito={ev.sindex.predito} auto={pSind}
                onObt={v=>set('sindex.obtido',v)} onPred={v=>set('sindex.predito',v)}/>
              <Field label="Observações (potência diafragmática, padrão de curva)">
                <textarea className="inp mt-8" rows={2} value={ev.sindex.obs} onChange={e=>set('sindex.obs',e.target.value)}/>
              </Field>
              <Ref>Meldrum SJ et al. Physiol Meas. 2007 | Powerbreathe BreatheLink</Ref>
            </>
          )}
        </Section>
      )}

      {/* ── FUNÇÃO MUSCULAR PERIFÉRICA ────────────────────────────────── */}
      {(ativo('grip') || ativo('dinamo') || ativo('sts5') || ativo('sts1')) && (
        <Section icon={Hand} title="Função Muscular Periférica">
          {ativo('grip') && (
            <>
              <h3 style={{ marginBottom:10 }}>Preensão Palmar (mão dominante)</h3>
              <PredField label="Obtido (kgf)" obtido={ev.grip.obtido} predito={ev.grip.predito} auto={pGrip}
                onObt={v=>set('grip.obtido',v)} onPred={v=>set('grip.predito',v)}/>
              <Ref>34,996 − (0,382 × idade) + (0,174 × peso) + (13,628 × sexo) | (mas=1; fem=0)</Ref>
            </>
          )}

          {ativo('dinamo') && (
            <>
              <h3 style={{ margin:'16px 0 10px' }}>Dinamometria Bilateral — Quadríceps e Bíceps</h3>
              <div className="grid-2" style={{ marginBottom:10 }}>
                <Field label={`Quadríceps D (kgf) — predito ${pQuad??'—'}`}>
                  <input className="inp" type="number" value={ev.dinamo.quadD} onChange={e=>set('dinamo.quadD',e.target.value)}/>
                </Field>
                <Field label="Quadríceps E (kgf)">
                  <input className="inp" type="number" value={ev.dinamo.quadE} onChange={e=>set('dinamo.quadE',e.target.value)}/>
                </Field>
                <Field label={`Bíceps D (kgf) — predito ${pBic??'—'}`}>
                  <input className="inp" type="number" value={ev.dinamo.bicD} onChange={e=>set('dinamo.bicD',e.target.value)}/>
                </Field>
                <Field label="Bíceps E (kgf)">
                  <input className="inp" type="number" value={ev.dinamo.bicE} onChange={e=>set('dinamo.bicE',e.target.value)}/>
                </Field>
              </div>
              {/* Assimetria calculada */}
              {(ev.dinamo.quadD && ev.dinamo.quadE) && (
                <div style={{ padding:'8px 12px', background:'var(--teal-light)', borderRadius:8, fontSize:13, marginBottom:8 }}>
                  Assimetria quadríceps: <b>{Math.round(Math.abs(num(ev.dinamo.quadD)-num(ev.dinamo.quadE))/Math.max(num(ev.dinamo.quadD),num(ev.dinamo.quadE))*100)}%</b>
                  {(ev.dinamo.bicD && ev.dinamo.bicE) && <> | Bíceps: <b>{Math.round(Math.abs(num(ev.dinamo.bicD)-num(ev.dinamo.bicE))/Math.max(num(ev.dinamo.bicD),num(ev.dinamo.bicE))*100)}%</b></>}
                </div>
              )}
              <Ref>Meldrum SJ et al. Physiol Meas. 2007 — Quadríceps predito {pQuad} kgf · Bíceps predito {pBic} kgf</Ref>
            </>
          )}

          {ativo('sts5') && (
            <>
              <h3 style={{ margin:'16px 0 10px' }}>TSL 5 repetições</h3>
              <Stopwatch onUseValue={(v) => set('sts5.tempo', String(v))} />
              <Field label="Tempo (s)" hint={`predito: < ${pSts5??'—'} s`}>
                <input className="inp" type="number" value={ev.sts5.tempo} onChange={e=>set('sts5.tempo',e.target.value)}/>
              </Field>
            </>
          )}
          {ativo('sts1') && (
            <>
              <h3 style={{ margin:'16px 0 10px' }}>TSL 1 min</h3>
              <RepCounterTimer onUseValue={(v) => set('sts1.reps', String(v))} />
              <Field label="Repetições" hint={`predito: ${pSts1??'—'} rep`}>
                <input className="inp" type="number" value={ev.sts1.reps} onChange={e=>set('sts1.reps',e.target.value)}/>
              </Field>
            </>
          )}
        </Section>
      )}

      {/* ── SPPB ──────────────────────────────────────────────────────── */}
      {ativo('sppb') && (
        <Section icon={ClipboardList} title="SPPB — Short Physical Performance Battery">
          <div className="grid-2">
            <Field label="Velocidade marcha 4m (s)">
              <input className="inp" type="number" step="0.1" value={ev.sppb.velMarcha4m} onChange={e=>set('sppb.velMarcha4m',e.target.value)}/>
            </Field>
            <Field label="Ponto — Velocidade de marcha (0–4)">
              <select className="inp" value={ev.sppb.pontoVel} onChange={e=>set('sppb.pontoVel',e.target.value)}>
                <option value="">Selecione</option>
                <option value="0">0 — Incapaz de realizar</option>
                <option value="1">1 — ≥ 8,70 s</option>
                <option value="2">2 — 6,21 a 8,69 s</option>
                <option value="3">3 — 4,82 a 6,20 s</option>
                <option value="4">4 — ≤ 4,81 s</option>
              </select>
            </Field>

            <Field label="Equilíbrio pés juntos (s)">
              <input className="inp" type="number" step="0.1" value={ev.sppb.peJuntos} onChange={e=>set('sppb.peJuntos',e.target.value)}/>
            </Field>
            <Field label="Equilíbrio um pé à frente (semi-tandem) (s)">
              <input className="inp" type="number" step="0.1" value={ev.sppb.umPeFrente} onChange={e=>set('sppb.umPeFrente',e.target.value)}/>
            </Field>
            <Field label="Equilíbrio hálux + calcanhar (tandem) (s)">
              <input className="inp" type="number" step="0.1" value={ev.sppb.haluxCalcanhar} onChange={e=>set('sppb.haluxCalcanhar',e.target.value)}/>
            </Field>
            <Field label="Ponto — Equilíbrio (0–4)" hint="pés juntos 10s=1pt; semi-tandem 10s + tandem <3s=2pt; tandem 3-9,99s=3pt; tandem ≥10s=4pt">
              <select className="inp" value={ev.sppb.pontoEquilibrio ?? ''} onChange={e=>set('sppb.pontoEquilibrio',e.target.value)}>
                <option value="">Selecione</option>
                <option value="0">0 — Incapaz / não tentou</option>
                <option value="1">1 — Pés juntos 10s, sem tandem</option>
                <option value="2">2 — Semi-tandem 10s, tandem &lt;3s</option>
                <option value="3">3 — Tandem 3 a 9,99s</option>
                <option value="4">4 — Tandem ≥ 10s</option>
              </select>
            </Field>

            <Field label="Ponto — TSL 5 repetições (0–4)" hint="usa o tempo do teste TSL 5 rep já registrado">
              <select className="inp" value={ev.sppb.tsl5ponto} onChange={e=>set('sppb.tsl5ponto',e.target.value)}>
                <option value="">Selecione</option>
                <option value="0">0 — Incapaz de realizar / &gt;60s ou &gt;5 tentativas</option>
                <option value="1">1 — ≥ 16,7 s</option>
                <option value="2">2 — 13,7 a 16,69 s</option>
                <option value="3">3 — 11,2 a 13,69 s</option>
                <option value="4">4 — ≤ 11,19 s</option>
              </select>
            </Field>
          </div>

          {/* Soma automática dos pontos */}
          {(() => {
            const { total, class: classe } = sppbTotal({
              vel: ev.sppb.pontoVel,
              equilibrio: ev.sppb.pontoEquilibrio,
              tsl5: ev.sppb.tsl5ponto,
            })
            const temAlgumPonto = [ev.sppb.pontoVel, ev.sppb.pontoEquilibrio, ev.sppb.tsl5ponto].some(v => v !== '' && v != null)
            return temAlgumPonto ? (
              <div className="flex-center gap-10" style={{ marginTop:14, padding:'10px 14px', background:'var(--teal-light)', borderRadius:10 }}>
                <span style={{ fontWeight:700, color:'var(--navy)' }}>Pontuação total SPPB: {total} / 12</span>
                <span className={`tag tag-${total >= 10 ? 'good' : total >= 7 ? 'warn' : 'bad'}`}>{classe}</span>
              </div>
            ) : null
          })()}

          <Ref>Guralnik JM et al. J Gerontol. 1994;49(2):M85-94 — protocolo SPPB (0–4 pontos por subteste, total 0–12)</Ref>
        </Section>
      )}

      {/* ── CBDF — Classificação Brasileira de Diagnósticos Fisioterapêuticos ── */}
      {(() => {
        const calc = calcEv(ev, paciente)
        const manual = ev.cbdf ?? {}
        const blocos = montarCBDF(ev, calc, paciente, manual)
        const blocosAtivos = manual.blocosAtivos ?? []
        const setManual = (campo, valor) => set(`cbdf.${campo}`, valor)
        const toggleBloco = (key) => {
          const atual = blocosAtivos.includes(key)
          setManual('blocosAtivos', atual ? blocosAtivos.filter((b) => b !== key) : [...blocosAtivos, key])
        }

        return (
          <Section icon={ClipboardList} title="Classificação Brasileira de Diagnósticos Fisioterapêuticos (CBDF)">
            <p className="text-sub" style={{ marginBottom: 12, fontSize: 12.5 }}>
              Os códigos abaixo são montados automaticamente a partir dos testes já registrados
              nesta avaliação. Marque os blocos que devem entrar no relatório, confirme o status
              clínico e complete os campos sem fonte automática. Consulte a tabela completa em{' '}
              <a href={CBDF_LINK} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--teal-dark)' }}>
                {CBDF_LINK}
              </a>{' '}
              em caso de dúvida — você pode ajustar qualquer dígito antes de salvar.
            </p>

            <BlocoCBDF
              bloco={blocos.d03}
              ativo={blocosAtivos.includes('d03')}
              onToggle={() => toggleBloco('d03')}
              statusOptions={OPCOES_D03_STATUS}
              onManualChange={(v) => setManual('d03Status', v)}
              extraFields={
                <div className="grid-2" style={{ marginTop: 10, gap: 8 }}>
                  <Field label="Dor (0–4)">
                    <select className="inp" value={manual.d03Dor ?? ''} onChange={(e) => setManual('d03Dor', e.target.value === '' ? null : Number(e.target.value))}>
                      <option value="">Sem dado</option>
                      {OPCOES_DIGITO_0A4.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                  </Field>
                  <Field label="Mobilidade articular (0–4)">
                    <select className="inp" value={manual.d03MobArt ?? ''} onChange={(e) => setManual('d03MobArt', e.target.value === '' ? null : Number(e.target.value))}>
                      <option value="">Sem dado</option>
                      {OPCOES_DIGITO_0A4.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                  </Field>
                  <Field label="Segmento acometido">
                    <select className="inp" value={manual.d03Segmento ?? '9'} onChange={(e) => setManual('d03Segmento', e.target.value)}>
                      {OPCOES_SEGMENTO_D03.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                  </Field>
                </div>
              }
            />

            <BlocoCBDF
              bloco={blocos.d04}
              ativo={blocosAtivos.includes('d04')}
              onToggle={() => toggleBloco('d04')}
            />

            <BlocoCBDF
              bloco={blocos.d05}
              ativo={blocosAtivos.includes('d05')}
              onToggle={() => toggleBloco('d05')}
              statusOptions={OPCOES_D05_STATUS}
              onManualChange={(v) => setManual('d05Status', v)}
              extraFields={
                <div style={{ marginTop: 10 }}>
                  <Field label="Função dos vasos (0 ou 4)">
                    <select className="inp" value={manual.d05Vasos ?? ''} onChange={(e) => setManual('d05Vasos', e.target.value === '' ? null : Number(e.target.value))}>
                      <option value="">Sem dado</option>
                      {OPCOES_DIGITO_BIN.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                  </Field>
                </div>
              }
            />

            <BlocoCBDF
              bloco={blocos.m04}
              ativo={blocosAtivos.includes('m04')}
              onToggle={() => toggleBloco('m04')}
              statusOptions={OPCOES_M04_STATUS}
              onManualChange={(v) => setManual('m04Status', v)}
              extraFields={
                <div style={{ marginTop: 10 }}>
                  <Field label="Subir/descer escadas e/ou rampas (0 ou 4)">
                    <select className="inp" value={manual.m04Escadas ?? ''} onChange={(e) => setManual('m04Escadas', e.target.value === '' ? null : Number(e.target.value))}>
                      <option value="">Sem dado</option>
                      {OPCOES_DIGITO_BIN.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                  </Field>
                </div>
              }
            />

            <Ref>
              COFFITO, Resolução nº 555/2022 (Anexo I — CBDF). Os dígitos com origem em teste são
              calculados automaticamente; status clínico, dor, mobilidade articular, segmento
              corporal, função dos vasos e escadas não têm fonte automática e devem ser
              confirmados manualmente.
            </Ref>
          </Section>
        )
      })()}

      {/* ── CONCLUSÃO ─────────────────────────────────────────────────── */}
      <Section icon={FileText} title="Conclusão e Profissional">
        <Field label="Conclusão (texto livre — ou use IA no relatório)">
          <textarea className="inp" rows={5} placeholder="Síntese clínica e recomendações…" value={ev.conclusao} onChange={e=>set('conclusao',e.target.value)}/>
        </Field>
        <div className="mt-12">
          <Field label="Profissional responsável">
            <input className="inp" value={ev.profissional} onChange={e=>set('profissional',e.target.value)}/>
          </Field>
        </div>
      </Section>

      <div className="flex gap-10">
        <button className="btn-primary" onClick={handleSave} disabled={saving}>
          {saving ? <span className="spinner"/> : <FileText size={16}/>} Salvar e ver relatório
        </button>
        <button className="btn-ghost" onClick={() => nav(`/paciente/${pid}`)}>Cancelar</button>
      </div>
    </>
  )
}
